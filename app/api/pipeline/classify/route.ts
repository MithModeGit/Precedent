import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { parseDocument } from '@/lib/document-parsing'
import { generateStructured, PipelineError } from '@/lib/pipeline'
import { getSupabaseServer } from '@/lib/supabase'
import { ClassifyOutputSchema } from '@/schemas/classify'
import { CLASSIFY_SYSTEM_PROMPT } from '@/prompts/classify'

export const runtime = 'nodejs'
export const maxDuration = 120

/** Server-side upload ceiling: guards function memory/time and cost against a client
 * pointing the session at an oversized object. Mirrors the client-side limit. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

// The client uploads the original directly to Supabase Storage (browser -> Storage),
// then calls this route with the storage location. This avoids the serverless request
// body limit (~4.5MB on Vercel), so there is no upload size cap on the document itself.
const ClassifyRequestSchema = z.object({
  sessionId: z.string().uuid(),
  fileName: z.string().min(1),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: z.infer<typeof ClassifyRequestSchema>
  try {
    body = ClassifyRequestSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const lower = body.fileName.toLowerCase()
  if (!lower.endsWith('.docx') && !lower.endsWith('.pdf')) {
    return NextResponse.json(
      { error: 'This file type is not supported. Upload a DOCX or PDF file.' },
      { status: 400 },
    )
  }
  const extension = lower.endsWith('.pdf') ? 'pdf' : 'docx'
  const objectName = `original.${extension}`
  const supabase = getSupabaseServer()

  // Check the object's size via metadata BEFORE downloading, so an oversized object is
  // never pulled into the function's memory.
  const { data: files, error: listError } = await supabase.storage
    .from('uploads')
    .list(body.sessionId)
  if (listError) console.error(`Failed to list storage objects: ${listError.message}`)
  const fileInfo = files?.find((f) => f.name === objectName)
  if (!fileInfo) {
    return NextResponse.json(
      { error: 'The uploaded file could not be read. Please try uploading again.' },
      { status: 422 },
    )
  }
  const declaredSize = (fileInfo.metadata as { size?: number } | null)?.size
  if (declaredSize !== undefined && declaredSize > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: 'This file is larger than 10MB. Upload a smaller DOCX or PDF.' },
      { status: 413 },
    )
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from('uploads')
    .download(`${body.sessionId}/${objectName}`)
  if (downloadError || !blob) {
    return NextResponse.json(
      { error: 'The uploaded file could not be read. Please try uploading again.' },
      { status: 422 },
    )
  }
  // Backstop in case metadata size was unavailable.
  if (blob.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: 'This file is larger than 10MB. Upload a smaller DOCX or PDF.' },
      { status: 413 },
    )
  }
  const buffer = Buffer.from(await blob.arrayBuffer())

  // Verify the bytes actually match the claimed type before handing to a parser: a DOCX
  // is a ZIP (magic "PK\x03\x04"), a PDF starts with "%PDF". This rejects a renamed or
  // malformed file rather than feeding it to mammoth/pdf-parse.
  const isPdfMagic = buffer.length >= 4 && buffer.toString('latin1', 0, 4) === '%PDF'
  const isZipMagic =
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  if ((extension === 'pdf' && !isPdfMagic) || (extension === 'docx' && !isZipMagic)) {
    return NextResponse.json(
      { error: 'This file does not appear to be a valid DOCX or PDF. Upload the original document.' },
      { status: 422 },
    )
  }

  let parsed
  try {
    parsed = await parseDocument(body.fileName, buffer)
  } catch {
    return NextResponse.json(
      {
        error:
          'This file could not be read. Try uploading a DOCX file, or confirm the PDF contains selectable text.',
      },
      { status: 422 },
    )
  }

  if (parsed.text.trim().length === 0) {
    return NextResponse.json(
      {
        error:
          'No text could be extracted from this file. If it is a scanned PDF, upload a DOCX or a text-based PDF.',
      },
      { status: 422 },
    )
  }

  try {
    const classification = await generateStructured({
      schema: ClassifyOutputSchema,
      system: CLASSIFY_SYSTEM_PROMPT,
      prompt: parsed.text,
      pass: 1,
    })

    return NextResponse.json({
      sessionId: body.sessionId,
      fileName: body.fileName,
      pageCount: parsed.pageCount,
      likelyScanned: parsed.likelyScanned,
      classification,
    })
  } catch (error) {
    const pass = error instanceof PipelineError ? error.pass : 1
    return NextResponse.json({ error: 'Pipeline pass failed', pass }, { status: 500 })
  }
}

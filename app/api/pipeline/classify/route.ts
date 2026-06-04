import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { parseDocument } from '@/lib/document-parsing'
import { generateStructured, PipelineError } from '@/lib/pipeline'
import { getSupabaseServer } from '@/lib/supabase'
import { ClassifyOutputSchema } from '@/schemas/classify'
import { CLASSIFY_SYSTEM_PROMPT } from '@/prompts/classify'

export const runtime = 'nodejs'
export const maxDuration = 120

const DOCX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Stores the uploaded original so the export route can retrieve it later. Non-fatal. */
async function storeOriginal(
  sessionId: string,
  fileName: string,
  buffer: Buffer,
): Promise<void> {
  const extension = fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx'
  const contentType = extension === 'pdf' ? 'application/pdf' : DOCX_CONTENT_TYPE
  try {
    const { error } = await getSupabaseServer()
      .storage.from('uploads')
      .upload(`${sessionId}/original.${extension}`, buffer, { contentType, upsert: true })
    if (error) console.warn(`Original upload failed: ${error.message}`)
  } catch (error) {
    console.warn(`Original upload threw: ${error instanceof Error ? error.message : 'unknown'}`)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data with a file.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file was provided.' }, { status: 400 })
  }

  const fileName = file.name
  const lower = fileName.toLowerCase()
  if (!lower.endsWith('.docx') && !lower.endsWith('.pdf')) {
    return NextResponse.json(
      { error: 'This file type is not supported. Upload a DOCX or PDF file.' },
      { status: 400 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let parsed
  try {
    parsed = await parseDocument(fileName, buffer)
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

  const sessionId = randomUUID()
  // Storing the original and the Pass 1 call are independent: run them in parallel and
  // await the upload before returning so the serverless function does not exit early.
  const uploadPromise = storeOriginal(sessionId, fileName, buffer)

  try {
    const classification = await generateStructured({
      schema: ClassifyOutputSchema,
      system: CLASSIFY_SYSTEM_PROMPT,
      prompt: parsed.text,
      pass: 1,
    })

    await uploadPromise

    return NextResponse.json({
      sessionId,
      fileName,
      pageCount: parsed.pageCount,
      likelyScanned: parsed.likelyScanned,
      classification,
    })
  } catch (error) {
    const pass = error instanceof PipelineError ? error.pass : 1
    return NextResponse.json({ error: 'Pipeline pass failed', pass }, { status: 500 })
  }
}

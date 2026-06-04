import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase'
import { clauseTypeLabel } from '@/lib/clause-labels'
import { generateRedlinedDocx, type DocxRedline } from '@/lib/docx-export'
import { generateFreshRedlinedDocx, type GeneratedRedline } from '@/lib/docx-generate'

export const runtime = 'nodejs'
export const maxDuration = 120

const DOCX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const ExportRequestSchema = z.object({ sessionId: z.string().uuid() })

export async function POST(request: NextRequest): Promise<NextResponse | Response> {
  let sessionId: string
  try {
    sessionId = ExportRequestSchema.parse(await request.json()).sessionId
  } catch {
    return NextResponse.json({ error: 'A valid sessionId is required.' }, { status: 400 })
  }

  const supabase = getSupabaseServer()

  const { data: session } = await supabase
    .from('sessions')
    .select('document_name')
    .eq('id', sessionId)
    .single()
  if (!session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  }

  // Only accepted and modified redlines become tracked changes; rejected/skipped revert.
  const { data: reviews } = await supabase
    .from('clause_reviews')
    .select('clause_type, section_number, original_text, accepted_text, rationale')
    .eq('session_id', sessionId)
    .in('decision', ['accepted', 'modified'])
    .not('accepted_text', 'is', null)
    .order('display_order', { ascending: true })

  const accepted = (reviews ?? []).filter((r) => r.accepted_text !== null)

  // Prefer in-place tracked changes on the original DOCX; fall back to a generated docx.
  const { data: originalDocx } = await supabase.storage
    .from('uploads')
    .download(`${sessionId}/original.docx`)

  let buffer: Buffer
  try {
    if (originalDocx) {
      const originalBuffer = Buffer.from(await originalDocx.arrayBuffer())
      const redlines: DocxRedline[] = accepted.map((r) => ({
        originalText: r.original_text,
        acceptedText: r.accepted_text as string,
        rationale: r.rationale,
      }))
      buffer = await generateRedlinedDocx(originalBuffer, redlines)
    } else {
      const redlines: GeneratedRedline[] = accepted.map((r) => ({
        clauseLabel: clauseTypeLabel(r.clause_type),
        sectionNumber: r.section_number,
        originalText: r.original_text,
        acceptedText: r.accepted_text as string,
        rationale: r.rationale,
      }))
      buffer = await generateFreshRedlinedDocx(session.document_name, redlines)
    }
  } catch (error) {
    console.error(`Export generation failed: ${error instanceof Error ? error.message : 'unknown'}`)
    return NextResponse.json({ error: 'The document could not be generated.' }, { status: 500 })
  }

  await supabase
    .from('sessions')
    .update({ status: 'exported', export_generated_at: new Date().toISOString() })
    .eq('id', sessionId)

  // Sanitize the filename for the Content-Disposition header: document_name is
  // user-supplied, so strip anything outside a safe set to prevent header injection
  // (CR/LF) or a broken quoted-string (embedded quotes).
  const safeBase =
    (session.document_name ?? '')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9 ._-]/g, '')
      .trim()
      .slice(0, 100) || 'document'
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': DOCX_CONTENT_TYPE,
      'Content-Disposition': `attachment; filename="${safeBase}-redlined.docx"`,
    },
  })
}

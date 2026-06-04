import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'
import { clauseTypeLabel } from '@/lib/clause-labels'
import { generateRedlinedDocx, type DocxRedline } from '@/lib/docx-export'
import { generateFreshRedlinedDocx, type GeneratedRedline } from '@/lib/docx-generate'

export const runtime = 'nodejs'
export const maxDuration = 120

const DOCX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function POST(request: NextRequest): Promise<NextResponse | Response> {
  let sessionId: string
  try {
    const body = (await request.json()) as { sessionId?: string }
    if (!body.sessionId) throw new Error('missing')
    sessionId = body.sessionId
  } catch {
    return NextResponse.json({ error: 'A sessionId is required.' }, { status: 400 })
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

  const baseName = session.document_name.replace(/\.[^.]+$/, '')
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': DOCX_CONTENT_TYPE,
      'Content-Disposition': `attachment; filename="${baseName}-redlined.docx"`,
    },
  })
}

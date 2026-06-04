import { NextRequest, NextResponse } from 'next/server'
import { generateStructured } from '@/lib/pipeline'
import { getSupabaseServer } from '@/lib/supabase'
import { IMPROVE_SYSTEM_PROMPT } from '@/prompts/improve'
import { ImproveOutputSchema } from '@/schemas/improve'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * Pass 4: generate trend insights from recent session history. Non-critical: any
 * failure is logged and swallowed so the review session is never blocked.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!sessionId || !UUID_RE.test(sessionId)) return NextResponse.json({ ok: false })

  try {
    const supabase = getSupabaseServer()

    const { data: session } = await supabase
      .from('sessions')
      .select('document_type, mode, device_id')
      .eq('id', sessionId)
      .single()
    if (!session) return NextResponse.json({ ok: false })

    // This session's eval plus the trailing 10 sessions of the same type and mode, scoped
    // to this device so another user's document names are never sent to the model.
    const { data: history } = await supabase
      .from('sessions')
      .select('id, document_name, created_at, eval_runs(*)')
      .eq('device_id', session.device_id)
      .eq('document_type', session.document_type)
      .eq('mode', session.mode)
      .order('created_at', { ascending: false })
      .limit(10)

    const output = await generateStructured({
      schema: ImproveOutputSchema,
      system: IMPROVE_SYSTEM_PROMPT,
      prompt: `Current session id: ${sessionId}\n\nRecent session history (most recent first):\n${JSON.stringify(history ?? [], null, 2)}`,
      pass: 4,
    })

    const { error: updateError } = await supabase
      .from('eval_runs')
      .update({ improvement_notes: output.notes })
      .eq('session_id', sessionId)
    if (updateError) throw new Error(`Failed to update improvement notes: ${updateError.message}`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(`Pass 4 improve failed (non-critical): ${error instanceof Error ? error.message : 'unknown'}`)
    return NextResponse.json({ ok: false })
  }
}

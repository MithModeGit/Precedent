import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase'

export const runtime = 'nodejs'

const PatchSchema = z.object({
  decision: z.enum(['accepted', 'modified', 'rejected', 'skipped']),
  // Final text for accepted (equals proposed) or modified (lawyer-edited). Null otherwise.
  acceptedText: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params

  let body: z.infer<typeof PatchSchema>
  try {
    body = PatchSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const acceptedText =
    body.decision === 'accepted' || body.decision === 'modified'
      ? (body.acceptedText ?? null)
      : null

  const { error } = await getSupabaseServer()
    .from('clause_reviews')
    .update({
      decision: body.decision,
      accepted_text: acceptedText,
      decided_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Could not save the decision.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

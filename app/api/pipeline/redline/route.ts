import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateStructured, PipelineError } from '@/lib/pipeline'
import { getSupabaseServer } from '@/lib/supabase'
import { getReferenceDatabase } from '@/lib/reference-database'
import { buildRedlineSystemPrompt } from '@/prompts/redline'
import { ClauseTypeEnum } from '@/schemas/classify'
import { RedlineOutputSchema } from '@/schemas/redline'
import type { Priority, ReviewMode } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 180

/** Maximum document reviews per device (anonymous abuse guard, per DATA_MODEL.md). */
const REVIEW_LIMIT_PER_DEVICE = 5

/**
 * Priority tiers included by each review mode (PRD §5.1). Enforced server-side as a
 * guarantee: the model is instructed to self-limit but does not always comply.
 */
const TIERS_BY_MODE: Record<ReviewMode, readonly Priority[]> = {
  conservative: ['must'],
  standard: ['must', 'should'],
  aggressive: ['must', 'should', 'nice'],
}

const RedlineRequestSchema = z.object({
  sessionId: z.string().uuid(),
  deviceId: z.string().uuid(),
  documentName: z.string().min(1),
  clauses: z.array(
    z.object({
      clauseType: ClauseTypeEnum,
      sectionNumber: z.string(),
      text: z.string(),
    }),
  ),
  classification: z.object({
    documentType: z.enum(['mutual_nda', 'one_way_nda']),
    useCase: z.enum([
      'saas_vendor',
      'employment_contractor',
      'manda',
      'strategic_partnership',
      'ip_licensing',
      'other',
    ]),
    governingLaw: z.string().min(1),
    signatoryType: z.enum(['entity', 'individual']),
  }),
  partyPerspective: z.enum(['disclosing', 'receiving']),
  mode: z.enum(['conservative', 'standard', 'aggressive']),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: z.infer<typeof RedlineRequestSchema>
  try {
    body = RedlineRequestSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const supabase = getSupabaseServer()

  // Rate limit: cap document reviews per device.
  const { count, error: countError } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('device_id', body.deviceId)
  if (countError) {
    return NextResponse.json({ error: 'Could not verify the review limit.' }, { status: 500 })
  }
  if ((count ?? 0) >= REVIEW_LIMIT_PER_DEVICE) {
    return NextResponse.json(
      { error: 'You have reached the limit of 5 reviews for this device.' },
      { status: 429 },
    )
  }

  // Pass 2: generate redlines grounded in the reference database.
  const system = buildRedlineSystemPrompt({
    referenceDatabase: getReferenceDatabase(),
    documentType: body.classification.documentType,
    useCase: body.classification.useCase,
    governingLaw: body.classification.governingLaw,
    signatoryType: body.classification.signatoryType,
    partyPerspective: body.partyPerspective,
    mode: body.mode,
  })

  let redlineOutput
  try {
    redlineOutput = await generateStructured({
      schema: RedlineOutputSchema,
      system,
      prompt: `Clauses to review:\n${JSON.stringify(body.clauses, null, 2)}`,
      pass: 2,
    })
  } catch (error) {
    const pass = error instanceof PipelineError ? error.pass : 2
    return NextResponse.json({ error: 'Pipeline pass failed', pass }, { status: 500 })
  }

  // Create the session row (id was generated in Pass 1).
  const { error: sessionError } = await supabase.from('sessions').insert({
    id: body.sessionId,
    device_id: body.deviceId,
    document_name: body.documentName,
    document_type: body.classification.documentType,
    use_case: body.classification.useCase,
    governing_law: body.classification.governingLaw,
    signatory_type: body.classification.signatoryType,
    party_perspective: body.partyPerspective,
    mode: body.mode,
  })
  if (sessionError) {
    return NextResponse.json({ error: 'Could not create the review session.' }, { status: 500 })
  }

  // Enforce mode semantics: keep only the priority tiers this mode includes.
  const allowedTiers = TIERS_BY_MODE[body.mode]
  const redlines = redlineOutput.redlines.filter((r) => allowedTiers.includes(r.priority))

  if (redlines.length === 0) {
    return NextResponse.json({ sessionId: body.sessionId, redlineCount: 0 })
  }

  // Match each redline back to its original clause by normalized text. This is more
  // robust than matching on section numbers (which can repeat, be empty, or be
  // mis-transcribed): it yields a correct document-order display_order and lets us
  // restore the pristine original_text and section_number from the input. Unmatched
  // redlines are placed after all matched clauses rather than scrambling the order.
  const normalize = (text: string): string => text.replace(/\s+/g, '').toLowerCase()
  const clauseByText = new Map<string, { index: number; text: string; sectionNumber: string }>()
  body.clauses.forEach((clause, index) => {
    clauseByText.set(normalize(clause.text), {
      index,
      text: clause.text,
      sectionNumber: clause.sectionNumber,
    })
  })

  const clauseRows = redlines.map((redline, index) => {
    const matched = clauseByText.get(normalize(redline.originalText))
    return {
      session_id: body.sessionId,
      clause_type: redline.clauseType,
      section_number: matched?.sectionNumber ?? redline.sectionNumber,
      priority_tier: redline.priority,
      original_text: matched?.text ?? redline.originalText,
      proposed_text: redline.proposedText,
      rationale: redline.rationale,
      citation: redline.citation,
      counterparty_prediction: redline.counterpartyPrediction,
      no_action_needed: redline.noActionNeeded,
      display_order: matched?.index ?? body.clauses.length + index,
    }
  })

  const { data: inserted, error: clauseError } = await supabase
    .from('clause_reviews')
    .insert(clauseRows)
    .select('id')
  if (clauseError) {
    // Roll back the session row to avoid an orphaned session with no redlines.
    await supabase.from('sessions').delete().eq('id', body.sessionId)
    return NextResponse.json({ error: 'Could not save the generated redlines.' }, { status: 500 })
  }

  return NextResponse.json({ sessionId: body.sessionId, redlineCount: inserted?.length ?? 0 })
}

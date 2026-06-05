/**
 * Re-runs the full pipeline (Pass 1 classify -> Pass 2 redline -> Pass 3 Claude evaluate) on
 * an existing real session, using its stored original document, and updates its redlines and
 * evaluation in place. Used to re-judge a real session with the current improved engine.
 *
 * Run: npx tsx scripts/rerun-session.ts <sessionId>
 */
import 'dotenv/config'
import mammoth from 'mammoth'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { ClassifyOutputSchema } from '../schemas/classify'
import { RedlineOutputSchema } from '../schemas/redline'
import { EvaluateOutputSchema } from '../schemas/evaluate'
import { CLASSIFY_SYSTEM_PROMPT } from '../prompts/classify'
import { buildRedlineSystemPrompt } from '../prompts/redline'
import { buildEvaluateSystemPrompt } from '../prompts/evaluate'
import {
  calculateOverallScore,
  weightedDimensionScore,
  getConfidenceSignal,
  clauseHasFailedBinaryCheck,
} from '../lib/eval-scoring'
import { pairScoreReviewIds } from '../lib/eval-pairing'
import { generateStructured, generateJudged } from '../lib/pipeline'

const round2 = (n: number): number => Math.round(n * 100) / 100
const normalize = (t: string): string => t.replace(/\s+/g, ' ').trim().toLowerCase()
const TIERS_BY_MODE: Record<string, string[]> = {
  conservative: ['must'],
  standard: ['must', 'should'],
  aggressive: ['must', 'should', 'nice'],
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  (process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) as string,
)

async function main(): Promise<void> {
  const sessionId = process.argv[2]
  if (!sessionId) throw new Error('usage: npx tsx scripts/rerun-session.ts <sessionId>')

  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  if (error || !session) throw new Error(`Session not found: ${error?.message ?? sessionId}`)
  console.warn(`Re-running ${session.document_name} (${session.mode}, ${session.party_perspective}) ...`)

  const { data: blob, error: dlErr } = await supabase.storage
    .from('uploads')
    .download(`${sessionId}/original.docx`)
  if (dlErr || !blob) throw new Error(`Could not download original.docx: ${dlErr?.message}`)
  const buffer = Buffer.from(await blob.arrayBuffer())
  const { value: text } = await mammoth.extractRawText({ buffer })

  const referenceDatabase = readFileSync(
    join(process.cwd(), 'lib/nda-reference-database.md'),
    'utf-8',
  )

  // Pass 1 (same generator helper as the live route)
  const classification = await generateStructured({
    schema: ClassifyOutputSchema,
    system: CLASSIFY_SYSTEM_PROMPT,
    prompt: text,
    pass: 1,
  })

  // Pass 2 (preserve the session's original perspective and mode)
  const redlineOut = await generateStructured({
    schema: RedlineOutputSchema,
    system: buildRedlineSystemPrompt({
      referenceDatabase,
      documentType: classification.documentType,
      useCase: classification.useCase,
      governingLaw: classification.governingLaw,
      signatoryType: classification.signatoryType,
      partyPerspective: session.party_perspective,
      mode: session.mode,
    }),
    prompt: `Clauses to review:\n${JSON.stringify(classification.clauses, null, 2)}`,
    pass: 2,
  })
  const allowed = TIERS_BY_MODE[session.mode] ?? ['must', 'should']
  const redlines = redlineOut.redlines.filter((r) => allowed.includes(r.priority))

  const documentText = classification.clauses
    .map((c) => `[${c.clauseType} §${c.sectionNumber}] ${c.text}`)
    .join('\n\n')

  // Pass 3 (Claude judge)
  const evalOut = await generateJudged({
    schema: EvaluateOutputSchema,
    pass: 3,
    system: buildEvaluateSystemPrompt(referenceDatabase),
    prompt: [
      `Document classification:\n${JSON.stringify(classification, null, 2)}`,
      `Full document under review (every clause, including those the redlines did not touch):\n${documentText}`,
      `Redlines that were made (evaluate their quality, and assess coverage against the full document above):\n${JSON.stringify(redlines, null, 2)}`,
    ].join('\n\n'),
  })

  // Clear the session's prior review and evaluation (keep the session row itself).
  await supabase.from('eval_runs').delete().eq('session_id', sessionId)
  await supabase.from('clause_reviews').delete().eq('session_id', sessionId)
  await supabase
    .from('sessions')
    .update({ document_text: documentText, status: 'exported' })
    .eq('id', sessionId)

  const orderBySection = new Map<string, number>()
  classification.clauses.forEach((c, i) => {
    if (!orderBySection.has(normalize(c.text))) orderBySection.set(normalize(c.text), i)
  })
  const decidedAt = session.created_at
  const clauseRows = redlines.map((r, i) => ({
    session_id: sessionId,
    clause_type: r.clauseType,
    section_number: r.sectionNumber,
    priority_tier: r.priority,
    original_text: r.originalText,
    proposed_text: r.proposedText,
    rationale: r.rationale,
    citation: r.citation,
    counterparty_prediction: r.counterpartyPrediction,
    no_action_needed: r.noActionNeeded,
    decision: 'accepted' as const,
    accepted_text: r.proposedText,
    decided_at: decidedAt,
    display_order: orderBySection.get(normalize(r.originalText)) ?? i,
  }))
  const { data: insertedClauses, error: clauseError } = await supabase
    .from('clause_reviews')
    .insert(clauseRows)
    .select('id, clause_type, section_number')
  if (clauseError) throw new Error(`Failed to insert clause reviews: ${clauseError.message}`)

  const overallScore = calculateOverallScore(
    evalOut.dimensions,
    evalOut.binaryChecks,
    evalOut.issueCoverage.score,
  )
  const b3 = evalOut.binaryChecks
  const { data: runRows, error: runError } = await supabase
    .from('eval_runs')
    .insert({
      session_id: sessionId,
      created_at: session.created_at,
      overall_score: overallScore,
      legal_accuracy: evalOut.dimensions.legalAccuracy,
      market_calibration: evalOut.dimensions.marketCalibration,
      redline_precision: evalOut.dimensions.redlinePrecision,
      explanation_quality: evalOut.dimensions.explanationQuality,
      proportionality: evalOut.dimensions.proportionality,
      dtsa_check: b3.dtsaNotice.result,
      dtsa_note: b3.dtsaNotice.note,
      ca_1660_check: b3.california1660.result,
      ca_1660_note: b3.california1660.note,
      trade_secret_check: b3.tradeSecretBifurcation.result,
      trade_secret_note: b3.tradeSecretBifurcation.note,
      ai_training_check: b3.aiTrainingCarveout.result,
      ai_training_note: b3.aiTrainingCarveout.note,
      consistency_check: b3.internalConsistency.result,
      consistency_note: b3.internalConsistency.note,
      improvement_notes: evalOut.improvementNotes,
      dimension_rationales: evalOut.dimensionRationales,
      issue_coverage: evalOut.issueCoverage.score,
      issue_coverage_rationale: evalOut.issueCoverage.rationale,
      missed_issues: evalOut.issueCoverage.missedIssues,
    })
    .select('id')
  const evalRunId = runRows?.[0]?.id
  if (runError || !evalRunId) throw new Error(`Failed to insert eval run: ${runError?.message}`)

  const reviewIdForScore = pairScoreReviewIds(evalOut.clauseScores, insertedClauses ?? [])
  const clauseScoreRows = evalOut.clauseScores
    .map((cs, i) => {
      const clauseReviewId = reviewIdForScore[i]
      if (!clauseReviewId) return null
      const clauseOverall = round2(weightedDimensionScore(cs.dimensions))
      return {
        eval_run_id: evalRunId,
        clause_review_id: clauseReviewId,
        legal_accuracy: cs.dimensions.legalAccuracy,
        market_calibration: cs.dimensions.marketCalibration,
        redline_precision: cs.dimensions.redlinePrecision,
        explanation_quality: cs.dimensions.explanationQuality,
        proportionality: cs.dimensions.proportionality,
        clause_overall_score: clauseOverall,
        confidence_signal: getConfidenceSignal(
          clauseOverall,
          clauseHasFailedBinaryCheck(cs.clauseType, evalOut.binaryChecks),
        ),
        evaluator_note: cs.evaluatorNote,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
  if (clauseScoreRows.length > 0) {
    const { error: scoreError } = await supabase.from('eval_clause_scores').insert(clauseScoreRows)
    if (scoreError) throw new Error(`Failed to insert clause scores: ${scoreError.message}`)
  }

  console.warn(
    `  done: ${redlines.length} redlines, overall ${overallScore}, ${clauseScoreRows.length} clause scores`,
  )
}

main().catch((e) => {
  console.error('rerun-session failed:', e instanceof Error ? e.message : String(e))
  process.exitCode = 1
})

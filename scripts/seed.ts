/**
 * Synthetic NDA benchmark seeding. Runs Passes 1-3 on the three synthetic NDAs and
 * stores them as benchmark sessions (is_benchmark = true) under fixed UUIDs, so the
 * evaluation dashboard and home screen show meaningful data before any real session.
 *
 * Run after environment setup: npm run seed
 */
import 'dotenv/config'
import { readFileSync } from 'fs'
import { join } from 'path'
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { GEMINI_MODEL_ID } from '../lib/env'
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

const BENCHMARK_DEVICE = '00000000-0000-4000-8000-0000000000aa'
const DAY = 24 * 60 * 60 * 1000
const round2 = (n: number): number => Math.round(n * 100) / 100

interface Benchmark {
  id: string
  file: string
  documentName: string
  perspective: 'disclosing' | 'receiving'
  mode: 'conservative' | 'standard' | 'aggressive'
  daysAgo: number
}

const BENCHMARKS: Benchmark[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    file: 'nda-1-saas.md',
    documentName: 'Mutual SaaS Vendor NDA.docx',
    perspective: 'receiving',
    mode: 'standard',
    daysAgo: 21,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    file: 'nda-2-employment.md',
    documentName: 'Employment Contractor NDA.docx',
    perspective: 'receiving',
    mode: 'standard',
    daysAgo: 14,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    file: 'nda-3-manda.md',
    documentName: 'M&A Due Diligence NDA.docx',
    perspective: 'receiving',
    mode: 'standard',
    daysAgo: 7,
  },
  {
    // Deliberately hard / adversarial document to test that the evaluator discriminates.
    id: '00000000-0000-4000-8000-000000000004',
    file: 'nda-4-hard.md',
    documentName: 'Cross-Border Data Partnership NDA.docx',
    perspective: 'receiving',
    mode: 'standard',
    daysAgo: 2,
  },
]

const TIERS_BY_MODE: Record<string, string[]> = {
  conservative: ['must'],
  standard: ['must', 'should'],
  aggressive: ['must', 'should', 'nice'],
}

const model = google(GEMINI_MODEL_ID)
// Prefer the service-role key for this admin seed when present (bypasses RLS); fall
// back to the publishable key, which works under the current no-RLS MVP posture.
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  (process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) as string,
)

function loadNda(file: string): string {
  const raw = readFileSync(join(process.cwd(), 'lib/synthetic-ndas', file), 'utf-8')
  return raw
    .split('\n')
    .filter((l) => !l.startsWith('#'))
    .join('\n')
    .trim()
}

function normalize(t: string): string {
  return t.replace(/\s+/g, ' ').trim().toLowerCase()
}

async function seedOne(b: Benchmark): Promise<void> {
  console.warn(`\nSeeding ${b.documentName} ...`)
  const text = loadNda(b.file)
  const referenceDatabase = readFileSync(
    join(process.cwd(), 'lib/nda-reference-database.md'),
    'utf-8',
  )
  const createdAt = new Date(Date.now() - b.daysAgo * DAY).toISOString()

  // Pass 1
  const { object: classification } = await generateObject({
    model,
    maxTokens: 60000,
    providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
    schema: ClassifyOutputSchema,
    system: CLASSIFY_SYSTEM_PROMPT,
    prompt: text,
  })

  // Pass 2
  const { object: redlineOut } = await generateObject({
    model,
    maxTokens: 60000,
    providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
    schema: RedlineOutputSchema,
    system: buildRedlineSystemPrompt({
      referenceDatabase,
      documentType: classification.documentType,
      useCase: classification.useCase,
      governingLaw: classification.governingLaw,
      signatoryType: classification.signatoryType,
      partyPerspective: b.perspective,
      mode: b.mode,
    }),
    prompt: `Clauses to review:\n${JSON.stringify(classification.clauses, null, 2)}`,
  })
  const allowed = TIERS_BY_MODE[b.mode] ?? ['must', 'should']
  const redlines = redlineOut.redlines.filter((r) => allowed.includes(r.priority))

  // Replace any prior data for this benchmark id (cascades clause_reviews + eval rows).
  const { error: deleteError } = await supabase.from('sessions').delete().eq('id', b.id)
  if (deleteError) throw new Error(`Failed to delete benchmark session: ${deleteError.message}`)

  const documentText = classification.clauses
    .map((c) => `[${c.clauseType} §${c.sectionNumber}] ${c.text}`)
    .join('\n\n')

  const { error: sessionError } = await supabase.from('sessions').insert({
    id: b.id,
    device_id: BENCHMARK_DEVICE,
    created_at: createdAt,
    document_name: b.documentName,
    document_type: classification.documentType,
    use_case: classification.useCase,
    governing_law: classification.governingLaw,
    signatory_type: classification.signatoryType,
    party_perspective: b.perspective,
    mode: b.mode,
    status: 'exported',
    export_generated_at: createdAt,
    is_benchmark: true,
    document_text: documentText,
  })
  if (sessionError) throw new Error(`Failed to insert benchmark session: ${sessionError.message}`)

  const orderBySection = new Map<string, number>()
  classification.clauses.forEach((c, i) => {
    if (!orderBySection.has(normalize(c.text))) orderBySection.set(normalize(c.text), i)
  })

  const clauseRows = redlines.map((r, i) => ({
    session_id: b.id,
    clause_type: r.clauseType,
    section_number: r.sectionNumber,
    priority_tier: r.priority,
    original_text: r.originalText,
    proposed_text: r.proposedText,
    rationale: r.rationale,
    citation: r.citation,
    counterparty_prediction: r.counterpartyPrediction,
    no_action_needed: r.noActionNeeded,
    // Benchmarks simulate a lawyer who accepted the AI redlines.
    decision: 'accepted' as const,
    accepted_text: r.proposedText,
    decided_at: createdAt,
    display_order: orderBySection.get(normalize(r.originalText)) ?? i,
  }))
  const { data: insertedClauses, error: clauseError } = await supabase
    .from('clause_reviews')
    .insert(clauseRows)
    .select('id, clause_type, section_number')
  if (clauseError) throw new Error(`Failed to insert clause reviews: ${clauseError.message}`)

  // Pass 3
  const { object: evalOut } = await generateObject({
    model,
    maxTokens: 60000,
    providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
    schema: EvaluateOutputSchema,
    system: buildEvaluateSystemPrompt(referenceDatabase),
    prompt: [
      `Document classification:\n${JSON.stringify(classification, null, 2)}`,
      `Full document under review (every clause, including those the redlines did not touch):\n${documentText}`,
      `Redlines that were made (evaluate their quality, and assess coverage against the full document above):\n${JSON.stringify(redlines, null, 2)}`,
    ].join('\n\n'),
  })

  const overallScore = calculateOverallScore(
    evalOut.dimensions,
    evalOut.binaryChecks,
    evalOut.issueCoverage.score,
  )
  const b3 = evalOut.binaryChecks
  const { data: runRows } = await supabase
    .from('eval_runs')
    .insert({
      session_id: b.id,
      created_at: createdAt,
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
  if (!evalRunId) throw new Error('Failed to insert eval run')

  // The evaluator scores redlines in the order it was given them, which is the order the
  // clause reviews were inserted, so pair by position rather than by a fragile key.
  const insertedIds = (insertedClauses ?? []).map((c) => c.id)
  const clauseScoreRows = evalOut.clauseScores
    .map((cs, i) => {
      const clauseReviewId = insertedIds[i]
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
    await supabase.from('eval_clause_scores').insert(clauseScoreRows)
  }

  console.warn(
    `  done: ${redlines.length} redlines, overall ${overallScore}, ${clauseScoreRows.length} clause scores`,
  )
}

async function main(): Promise<void> {
  // Optional CLI filter: `npm run seed -- nda-4-hard.md` seeds only matching files/ids,
  // leaving the other benchmarks untouched.
  const filter = process.argv.slice(2)
  const list = filter.length
    ? BENCHMARKS.filter((b) => filter.includes(b.file) || filter.includes(b.id))
    : BENCHMARKS
  for (const b of list) {
    await seedOne(b)
  }
  console.warn('\nBenchmark seeding complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

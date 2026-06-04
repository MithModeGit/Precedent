import { NextRequest } from 'next/server'
import { generateStructured } from '@/lib/pipeline'
import { getSupabaseServer } from '@/lib/supabase'
import { getReferenceDatabase } from '@/lib/reference-database'
import { buildEvaluateSystemPrompt } from '@/prompts/evaluate'
import { getStoredEval } from '@/lib/eval-fetch'
import { EvaluateOutputSchema, type EvaluateOutput } from '@/schemas/evaluate'
import {
  calculateOverallScore,
  weightedDimensionScore,
  getConfidenceSignal,
  clauseHasFailedBinaryCheck,
} from '@/lib/eval-scoring'

export const runtime = 'nodejs'
export const maxDuration = 300

const round2 = (n: number): number => Math.round(n * 100) / 100

/** Builds the SSE payload, applying server-computed overall scores and confidence signals. */
function applyServerScores(output: EvaluateOutput): EvaluateOutput {
  const overallScore = calculateOverallScore(output.dimensions, output.binaryChecks)
  const clauseScores = output.clauseScores.map((cs) => {
    const clauseOverallScore = round2(weightedDimensionScore(cs.dimensions))
    const failed = clauseHasFailedBinaryCheck(cs.clauseType, output.binaryChecks)
    return {
      ...cs,
      clauseOverallScore,
      confidenceSignal: getConfidenceSignal(clauseOverallScore, failed),
    }
  })
  return { ...output, overallScore, clauseScores }
}

async function persist(sessionId: string, scored: EvaluateOutput): Promise<void> {
  const supabase = getSupabaseServer()

  const { data: reviews } = await supabase
    .from('clause_reviews')
    .select('id, clause_type, section_number')
    .eq('session_id', sessionId)
  const idByKey = new Map<string, string>()
  for (const r of reviews ?? []) idByKey.set(`${r.clause_type}|${r.section_number}`, r.id)

  const b = scored.binaryChecks
  // One eval run per session: replace any existing run (cascade clears clause scores).
  const { error: deleteError } = await supabase.from('eval_runs').delete().eq('session_id', sessionId)
  if (deleteError) console.error(`Failed to delete existing eval run: ${deleteError.message}`)
  const { data: runRows, error: runError } = await supabase
    .from('eval_runs')
    .insert({
      session_id: sessionId,
      overall_score: scored.overallScore,
      legal_accuracy: scored.dimensions.legalAccuracy,
      market_calibration: scored.dimensions.marketCalibration,
      redline_precision: scored.dimensions.redlinePrecision,
      explanation_quality: scored.dimensions.explanationQuality,
      proportionality: scored.dimensions.proportionality,
      dtsa_check: b.dtsaNotice.result,
      dtsa_note: b.dtsaNotice.note,
      ca_1660_check: b.california1660.result,
      ca_1660_note: b.california1660.note,
      trade_secret_check: b.tradeSecretBifurcation.result,
      trade_secret_note: b.tradeSecretBifurcation.note,
      ai_training_check: b.aiTrainingCarveout.result,
      ai_training_note: b.aiTrainingCarveout.note,
      consistency_check: b.internalConsistency.result,
      consistency_note: b.internalConsistency.note,
      improvement_notes: scored.improvementNotes,
    })
    .select('id')
  if (runError || !runRows?.[0]) {
    console.error(`Failed to persist eval run: ${runError?.message ?? 'no row'}`)
    return
  }
  const evalRunId = runRows[0].id

  const clauseRows = scored.clauseScores
    .map((cs) => {
      const clauseReviewId = idByKey.get(`${cs.clauseType}|${cs.sectionNumber}`)
      if (!clauseReviewId) return null
      return {
        eval_run_id: evalRunId,
        clause_review_id: clauseReviewId,
        legal_accuracy: cs.dimensions.legalAccuracy,
        market_calibration: cs.dimensions.marketCalibration,
        redline_precision: cs.dimensions.redlinePrecision,
        explanation_quality: cs.dimensions.explanationQuality,
        proportionality: cs.dimensions.proportionality,
        clause_overall_score: cs.clauseOverallScore,
        confidence_signal: cs.confidenceSignal,
        evaluator_note: cs.evaluatorNote,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (clauseRows.length > 0) {
    const { error } = await supabase.from('eval_clause_scores').insert(clauseRows)
    if (error) console.error(`Failed to persist clause scores: ${error.message}`)
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!sessionId) throw new Error('Missing sessionId')

        // Return the stored evaluation if one exists: Pass 3 should run once per
        // session, not on every review-page reload.
        const existing = await getStoredEval(sessionId)
        if (existing) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(existing)}\n\n`))
          return
        }

        const supabase = getSupabaseServer()

        const { data: session } = await supabase
          .from('sessions')
          .select('document_type, use_case, governing_law, signatory_type, mode, party_perspective')
          .eq('id', sessionId)
          .single()

        const { data: reviews } = await supabase
          .from('clause_reviews')
          .select(
            'clause_type, section_number, priority_tier, original_text, proposed_text, rationale, citation, counterparty_prediction',
          )
          .eq('session_id', sessionId)
          .order('display_order', { ascending: true })

        if (!reviews || reviews.length === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No redlines to evaluate' })}\n\n`))
          return
        }

        const prompt = `Document classification:\n${JSON.stringify(session, null, 2)}\n\nRedlines to evaluate:\n${JSON.stringify(reviews, null, 2)}`

        const output = await generateStructured({
          schema: EvaluateOutputSchema,
          system: buildEvaluateSystemPrompt(getReferenceDatabase()),
          prompt,
          pass: 3,
        })

        const scored = applyServerScores(output)
        await persist(sessionId, scored)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(scored)}\n\n`))
      } catch (error) {
        console.error(`Evaluation failed: ${error instanceof Error ? error.message : 'unknown'}`)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Evaluation failed' })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

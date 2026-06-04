import { getSupabaseServer } from '@/lib/supabase'
import type { EvaluateOutput } from '@/schemas/evaluate'
import type { ClauseType } from '@/types'

/**
 * Reconstructs a stored evaluation (eval_runs + eval_clause_scores) into the
 * EvaluateOutput shape. Returns null if the session has no eval run yet. Used to
 * avoid re-running Pass 3 on every review-page load and by the dashboard.
 */
export async function getStoredEval(sessionId: string): Promise<EvaluateOutput | null> {
  const supabase = getSupabaseServer()

  const { data: run } = await supabase
    .from('eval_runs')
    .select('*')
    .eq('session_id', sessionId)
    .single()
  if (!run) return null

  const { data: scores } = await supabase
    .from('eval_clause_scores')
    .select('*')
    .eq('eval_run_id', run.id)

  const { data: reviews } = await supabase
    .from('clause_reviews')
    .select('id, clause_type, section_number')
    .eq('session_id', sessionId)
  const reviewById = new Map<string, { clauseType: ClauseType; sectionNumber: string }>()
  for (const r of reviews ?? []) {
    reviewById.set(r.id, { clauseType: r.clause_type, sectionNumber: r.section_number })
  }

  const clauseScores = (scores ?? []).map((s) => {
    const review = reviewById.get(s.clause_review_id)
    return {
      clauseType: (review?.clauseType ?? 'other') as ClauseType,
      sectionNumber: review?.sectionNumber ?? '',
      dimensions: {
        legalAccuracy: s.legal_accuracy,
        marketCalibration: s.market_calibration,
        redlinePrecision: s.redline_precision,
        explanationQuality: s.explanation_quality,
        proportionality: s.proportionality,
      },
      clauseOverallScore: Number(s.clause_overall_score),
      confidenceSignal: s.confidence_signal,
      evaluatorNote: s.evaluator_note,
    }
  })

  return {
    overallScore: Number(run.overall_score),
    dimensions: {
      legalAccuracy: run.legal_accuracy,
      marketCalibration: run.market_calibration,
      redlinePrecision: run.redline_precision,
      explanationQuality: run.explanation_quality,
      proportionality: run.proportionality,
    },
    binaryChecks: {
      dtsaNotice: { result: run.dtsa_check, note: run.dtsa_note },
      california1660: { result: run.ca_1660_check, note: run.ca_1660_note },
      tradeSecretBifurcation: { result: run.trade_secret_check, note: run.trade_secret_note },
      aiTrainingCarveout: { result: run.ai_training_check, note: run.ai_training_note },
      internalConsistency: { result: run.consistency_check, note: run.consistency_note },
    },
    clauseScores,
    improvementNotes: run.improvement_notes,
  }
}

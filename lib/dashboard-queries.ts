import { getSupabaseServer } from '@/lib/supabase'
import type {
  BinaryResult,
  ClauseType,
  DocumentType,
  ReviewMode,
  SessionStatus,
} from '@/types'

export interface SessionDimensions {
  legalAccuracy: number
  marketCalibration: number
  redlinePrecision: number
  explanationQuality: number
  proportionality: number
}

export interface SessionBinaryChecks {
  dtsa: BinaryResult
  ca1660: BinaryResult
  tradeSecret: BinaryResult
  aiTraining: BinaryResult
  consistency: BinaryResult
}

export interface SessionWithEval {
  id: string
  documentName: string
  documentType: DocumentType
  mode: ReviewMode
  createdAt: string
  isBenchmark: boolean
  status: SessionStatus
  overallScore: number | null
  dimensions: SessionDimensions | null
  binaryChecks: SessionBinaryChecks | null
  redlineCount: number
  acceptedCount: number
}

export interface ClausePerformance {
  clauseType: ClauseType
  averageScore: number
  sessionsReviewed: number
}

export interface DashboardData {
  sessions: SessionWithEval[]
  clausePerformance: ClausePerformance[]
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = getSupabaseServer()

  const [{ data: sessions }, { data: evalRuns }, { data: reviews }, { data: clauseScores }] =
    await Promise.all([
      supabase.from('sessions').select('*').order('created_at', { ascending: true }),
      supabase.from('eval_runs').select('*'),
      supabase.from('clause_reviews').select('id, session_id, clause_type, decision'),
      supabase.from('eval_clause_scores').select('clause_review_id, clause_overall_score'),
    ])

  const evalBySession = new Map((evalRuns ?? []).map((e) => [e.session_id, e]))

  // Per-session redline and accepted-without-modification counts.
  const counts = new Map<string, { total: number; accepted: number }>()
  const clauseTypeById = new Map<string, ClauseType>()
  for (const r of reviews ?? []) {
    clauseTypeById.set(r.id, r.clause_type)
    const c = counts.get(r.session_id) ?? { total: 0, accepted: 0 }
    c.total += 1
    if (r.decision === 'accepted') c.accepted += 1
    counts.set(r.session_id, c)
  }

  const sessionsWithEval: SessionWithEval[] = (sessions ?? []).map((s) => {
    const run = evalBySession.get(s.id)
    const c = counts.get(s.id) ?? { total: 0, accepted: 0 }
    return {
      id: s.id,
      documentName: s.document_name,
      documentType: s.document_type,
      mode: s.mode,
      createdAt: s.created_at,
      isBenchmark: s.is_benchmark,
      status: s.status,
      overallScore: run ? Number(run.overall_score) : null,
      dimensions: run
        ? {
            legalAccuracy: run.legal_accuracy,
            marketCalibration: run.market_calibration,
            redlinePrecision: run.redline_precision,
            explanationQuality: run.explanation_quality,
            proportionality: run.proportionality,
          }
        : null,
      binaryChecks: run
        ? {
            dtsa: run.dtsa_check,
            ca1660: run.ca_1660_check,
            tradeSecret: run.trade_secret_check,
            aiTraining: run.ai_training_check,
            consistency: run.consistency_check,
          }
        : null,
      redlineCount: c.total,
      acceptedCount: c.accepted,
    }
  })

  // Clause performance: average clause overall score by clause type across all sessions.
  const byClauseType = new Map<ClauseType, { sum: number; n: number }>()
  for (const cs of clauseScores ?? []) {
    const clauseType = clauseTypeById.get(cs.clause_review_id)
    if (!clauseType) continue
    const agg = byClauseType.get(clauseType) ?? { sum: 0, n: 0 }
    agg.sum += Number(cs.clause_overall_score)
    agg.n += 1
    byClauseType.set(clauseType, agg)
  }
  const clausePerformance: ClausePerformance[] = Array.from(byClauseType.entries()).map(
    ([clauseType, { sum, n }]) => ({
      clauseType,
      averageScore: Math.round((sum / n) * 100) / 100,
      sessionsReviewed: n,
    }),
  )

  return { sessions: sessionsWithEval, clausePerformance }
}

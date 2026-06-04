import type { ClauseType, ConfidenceSignal } from '@/types'
import type { EvaluateOutput } from '@/schemas/evaluate'

type Dimensions = EvaluateOutput['dimensions']
type BinaryChecks = EvaluateOutput['binaryChecks']

/** Dimension weights for the precision score (PRD §5.6). Sum to 1.0. */
export const DIMENSION_WEIGHTS: Record<keyof Dimensions, number> = {
  legalAccuracy: 0.3,
  marketCalibration: 0.25,
  redlinePrecision: 0.2,
  explanationQuality: 0.15,
  proportionality: 0.1,
}

/**
 * Recall is weighted higher than precision when combining the two: in legal review a
 * missed issue is worse than a mediocre edit (a lawyer can polish a redline but cannot fix
 * what was never flagged). beta = 2 weights coverage ~2x the precision score.
 */
export const RECALL_BETA = 2

const round2 = (n: number): number => Math.round(n * 100) / 100

/** Precision: weighted average of the five redline-quality dimension scores (1-5). */
export function weightedDimensionScore(dimensions: Dimensions): number {
  return (
    dimensions.legalAccuracy * DIMENSION_WEIGHTS.legalAccuracy +
    dimensions.marketCalibration * DIMENSION_WEIGHTS.marketCalibration +
    dimensions.redlinePrecision * DIMENSION_WEIGHTS.redlinePrecision +
    dimensions.explanationQuality * DIMENSION_WEIGHTS.explanationQuality +
    dimensions.proportionality * DIMENSION_WEIGHTS.proportionality
  )
}

/** Number of binary checks that failed. */
export function failedCheckCount(binaryChecks: BinaryChecks): number {
  return Object.values(binaryChecks).filter((c) => c.result === 'FAIL').length
}

/**
 * Recall-weighted harmonic mean (F-beta) of two 1-5 scores, returned on the 1-5 scale.
 * Smoothly non-compensatory: a low score on either axis drags the result down and cannot
 * be bought back by a high score on the other. Inputs are normalized to [0,1] via
 * (x-1)/4, combined with F-beta, then mapped back to 1-5.
 */
export function fBetaScore(precision: number, coverage: number, beta = RECALL_BETA): number {
  const p = (precision - 1) / 4
  const r = (coverage - 1) / 4
  const b2 = beta * beta
  const denom = b2 * p + r
  const f = denom <= 0 ? 0 : ((1 + b2) * p * r) / denom
  return 1 + 4 * f
}

/**
 * Overall session score: a recall-weighted F-score of the precision (weighted dimension
 * average) and the issue-coverage score, then gated to at most 3.0 when two or more binary
 * compliance checks fail (PRD §5.6). Rounded to two decimals for storage.
 */
export function calculateOverallScore(
  dimensions: Dimensions,
  binaryChecks: BinaryChecks,
  issueCoverage: number,
): number {
  const precision = weightedDimensionScore(dimensions)
  let overall = fBetaScore(precision, issueCoverage)
  if (failedCheckCount(binaryChecks) >= 2) overall = Math.min(overall, 3.0)
  return round2(overall)
}

/** Per-clause confidence signal mapping (AI_PIPELINE.md). */
export function getConfidenceSignal(
  clauseOverallScore: number,
  binaryCheckFailed: boolean,
): ConfidenceSignal {
  if (binaryCheckFailed) return 'review_needed'
  if (clauseOverallScore >= 4.0) return 'confident'
  if (clauseOverallScore >= 2.5) return 'review_needed'
  return 'low_confidence'
}

/**
 * Which clause types each binary check applies to. Used to decide whether a clause's
 * confidence signal should be downgraded because an applicable check failed.
 * Internal consistency is document-wide and is not tied to a single clause.
 */
const BINARY_CHECK_CLAUSE_TYPES: Partial<Record<keyof BinaryChecks, ClauseType[]>> = {
  dtsaNotice: ['obligations', 'parties_and_recitals', 'compelled_disclosure'],
  california1660: ['non_solicitation'],
  tradeSecretBifurcation: ['term_of_obligations', 'term_of_agreement'],
  aiTrainingCarveout: ['definition_of_ci', 'obligations'],
}

/** True if an applicable binary check failed for this clause type. */
export function clauseHasFailedBinaryCheck(
  clauseType: ClauseType,
  binaryChecks: BinaryChecks,
): boolean {
  return (Object.keys(BINARY_CHECK_CLAUSE_TYPES) as (keyof BinaryChecks)[]).some((key) => {
    const types = BINARY_CHECK_CLAUSE_TYPES[key]
    return types?.includes(clauseType) === true && binaryChecks[key].result === 'FAIL'
  })
}

import type { ClauseType, ConfidenceSignal } from '@/types'
import type { EvaluateOutput } from '@/schemas/evaluate'

type Dimensions = EvaluateOutput['dimensions']
type BinaryChecks = EvaluateOutput['binaryChecks']

/** Dimension weights for the overall score (PRD §5.6). Sum to 1.0. */
export const DIMENSION_WEIGHTS: Record<keyof Dimensions, number> = {
  legalAccuracy: 0.3,
  marketCalibration: 0.25,
  redlinePrecision: 0.2,
  explanationQuality: 0.15,
  proportionality: 0.1,
}

/** Weighted average of the five dimension scores. */
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
 * Overall session score: weighted dimension average, capped at 3.0 when two or
 * more binary checks fail (PRD §5.6). Rounded to two decimals for storage.
 */
export function calculateOverallScore(dimensions: Dimensions, binaryChecks: BinaryChecks): number {
  const weighted = weightedDimensionScore(dimensions)
  const capped = failedCheckCount(binaryChecks) >= 2 ? Math.min(weighted, 3.0) : weighted
  return Math.round(capped * 100) / 100
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

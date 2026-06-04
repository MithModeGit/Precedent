import { describe, it, expect } from 'vitest'
import {
  weightedDimensionScore,
  failedCheckCount,
  calculateOverallScore,
  getConfidenceSignal,
  clauseHasFailedBinaryCheck,
  DIMENSION_WEIGHTS,
} from '@/lib/eval-scoring'
import type { EvaluateOutput } from '@/schemas/evaluate'

type Dimensions = EvaluateOutput['dimensions']
type BinaryChecks = EvaluateOutput['binaryChecks']
type Result = 'PASS' | 'FAIL'

function dims(a: number, b: number, c: number, d: number, e: number): Dimensions {
  return {
    legalAccuracy: a,
    marketCalibration: b,
    redlinePrecision: c,
    explanationQuality: d,
    proportionality: e,
  }
}

function checks(a: Result, b: Result, c: Result, d: Result, e: Result): BinaryChecks {
  return {
    dtsaNotice: { result: a, note: '' },
    california1660: { result: b, note: '' },
    tradeSecretBifurcation: { result: c, note: '' },
    aiTrainingCarveout: { result: d, note: '' },
    internalConsistency: { result: e, note: '' },
  }
}

const ALL_PASS = checks('PASS', 'PASS', 'PASS', 'PASS', 'PASS')

describe('DIMENSION_WEIGHTS', () => {
  it('sum to 1.0', () => {
    expect(Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1.0)
  })
})

describe('weightedDimensionScore', () => {
  it('returns 5 when every dimension is 5', () => {
    expect(weightedDimensionScore(dims(5, 5, 5, 5, 5))).toBeCloseTo(5)
  })
  it('applies the documented weights', () => {
    // 5*0.30 + 1*0.25 + 1*0.20 + 1*0.15 + 1*0.10 = 1.5 + 0.70 = 2.2
    expect(weightedDimensionScore(dims(5, 1, 1, 1, 1))).toBeCloseTo(2.2)
  })
})

describe('failedCheckCount', () => {
  it('counts FAIL results', () => {
    expect(failedCheckCount(checks('FAIL', 'FAIL', 'PASS', 'PASS', 'FAIL'))).toBe(3)
    expect(failedCheckCount(ALL_PASS)).toBe(0)
  })
})

describe('calculateOverallScore', () => {
  it('does not cap with fewer than two failures', () => {
    expect(calculateOverallScore(dims(5, 5, 5, 5, 5), ALL_PASS)).toBe(5)
    expect(calculateOverallScore(dims(5, 5, 5, 5, 5), checks('FAIL', 'PASS', 'PASS', 'PASS', 'PASS'))).toBe(5)
  })
  it('caps at 3.0 when two or more checks fail', () => {
    expect(
      calculateOverallScore(dims(5, 5, 5, 5, 5), checks('FAIL', 'FAIL', 'PASS', 'PASS', 'PASS')),
    ).toBe(3)
  })
  it('is a ceiling, not a floor: a low score below 3 is unchanged by the cap', () => {
    expect(
      calculateOverallScore(dims(2, 2, 2, 2, 2), checks('FAIL', 'FAIL', 'FAIL', 'PASS', 'PASS')),
    ).toBe(2)
  })
})

describe('getConfidenceSignal', () => {
  it('returns review_needed when an applicable check failed, regardless of score', () => {
    expect(getConfidenceSignal(5, true)).toBe('review_needed')
  })
  it('is confident at exactly 4.0', () => {
    expect(getConfidenceSignal(4.0, false)).toBe('confident')
  })
  it('is review_needed just below 4.0', () => {
    expect(getConfidenceSignal(3.99, false)).toBe('review_needed')
  })
  it('is review_needed at exactly 2.5 and low_confidence just below', () => {
    expect(getConfidenceSignal(2.5, false)).toBe('review_needed')
    expect(getConfidenceSignal(2.49, false)).toBe('low_confidence')
  })
})

describe('clauseHasFailedBinaryCheck', () => {
  it('downgrades non_solicitation when the §16600 check fails', () => {
    expect(clauseHasFailedBinaryCheck('non_solicitation', checks('PASS', 'FAIL', 'PASS', 'PASS', 'PASS'))).toBe(true)
  })
  it('does not downgrade non_solicitation for an unrelated check failure', () => {
    expect(clauseHasFailedBinaryCheck('non_solicitation', checks('FAIL', 'PASS', 'PASS', 'PASS', 'PASS'))).toBe(false)
  })
  it('treats internal consistency as document-wide (never downgrades a clause)', () => {
    expect(clauseHasFailedBinaryCheck('definition_of_ci', checks('PASS', 'PASS', 'PASS', 'PASS', 'FAIL'))).toBe(false)
  })
  it('returns false for a clause type no check applies to, even if all fail', () => {
    expect(clauseHasFailedBinaryCheck('governing_law', checks('FAIL', 'FAIL', 'FAIL', 'FAIL', 'FAIL'))).toBe(false)
  })
})

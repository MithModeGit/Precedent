import { z } from 'zod'
import { ClauseTypeEnum } from './classify'

const DimensionScore = z.number().int().min(1).max(5)
const BinaryCheck = z.enum(['PASS', 'FAIL'])
const ConfidenceSignal = z.enum(['confident', 'review_needed', 'low_confidence'])

const DimensionScores = z.object({
  legalAccuracy: DimensionScore,
  marketCalibration: DimensionScore,
  redlinePrecision: DimensionScore,
  explanationQuality: DimensionScore,
  proportionality: DimensionScore,
})

const DimensionRationales = z.object({
  legalAccuracy: z.string(),
  marketCalibration: z.string(),
  redlinePrecision: z.string(),
  explanationQuality: z.string(),
  proportionality: z.string(),
})

export const EvaluateOutputSchema = z.object({
  overallScore: z
    .number()
    .describe(
      'Weighted average of the five dimension scores, capped at 3.0 if two or more binary checks fail',
    ),
  dimensions: DimensionScores,
  dimensionRationales: DimensionRationales.describe(
    'For each dimension, 2-3 sentences justifying the session-level score with specific evidence from the redlines (cite clause types, section numbers, statutes, or the exact wording you relied on). Name the single biggest weakness for that dimension even when the score is 5.',
  ),
  issueCoverage: z
    .object({
      score: DimensionScore.describe(
        'Recall, 1-5: of the material issues actually present in the FULL document provided, what fraction did the redlines address? 5 = every material issue was caught; 1 = most material issues were missed. Score the completeness of what was caught, not the quality of individual redlines.',
      ),
      rationale: z
        .string()
        .describe(
          'Justify the coverage score with specific evidence: which material issues the redlines addressed and which were missed.',
        ),
      missedIssues: z
        .array(z.string())
        .describe(
          'Each material issue present in the document that the redlines did NOT address, stated specifically with its location, e.g. "Sections 6 and 13 conflict: trade-secret confidentiality survives indefinitely under §6 but §13 terminates all obligations 3 years after the Effective Date." Empty only if nothing material was missed.',
        ),
    })
    .describe(
      'Recall: how completely the redlines addressed the material issues actually present in the full document.',
    ),
  binaryChecks: z.object({
    dtsaNotice: z.object({ result: BinaryCheck, note: z.string() }),
    california1660: z.object({ result: BinaryCheck, note: z.string() }),
    tradeSecretBifurcation: z.object({ result: BinaryCheck, note: z.string() }),
    aiTrainingCarveout: z.object({ result: BinaryCheck, note: z.string() }),
    internalConsistency: z.object({ result: BinaryCheck, note: z.string() }),
  }),
  clauseScores: z.array(
    z.object({
      clauseType: ClauseTypeEnum,
      sectionNumber: z.string(),
      dimensions: DimensionScores,
      clauseOverallScore: z.number(),
      confidenceSignal: ConfidenceSignal,
      evaluatorNote: z
        .string()
        .describe(
          "A 2-3 sentence evidence-backed assessment of this clause's redline: what it does well, what its weakest dimension is and why, citing the specific wording, statute, or market position you relied on. Be specific to this redline, not generic.",
        ),
    }),
  ),
  improvementNotes: z
    .array(z.string())
    .describe(
      'Array of plain-language improvement observations based on this session only. Pass 4 compares these with history to generate trend insights.',
    ),
})

export type EvaluateOutput = z.infer<typeof EvaluateOutputSchema>

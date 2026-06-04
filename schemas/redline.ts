import { z } from 'zod'
import { ClauseTypeEnum } from './classify'

export const PriorityEnum = z.enum(['must', 'should', 'nice'])

export const RedlineOutputSchema = z.object({
  redlines: z.array(
    z.object({
      clauseType: ClauseTypeEnum,
      sectionNumber: z.string(),
      priority: PriorityEnum,
      originalText: z.string(),
      proposedText: z.string(),
      rationale: z
        .string()
        .describe(
          '2 to 3 sentences. Name the specific source from the Reference Database. Describe the commercial consequence. Include a counterparty prediction.',
        ),
      citation: z
        .string()
        .describe(
          'The specific source cited from the Reference Database, e.g. "18 U.S.C. § 1833(b)" or "Cooley GO, Standard Mutual NDA". Write "per market practice" if no specific source applies.',
        ),
      counterpartyPrediction: z
        .string()
        .describe(
          'What the counterparty is likely to say in response, and the recommended fallback position.',
        ),
      noActionNeeded: z
        .boolean()
        .describe(
          'True if the clause already meets or exceeds the applicable market-standard position for this mode and no redline is warranted.',
        ),
    }),
  ),
})

export type RedlineOutput = z.infer<typeof RedlineOutputSchema>

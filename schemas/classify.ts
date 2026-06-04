import { z } from 'zod'

export const ClauseTypeEnum = z.enum([
  'parties_and_recitals',
  'definition_of_ci',
  'exclusions',
  'obligations',
  'standard_of_care',
  'permitted_disclosures',
  'compelled_disclosure',
  'residuals',
  'term_of_obligations',
  'term_of_agreement',
  'return_or_destruction',
  'non_solicitation',
  'no_license',
  'injunctive_relief',
  'limitation_of_liability',
  'governing_law',
  'entire_agreement',
  'amendment_and_waiver',
  'assignment',
  'counterparts',
  'other',
])

export const ClassifyOutputSchema = z.object({
  documentType: z.enum(['mutual_nda', 'one_way_nda']),
  useCase: z.enum([
    'saas_vendor',
    'employment_contractor',
    'manda',
    'strategic_partnership',
    'ip_licensing',
    'other',
  ]),
  governingLaw: z
    .string()
    .describe(
      'The jurisdiction identified in the governing law clause, e.g. "California", "Delaware", "New York"',
    ),
  signatoryType: z
    .enum(['entity', 'individual'])
    .describe(
      'Entity if both signatories are companies. Individual if one or more signatories is a named person.',
    ),
  clauses: z.array(
    z.object({
      clauseType: ClauseTypeEnum,
      sectionNumber: z
        .string()
        .describe('The section number as it appears in the document, e.g. "1.1", "Section 4", "3"'),
      text: z.string().describe('The full text of this clause as it appears in the document'),
    }),
  ),
})

export type ClassifyOutput = z.infer<typeof ClassifyOutputSchema>

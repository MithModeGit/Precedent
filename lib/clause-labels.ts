import type { ClauseType } from '@/types'

/** Human-readable clause names for display in the review interface and dashboard. */
export const CLAUSE_TYPE_LABEL: Record<ClauseType, string> = {
  parties_and_recitals: 'Parties and Recitals',
  definition_of_ci: 'Definition of Confidential Information',
  exclusions: 'Exclusions',
  obligations: 'Obligations of the Receiving Party',
  standard_of_care: 'Standard of Care',
  permitted_disclosures: 'Permitted Disclosures',
  compelled_disclosure: 'Compelled Disclosure',
  residuals: 'Residuals',
  term_of_obligations: 'Term of Confidentiality Obligations',
  term_of_agreement: 'Term of Agreement',
  return_or_destruction: 'Return or Destruction',
  non_solicitation: 'Non-Solicitation',
  no_license: 'No License',
  injunctive_relief: 'Injunctive Relief',
  limitation_of_liability: 'Limitation of Liability',
  governing_law: 'Governing Law',
  entire_agreement: 'Entire Agreement',
  amendment_and_waiver: 'Amendment and Waiver',
  assignment: 'Assignment',
  counterparts: 'Counterparts',
  other: 'Other Provision',
}

export function clauseTypeLabel(clauseType: ClauseType): string {
  return CLAUSE_TYPE_LABEL[clauseType]
}

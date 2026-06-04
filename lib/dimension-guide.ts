import type { EvaluateOutput } from '@/schemas/evaluate'

export type DimensionKey = keyof EvaluateOutput['dimensions']

export interface DimensionGuide {
  key: DimensionKey
  label: string
  /** Plain-language description of what the dimension scores. */
  measures: string
  /** What a top (5/5) result looks like for this dimension. */
  topScore: string
  /** Concrete next step when the score is below 5. */
  nextStep: string
}

export const DIMENSION_GUIDE: DimensionGuide[] = [
  {
    key: 'legalAccuracy',
    label: 'Legal Accuracy',
    measures:
      'Whether each redline correctly states the law and cites real, applicable authority for this NDA type and jurisdiction.',
    topScore:
      'Every legal claim is correct and every citation points to a statute or case that genuinely applies here.',
    nextStep:
      'Re-check the flagged clauses against their cited authority and correct or remove anything that does not apply to this NDA.',
  },
  {
    key: 'marketCalibration',
    label: 'Market Calibration',
    measures:
      'Whether the suggested positions match current market-standard terms rather than overreaching or leaving you under-protected.',
    topScore:
      'Every position lands at the market norm for a deal of this type: neither aggressive nor weak.',
    nextStep:
      'Compare the flagged positions to your playbook: soften any that overreach and strengthen any that are too permissive.',
  },
  {
    key: 'redlinePrecision',
    label: 'Redline Precision',
    measures:
      'Whether edits are surgical, changing only the problematic language and leaving the rest of each clause intact.',
    topScore:
      'Every edit targets exactly the problem text with no collateral changes to wording that was already fine.',
    nextStep:
      'Tighten the flagged edits so they touch only the language that creates risk and preserve the surrounding clause.',
  },
  {
    key: 'explanationQuality',
    label: 'Explanation Quality',
    measures:
      'Whether each rationale clearly explains the risk and why the change addresses it, in language a counterparty would accept.',
    topScore:
      'Every rationale names the specific risk and the reason for the edit so the ask is easy to defend.',
    nextStep:
      'Add the missing risk or reasoning to the rationales on the flagged clauses so each ask stands on its own.',
  },
  {
    key: 'proportionality',
    label: 'Proportionality',
    measures:
      'Whether the redline effort matches the stakes: material issues are flagged and trivial ones are left alone.',
    topScore:
      'Material risks are all raised as priorities and low-stakes wording is left untouched.',
    nextStep:
      'Drop or downgrade low-stakes edits on the flagged clauses and make sure any material risk is escalated to Must-Address.',
  },
]

/** Short interpretation of a 1-5 dimension score. */
export function scoreMeaning(score: number): string {
  if (score >= 5) return 'Excellent'
  if (score >= 4) return 'Strong, with minor room to improve'
  if (score >= 3) return 'Adequate, with some gaps'
  if (score >= 2) return 'Weak, with notable problems'
  return 'Poor, falls short of the standard'
}

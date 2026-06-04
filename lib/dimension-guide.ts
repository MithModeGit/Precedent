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
  /** The rubric anchor for each score level 1-5 (from the Pass 3 rubric, PRD §5.6). */
  levels: Record<1 | 2 | 3 | 4 | 5, string>
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
    levels: {
      5: 'Every legal claim is tied to a specific source; statutes cited with correct title, section, and subpart; case holdings accurately characterized.',
      4: 'All claims correct in substance; at least one citation is imprecise but nothing is factually wrong.',
      3: 'All claims appear correct but at least one is unverifiable from the reference database.',
      2: 'At least one legal claim is factually incorrect, cites the wrong section, or mischaracterizes a holding.',
      1: 'Multiple factual errors, or cited authorities not present in the reference database.',
    },
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
    levels: {
      5: 'Matches the settled market position for this clause, deal type, and governing law.',
      4: 'Within the market range; what a careful commercial lawyer would send without hesitation.',
      3: 'Defensible but slightly aggressive or slightly weak.',
      2: 'Materially off-market; a sophisticated counterparty would push back firmly, or the protection is weaker than market practice.',
      1: 'Fundamentally off-market; one-sided to the point that acceptance is implausible, or so weak it adds no protection.',
    },
  },
  {
    key: 'redlinePrecision',
    label: 'Redline Precision',
    measures:
      'Whether edits are well-drafted, internally consistent, and unambiguous, changing only the problematic language.',
    topScore:
      'Internally consistent, defined terms used correctly, cross-references resolve, no ambiguity introduced; ready to send.',
    nextStep:
      'Tighten the flagged edits so they touch only the language that creates risk and resolve any ambiguity or broken reference.',
    levels: {
      5: 'Internally consistent, defined terms correct, cross-references resolve, no ambiguity; requires no further editing.',
      4: 'Clear and functional; minor stylistic imprecision that does not create legal ambiguity.',
      3: 'Understandable but introduces at least one ambiguity (undefined term, imprecise qualifier, or unresolved reference).',
      2: 'Creates a material ambiguity or internal inconsistency; would require redrafting.',
      1: 'Self-contradictory, multiple undefined terms, or creates more problems than the original.',
    },
  },
  {
    key: 'explanationQuality',
    label: 'Explanation Quality',
    measures:
      'Whether each rationale explains the legal basis, the commercial consequence, and the expected counterparty response.',
    topScore:
      'Names the specific legal basis, the concrete commercial consequence, and a counterparty prediction with a fallback.',
    nextStep:
      'Add the missing legal basis, commercial consequence, or counterparty prediction to the rationales on the flagged clauses.',
    levels: {
      5: 'Names the specific legal basis, the concrete commercial consequence, and a counterparty prediction with a fallback.',
      4: 'Names a legal basis and the commercial consequence; counterparty prediction absent or generic.',
      3: 'Explains the issue and fix but relies on general statements without naming the source.',
      2: 'Describes what changed without explaining why it matters commercially; no source, no prediction.',
      1: 'Generic language applicable to any NDA clause; no legal basis, consequence, or prediction.',
    },
  },
  {
    key: 'proportionality',
    label: 'Proportionality',
    measures:
      "Whether the priority tier and aggressiveness are calibrated to each clause's legal risk and the selected review mode.",
    topScore:
      'Boilerplate flagged at Nice or not at all; substantive clauses addressed at the intensity their risk warrants.',
    nextStep:
      'Drop or downgrade low-stakes edits on the flagged clauses and make sure any material risk is escalated to Must-Address.',
    levels: {
      5: 'Boilerplate flagged at Nice or not at all; substantive clauses addressed at the intensity their risk warrants; aggressiveness matches the mode.',
      4: 'Generally correct calibration; one clause slightly over- or under-prioritized without misleading the reviewer.',
      3: 'At least one clause materially over- or under-prioritized.',
      2: 'Multiple calibration errors that misdirect attention.',
      1: 'No discernible relationship between clause risk and assigned priority.',
    },
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

/** The rubric anchor text for a given dimension and (rounded) score level. */
export function levelAnchor(key: DimensionKey, score: number): string {
  const guide = DIMENSION_GUIDE.find((d) => d.key === key)
  if (!guide) return ''
  const level = Math.min(5, Math.max(1, Math.round(score))) as 1 | 2 | 3 | 4 | 5
  return guide.levels[level]
}

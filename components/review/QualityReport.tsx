'use client'

import type { EvaluateOutput } from '@/schemas/evaluate'
import { useSession } from '@/components/review/SessionContext'
import { Tooltip } from '@/components/ui/Tooltip'
import { DimensionAccordion } from '@/components/eval/DimensionAccordion'

const CHECKS: { key: keyof EvaluateOutput['binaryChecks']; label: string; info: string }[] = [
  {
    key: 'dtsaNotice',
    label: 'DTSA Notice',
    info: 'Defend Trade Secrets Act, 18 U.S.C. § 1833(b): without the whistleblower-immunity notice, the disclosing party cannot recover exemplary damages or attorney fees from an employee or contractor in a trade-secret action.',
  },
  {
    key: 'california1660',
    label: 'California §16600',
    info: 'Cal. Bus. & Prof. Code § 16600: post-engagement non-solicitation and non-compete restraints are generally void in California, so such clauses are flagged when the governing law is California.',
  },
  {
    key: 'tradeSecretBifurcation',
    label: 'Trade Secret Bifurcation',
    info: 'Confidentiality of trade secrets should survive for as long as the information remains a trade secret, separate from the fixed term that applies to other confidential information.',
  },
  {
    key: 'aiTrainingCarveout',
    label: 'AI Training Carve-out',
    info: 'The agreement should bar using the disclosing party’s confidential information to train AI or machine-learning models absent explicit permission.',
  },
  {
    key: 'internalConsistency',
    label: 'Internal Consistency',
    info: 'Defined terms, cross-references, and obligations should be internally consistent across the document.',
  },
]

export function QualityReport(): React.ReactElement {
  const { evalResults } = useSession()

  if (!evalResults) {
    return (
      <div className="p-6 text-sm text-text-secondary">
        The quality report appears once evaluation finishes. This runs in the background while you
        review.
      </div>
    )
  }

  return (
    <div className="space-y-6 overflow-y-auto p-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-text-secondary">Overall quality score</p>
        <p className="mt-1 font-display text-3xl text-text-primary">
          {evalResults.overallScore.toFixed(1)}{' '}
          <span className="text-base text-text-muted">/ 5.0</span>
        </p>
        <p className="mt-1 text-xs text-text-muted">
          How well the AI redlined this document, judged against the legal quality rubric. Select a
          dimension to see what it measures and why it scored as it did.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-text-secondary">
          Dimensions
        </p>
        <DimensionAccordion
          dimensions={evalResults.dimensions}
          rationales={evalResults.dimensionRationales}
          clauseScores={evalResults.clauseScores}
        />
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-text-secondary">
          Compliance checks
        </p>
        <ul className="space-y-2">
          {CHECKS.map((c) => {
            const check = evalResults.binaryChecks[c.key]
            const pass = check.result === 'PASS'
            return (
              <li key={c.key} className="border-b border-border-subtle pb-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center text-sm text-text-primary">
                    {c.label}
                    <Tooltip text={c.info} />
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      pass ? 'bg-nice-bg text-nice' : 'bg-must-bg text-must'
                    }`}
                  >
                    {check.result}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-secondary">{check.note}</p>
              </li>
            )
          })}
        </ul>
      </div>

      {evalResults.improvementNotes && evalResults.improvementNotes.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-text-secondary">
            Observations
          </p>
          <ul className="space-y-2">
            {evalResults.improvementNotes.map((note, i) => (
              <li
                key={i}
                className="border-l-2 border-border pl-3 text-sm leading-6 text-text-secondary"
              >
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

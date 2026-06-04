'use client'

import type { EvaluateOutput } from '@/schemas/evaluate'
import { useSession } from '@/components/review/SessionContext'

const DIMENSIONS: { key: keyof EvaluateOutput['dimensions']; label: string }[] = [
  { key: 'legalAccuracy', label: 'Legal Accuracy' },
  { key: 'marketCalibration', label: 'Market Calibration' },
  { key: 'redlinePrecision', label: 'Redline Precision' },
  { key: 'explanationQuality', label: 'Explanation Quality' },
  { key: 'proportionality', label: 'Proportionality' },
]

const CHECKS: { key: keyof EvaluateOutput['binaryChecks']; label: string }[] = [
  { key: 'dtsaNotice', label: 'DTSA Notice' },
  { key: 'california1660', label: 'California §16600' },
  { key: 'tradeSecretBifurcation', label: 'Trade Secret Bifurcation' },
  { key: 'aiTrainingCarveout', label: 'AI Training Carve-out' },
  { key: 'internalConsistency', label: 'Internal Consistency' },
]

function DimensionBar({ label, score }: { label: string; score: number }): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-xs text-text-secondary">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-surface-raised">
        <div className="h-2 rounded-full bg-navy" style={{ width: `${(score / 5) * 100}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-xs text-text-primary">{score}</span>
    </div>
  )
}

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
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-text-secondary">
          Dimensions
        </p>
        <div className="space-y-2">
          {DIMENSIONS.map((d) => (
            <DimensionBar key={d.key} label={d.label} score={evalResults.dimensions[d.key]} />
          ))}
        </div>
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
                  <span className="text-sm text-text-primary">{c.label}</span>
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

      {evalResults.improvementNotes.length > 0 && (
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

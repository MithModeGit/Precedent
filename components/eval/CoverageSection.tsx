import type { EvaluateOutput } from '@/schemas/evaluate'
import { weightedDimensionScore } from '@/lib/eval-scoring'

/**
 * Surfaces the two halves of the overall score, precision and recall, plus the specific
 * material issues the redlines missed. The overall is a recall-weighted F-score of the two,
 * so a strong-precision review that misses an issue cannot score near 5.
 */
export function CoverageSection({
  dimensions,
  issueCoverage,
}: {
  dimensions: EvaluateOutput['dimensions']
  issueCoverage: EvaluateOutput['issueCoverage']
}): React.ReactElement {
  const precision = weightedDimensionScore(dimensions)
  const missed = issueCoverage.missedIssues ?? []
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-border-subtle p-3">
          <p className="font-display text-2xl text-text-primary">{precision.toFixed(1)}</p>
          <p className="mt-0.5 text-xs text-text-secondary">Redline quality (precision)</p>
        </div>
        <div className="rounded-md border border-border-subtle p-3">
          <p className="font-display text-2xl text-text-primary">{issueCoverage.score}/5</p>
          <p className="mt-0.5 text-xs text-text-secondary">Issue coverage (recall)</p>
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Overall is a recall-weighted F-score of these two: a high-quality redline set that misses
        a material issue cannot score near 5.
      </p>
      {issueCoverage.rationale && (
        <p className="text-sm leading-6 text-text-secondary">{issueCoverage.rationale}</p>
      )}
      <div>
        <p className="text-xs uppercase tracking-widest text-text-muted">Issues the redlines missed</p>
        {missed.length > 0 ? (
          <ul className="mt-1 space-y-1.5">
            {missed.map((issue, i) => (
              <li
                key={i}
                className="border-l-2 border-must-border pl-3 text-sm leading-6 text-text-secondary"
              >
                {issue}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-text-secondary">No material issues were missed.</p>
        )}
      </div>
    </div>
  )
}

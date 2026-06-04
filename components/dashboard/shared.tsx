import type { BinaryResult } from '@/types'

/** Score badge colored by performance tier (PRD dashboard tiers). */
export function ScoreBadge({ score }: { score: number | null }): React.ReactElement {
  if (score === null) {
    return <span className="rounded-full bg-surface-raised px-2 py-0.5 text-xs text-text-muted">—</span>
  }
  const cls =
    score >= 4 ? 'bg-nice-bg text-nice' : score >= 3 ? 'bg-should-bg text-should' : 'bg-must-bg text-must'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {score.toFixed(1)}
    </span>
  )
}

/** Row of five pass/fail dots for the binary checks. */
export function BinaryDots({ results }: { results: BinaryResult[] }): React.ReactElement {
  return (
    <span className="inline-flex gap-1">
      {results.map((r, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${r === 'PASS' ? 'bg-nice' : 'bg-must'}`}
        />
      ))}
    </span>
  )
}

type TrendDirection = 'up' | 'down' | 'flat'

function TrendIndicator({ direction }: { direction: TrendDirection }): React.ReactElement {
  if (direction === 'up') return <span className="text-nice">▲</span>
  if (direction === 'down') return <span className="text-must">▼</span>
  return <span className="text-text-muted">—</span>
}

export function StatCard({
  value,
  label,
  trend,
}: {
  value: string
  label: string
  trend?: TrendDirection
}): React.ReactElement {
  return (
    <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
      <p className="flex items-center gap-2 font-display text-3xl text-text-primary">
        {value}
        {trend && <span className="text-sm">{<TrendIndicator direction={trend} />}</span>}
      </p>
      <p className="mt-1 text-xs text-text-secondary">{label}</p>
    </div>
  )
}

/** Horizontal dimension bar with an optional prior-period marker. */
export function DimensionBar({
  label,
  score,
  priorScore,
}: {
  label: string
  score: number
  priorScore?: number | null
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-xs text-text-secondary">{label}</span>
      <div className="relative h-2 flex-1 rounded-full bg-surface-raised">
        <div className="h-2 rounded-full bg-navy" style={{ width: `${(score / 5) * 100}%` }} />
        {priorScore != null && (
          <span
            className="absolute top-[-2px] h-3 w-0.5 bg-gold"
            style={{ left: `${(priorScore / 5) * 100}%` }}
            title={`Prior period: ${priorScore.toFixed(1)}`}
          />
        )}
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-xs text-text-primary">
        {score.toFixed(1)}
      </span>
    </div>
  )
}

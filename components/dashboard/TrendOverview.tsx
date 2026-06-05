'use client'

import { useMemo } from 'react'
import type { BinaryResult } from '@/types'
import type { ClausePerformance, SessionWithEval } from '@/lib/dashboard-queries'
import { clauseTypeLabel } from '@/lib/clause-labels'
import { StatCard, DimensionBar } from '@/components/dashboard/shared'
import { ScoreTrendChart, type TrendPoint } from '@/components/dashboard/ScoreTrendChart'

const DIMENSIONS = [
  { key: 'legalAccuracy', label: 'Legal Accuracy' },
  { key: 'marketCalibration', label: 'Market Calibration' },
  { key: 'redlinePrecision', label: 'Redline Precision' },
  { key: 'explanationQuality', label: 'Explanation Quality' },
  { key: 'proportionality', label: 'Proportionality' },
] as const

const CHECKS = [
  { key: 'dtsa', label: 'DTSA Notice' },
  { key: 'ca1660', label: 'California §16600' },
  { key: 'tradeSecret', label: 'Trade Secret' },
  { key: 'aiTraining', label: 'AI Training' },
  { key: 'consistency', label: 'Consistency' },
] as const

interface Metrics {
  count: number
  avgScore: number | null
  acceptanceRate: number | null
  passRate: number | null
  dimensions: Record<string, number> | null
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}

function computeMetrics(list: SessionWithEval[]): Metrics {
  const withEval = list.filter((s) => s.overallScore !== null)
  const totalRedlines = list.reduce((a, s) => a + s.redlineCount, 0)
  const accepted = list.reduce((a, s) => a + s.acceptedCount, 0)
  const allChecks = withEval.flatMap((s) =>
    s.binaryChecks ? (Object.values(s.binaryChecks) as BinaryResult[]) : [],
  )
  const dims: Record<string, number> | null = withEval.length
    ? Object.fromEntries(
        DIMENSIONS.map((d) => [d.key, mean(withEval.map((s) => s.dimensions![d.key])) ?? 0]),
      )
    : null
  return {
    count: list.length,
    avgScore: mean(withEval.map((s) => s.overallScore as number)),
    acceptanceRate: totalRedlines ? accepted / totalRedlines : null,
    passRate: allChecks.length ? allChecks.filter((c) => c === 'PASS').length / allChecks.length : null,
    dimensions: dims,
  }
}

export function TrendOverview({
  sessions,
  clausePerformance,
  scoreDistribution,
}: {
  sessions: SessionWithEval[]
  clausePerformance: ClausePerformance[]
  scoreDistribution: Record<number, number>
}): React.ReactElement {
  const metrics = useMemo(() => computeMetrics(sessions), [sessions])

  const trendData: TrendPoint[] = useMemo(
    () =>
      sessions
        .filter((s) => s.overallScore !== null)
        .map((s) => {
          // X-axis is keyed on the document, not the date, so the trend still reads when
          // several sessions share a date. The hover tooltip shows the full name.
          const base = (s.documentName ?? '').replace(/\.docx$/i, '').replace(/\s*NDA$/i, '').trim()
          return {
            date: new Date(s.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            }),
            label: base.length > 20 ? `${base.slice(0, 19)}…` : base,
            overallScore: s.overallScore as number,
            documentName: s.documentName ?? '',
            documentType: s.documentType ?? '',
          }
        }),
    [sessions],
  )

  const sortedClauses = useMemo(
    () => [...clausePerformance].sort((a, b) => a.averageScore - b.averageScore),
    [clausePerformance],
  )

  // Weakest dimension: the lowest average, to point the team at where to improve.
  const weakestDimension = useMemo(() => {
    if (!metrics.dimensions) return null
    const lowest = DIMENSIONS.reduce(
      (low, d) =>
        (metrics.dimensions![d.key] ?? 5) < (metrics.dimensions![low.key] ?? 5) ? d : low,
      DIMENSIONS[0],
    )
    // Only surface a "weakest" if it actually has room to improve (not a perfect 5).
    return (metrics.dimensions[lowest.key] ?? 5) < 5 ? lowest : null
  }, [metrics.dimensions])

  const distTotal = useMemo(
    () => Object.values(scoreDistribution).reduce((a, b) => a + b, 0),
    [scoreDistribution],
  )
  const fivePct = distTotal ? Math.round(((scoreDistribution[5] ?? 0) / distTotal) * 100) : null

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          value={metrics.avgScore != null ? `${metrics.avgScore.toFixed(1)} / 5.0` : 'N/A'}
          label="Average Quality Score"
        />
        <StatCard value={String(metrics.count)} label="Sessions Completed" />
        <StatCard
          value={metrics.acceptanceRate != null ? `${Math.round(metrics.acceptanceRate * 100)}%` : 'N/A'}
          label="Redline Acceptance Rate"
        />
        <StatCard
          value={metrics.passRate != null ? `${Math.round(metrics.passRate * 100)}%` : 'N/A'}
          label="Binary Check Pass Rate"
        />
      </div>

      <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-secondary">
          Overall score trend
        </p>
        <ScoreTrendChart data={trendData} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-secondary">
            Dimension performance
          </p>
          {metrics.dimensions ? (
            <div className="space-y-3">
              {DIMENSIONS.map((d) => (
                <DimensionBar
                  key={d.key}
                  label={d.label}
                  score={metrics.dimensions![d.key] ?? 0}
                  priorScore={null}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No evaluation data yet.</p>
          )}
          {weakestDimension && (
            <p className="mt-4 border-t border-border-subtle pt-3 text-xs text-text-secondary">
              <span className="font-medium text-text-primary">Weakest dimension: </span>
              {weakestDimension.label} (
              {(metrics.dimensions?.[weakestDimension.key] ?? 0).toFixed(1)}/5). This is where the
              redline engine has the most room to improve.
            </p>
          )}
        </div>

        <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-secondary">
            Binary check pass rate
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CHECKS.map((c) => {
              const sessionsWithChecks = sessions.filter((s) => s.binaryChecks)
              const passes = sessionsWithChecks.filter((s) => s.binaryChecks![c.key] === 'PASS').length
              const rate = sessionsWithChecks.length ? passes / sessionsWithChecks.length : null
              const pct = rate != null ? Math.round(rate * 100) : null
              const color =
                pct == null
                  ? 'text-text-muted'
                  : pct >= 90
                    ? 'text-nice'
                    : pct >= 70
                      ? 'text-should'
                      : 'text-must'
              return (
                <div key={c.key} className="rounded-md border border-border-subtle p-3">
                  <p className="text-xs text-text-secondary">{c.label}</p>
                  <p className={`mt-1 font-display text-2xl ${color}`}>
                    {pct != null ? `${pct}%` : 'N/A'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
        <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-text-secondary">
          Evaluator score distribution
        </p>
        <p className="mb-4 text-xs text-text-muted">
          Every per-clause dimension score (all sessions), by value. A healthy evaluator
          discriminates; if scores pile up at 5, verify the engine is genuinely that strong rather
          than the evaluator under-discriminating.
        </p>
        {distTotal > 0 ? (
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((score) => {
              const n = scoreDistribution[score] ?? 0
              const pct = Math.round((n / distTotal) * 100)
              return (
                <div key={score} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-right font-mono text-xs text-text-secondary">
                    {score}
                  </span>
                  <span className="h-3 flex-1 rounded-full bg-surface-raised">
                    <span className="block h-3 rounded-full bg-navy" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-16 shrink-0 text-right font-mono text-xs text-text-secondary">
                    {n} ({pct}%)
                  </span>
                </div>
              )
            })}
            {fivePct != null && fivePct >= 80 && (
              <p className="mt-3 rounded-md bg-should-bg p-2 text-xs text-should">
                {fivePct}% of dimension scores are 5. Confirm with the rationales that this reflects
                genuine quality, or tighten the evaluator rubric/prompt so it discriminates more.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            Run document reviews to populate the score distribution.
          </p>
        )}
      </div>

      <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-secondary">
          Clause performance
        </p>
        {sortedClauses.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-text-secondary">
                <th className="pb-2">Clause Type</th>
                <th className="pb-2 text-right">Average Score</th>
                <th className="pb-2 text-right">Sessions Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {sortedClauses.map((c) => (
                <tr key={c.clauseType} className="border-b border-border-subtle">
                  <td className="py-2 text-text-primary">{clauseTypeLabel(c.clauseType)}</td>
                  <td className="py-2 text-right font-mono">{c.averageScore.toFixed(2)}</td>
                  <td className="py-2 text-right text-text-secondary">{c.sessionsReviewed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-text-secondary">
            Run a document review to see clause-level performance here.
          </p>
        )}
      </div>
    </div>
  )
}

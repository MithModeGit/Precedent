'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { EvaluateOutput } from '@/schemas/evaluate'
import { useSession } from '@/components/review/SessionContext'
import { clauseTypeLabel } from '@/lib/clause-labels'
import { DIMENSION_GUIDE, scoreMeaning, type DimensionKey } from '@/lib/dimension-guide'

const CHECKS: { key: keyof EvaluateOutput['binaryChecks']; label: string }[] = [
  { key: 'dtsaNotice', label: 'DTSA Notice' },
  { key: 'california1660', label: 'California §16600' },
  { key: 'tradeSecretBifurcation', label: 'Trade Secret Bifurcation' },
  { key: 'aiTrainingCarveout', label: 'AI Training Carve-out' },
  { key: 'internalConsistency', label: 'Internal Consistency' },
]

/** The clauses that scored lowest on a given dimension, for the "where to focus" list. */
function lowestClausesForDimension(
  clauseScores: EvaluateOutput['clauseScores'] | undefined | null,
  key: DimensionKey,
): EvaluateOutput['clauseScores'] {
  return [...(clauseScores ?? [])]
    .filter((c) => c.dimensions?.[key] != null && c.dimensions[key] < 5)
    .sort((a, b) => (a.dimensions?.[key] ?? 0) - (b.dimensions?.[key] ?? 0))
    .slice(0, 3)
}

function DimensionRow({
  dimensionKey,
  score,
  clauseScores,
  expanded,
  onToggle,
}: {
  dimensionKey: DimensionKey
  score: number
  clauseScores: EvaluateOutput['clauseScores']
  expanded: boolean
  onToggle: () => void
}): React.ReactElement {
  const guide = DIMENSION_GUIDE.find((d) => d.key === dimensionKey)
  if (!guide) return <></>
  const focus = score < 5 ? lowestClausesForDimension(clauseScores, dimensionKey) : []

  return (
    <div className="border-b border-border-subtle pb-3 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 py-1 text-left"
      >
        <span className="text-text-muted">{expanded ? '⌄' : '›'}</span>
        <span className="w-36 shrink-0 text-xs text-text-secondary">{guide.label}</span>
        <span className="h-2 flex-1 rounded-full bg-surface-raised">
          <span
            className="block h-2 rounded-full bg-navy"
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </span>
        <span className="w-10 shrink-0 text-right font-mono text-xs text-text-primary">
          {score}/5
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pl-6 pt-3 text-sm leading-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-text-muted">What this measures</p>
                <p className="mt-1 text-text-secondary">{guide.measures}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-text-muted">
                  Your score: {score}/5
                </p>
                <p className="mt-1 text-text-secondary">
                  {scoreMeaning(score)}. A 5 means: {guide.topScore}
                </p>
              </div>
              {score < 5 && (
                <>
                  {focus.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-text-muted">
                        Where to focus
                      </p>
                      <ul className="mt-1 space-y-1.5">
                        {focus.map((c, i) => (
                          <li key={i} className="text-text-secondary">
                            <span className="font-medium text-text-primary">
                              {clauseTypeLabel(c.clauseType)}
                            </span>
                            <span className="ml-2 font-mono text-xs text-text-muted">
                              {c.sectionNumber} · {c.dimensions[dimensionKey]}/5
                            </span>
                            <span className="block text-xs">{c.evaluatorNote}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-text-muted">
                      Recommended next step
                    </p>
                    <p className="mt-1 text-text-secondary">{guide.nextStep}</p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function QualityReport(): React.ReactElement {
  const { evalResults } = useSession()
  const [expanded, setExpanded] = useState<Set<DimensionKey>>(new Set())

  if (!evalResults) {
    return (
      <div className="p-6 text-sm text-text-secondary">
        The quality report appears once evaluation finishes. This runs in the background while you
        review.
      </div>
    )
  }

  function toggle(key: DimensionKey): void {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
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
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-semibold uppercase tracking-widest text-text-secondary">
            Dimensions
          </p>
          <p className="text-xs text-text-muted">Select a dimension for detail</p>
        </div>
        <div className="space-y-1">
          {DIMENSION_GUIDE.map((d) => (
            <DimensionRow
              key={d.key}
              dimensionKey={d.key}
              score={evalResults.dimensions[d.key]}
              clauseScores={evalResults.clauseScores}
              expanded={expanded.has(d.key)}
              onToggle={() => toggle(d.key)}
            />
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

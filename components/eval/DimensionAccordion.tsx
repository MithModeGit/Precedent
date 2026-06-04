'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { EvaluateOutput } from '@/schemas/evaluate'
import { clauseTypeLabel } from '@/lib/clause-labels'
import { DIMENSION_GUIDE, scoreMeaning, levelAnchor, type DimensionKey } from '@/lib/dimension-guide'

/** Lowest-scoring clauses on a dimension, for the "where to focus" list. */
function lowestClauses(
  clauseScores: EvaluateOutput['clauseScores'] | undefined,
  key: DimensionKey,
): EvaluateOutput['clauseScores'] {
  return [...(clauseScores ?? [])]
    .filter((c) => c.dimensions?.[key] != null && c.dimensions[key] < 5)
    .sort((a, b) => (a.dimensions?.[key] ?? 0) - (b.dimensions?.[key] ?? 0))
    .slice(0, 3)
}

function Row({
  dimensionKey,
  score,
  rationale,
  clauseScores,
  expanded,
  onToggle,
}: {
  dimensionKey: DimensionKey
  score: number
  rationale: string
  clauseScores?: EvaluateOutput['clauseScores']
  expanded: boolean
  onToggle: () => void
}): React.ReactElement {
  const guide = DIMENSION_GUIDE.find((d) => d.key === dimensionKey)
  if (!guide) return <></>
  const focus = score < 5 ? lowestClauses(clauseScores, dimensionKey) : []

  return (
    <div className="border-b border-border-subtle pb-3 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
      >
        <span className="text-text-muted">{expanded ? '⌄' : '›'}</span>
        <span className="w-40 shrink-0 text-xs text-text-secondary">{guide.label}</span>
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
            key={dimensionKey}
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
                  Score {score}/5: {scoreMeaning(score)}
                </p>
                <p className="mt-1 text-text-secondary">
                  <span className="font-medium text-text-primary">What a {Math.round(score)} means: </span>
                  {levelAnchor(dimensionKey, score)}
                </p>
              </div>
              {rationale && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-text-muted">
                    Why this document scored {score}
                  </p>
                  <p className="mt-1 text-text-secondary">{rationale}</p>
                </div>
              )}
              {score < 5 && focus.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-text-muted">Where to focus</p>
                  <ul className="mt-1 space-y-1.5">
                    {focus.map((c, i) => (
                      <li key={i} className="text-text-secondary">
                        <span className="font-medium text-text-primary">
                          {clauseTypeLabel(c.clauseType)}
                        </span>
                        <span className="ml-2 font-mono text-xs text-text-muted">
                          {c.sectionNumber} · {c.dimensions[dimensionKey]}/5
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {score < 5 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-text-muted">
                    Recommended next step
                  </p>
                  <p className="mt-1 text-text-secondary">{guide.nextStep}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Expandable dimension scores with rubric anchors and the evaluator's evidence-backed rationale. */
export function DimensionAccordion({
  dimensions,
  rationales,
  clauseScores,
}: {
  dimensions: EvaluateOutput['dimensions']
  rationales: EvaluateOutput['dimensionRationales']
  clauseScores?: EvaluateOutput['clauseScores']
}): React.ReactElement {
  const [open, setOpen] = useState<Set<DimensionKey>>(new Set())
  function toggle(key: DimensionKey): void {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  return (
    <div className="space-y-1">
      {DIMENSION_GUIDE.map((d) => (
        <Row
          key={d.key}
          dimensionKey={d.key}
          score={dimensions[d.key]}
          rationale={rationales[d.key] ?? ''}
          clauseScores={clauseScores}
          expanded={open.has(d.key)}
          onToggle={() => toggle(d.key)}
        />
      ))}
    </div>
  )
}

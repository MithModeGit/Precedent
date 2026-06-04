'use client'

import { useMemo, useState } from 'react'
import type { Decision } from '@/types'
import { clauseTypeLabel } from '@/lib/clause-labels'
import { useSession } from '@/components/review/SessionContext'

const DECISION_CLASSES: Record<Decision, string> = {
  accepted: 'bg-nice-bg text-nice',
  modified: 'bg-confident-bg text-confident',
  rejected: 'bg-surface-raised text-text-secondary',
  skipped: 'bg-should-bg text-should',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function RunningLog(): React.ReactElement {
  const { clauses, decisions } = useSession()
  const [open, setOpen] = useState(false)

  const entries = useMemo(() => {
    return clauses
      .map((clause) => ({ clause, state: decisions[clause.id] }))
      .filter((e) => e.state?.decision && e.state.decidedAt)
      .sort((a, b) => (b.state!.decidedAt! > a.state!.decidedAt! ? 1 : -1))
  }, [clauses, decisions])

  return (
    <div className="flex h-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-8 shrink-0 items-center justify-center border-l border-border bg-surface-raised text-xs font-medium text-text-secondary [writing-mode:vertical-rl]"
      >
        {open ? 'Close log' : 'Activity log'}
      </button>
      {open && (
        <div className="w-72 shrink-0 overflow-y-auto border-l border-border bg-surface p-4">
          <p className="mb-3 font-sans text-sm font-semibold uppercase tracking-widest text-text-secondary">
            Activity
          </p>
          {entries.length === 0 ? (
            <p className="text-xs text-text-muted">No decisions yet.</p>
          ) : (
            <ul className="space-y-3">
              {entries.map(({ clause, state }) => (
                <li key={clause.id} className="border-b border-border-subtle pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-primary">
                      {clauseTypeLabel(clause.clauseType)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                        DECISION_CLASSES[state!.decision!]
                      }`}
                    >
                      {state!.decision}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-text-muted">
                    {clause.sectionNumber} · {state!.decidedAt ? formatTime(state!.decidedAt) : ''}
                  </p>
                  {state!.decision === 'modified' && state!.acceptedText && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-text-secondary">
                      Changed to: {state!.acceptedText}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import type { Priority } from '@/types'
import { clauseTypeLabel } from '@/lib/clause-labels'
import { useSession, isResolved } from '@/components/review/SessionContext'

// Strong border when unresolved; lighter token when resolved (avoids opacity modifiers
// on hex var() colors, which Tailwind v3 renders as invalid CSS).
const BORDER_ACTIVE: Record<Priority, string> = {
  must: 'border-l-must',
  should: 'border-l-should',
  nice: 'border-l-nice',
}
const BORDER_RESOLVED: Record<Priority, string> = {
  must: 'border-l-must-border',
  should: 'border-l-should-border',
  nice: 'border-l-nice-border',
}

export function DocumentPanel(): React.ReactElement {
  const { clauses, decisions, currentClauseId, setCurrentClauseId } = useSession()

  const documentOrder = useMemo(
    () => [...clauses].sort((a, b) => a.displayOrder - b.displayOrder),
    [clauses],
  )

  return (
    <div className="h-full overflow-y-auto bg-surface p-6">
      <p className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-text-secondary">
        Document
      </p>
      <div className="space-y-4">
        {documentOrder.map((clause) => {
          const resolved = isResolved(decisions[clause.id]?.decision ?? null)
          const isActive = clause.id === currentClauseId
          const border = resolved ? BORDER_RESOLVED[clause.priority] : BORDER_ACTIVE[clause.priority]
          return (
            <button
              key={clause.id}
              type="button"
              onClick={() => setCurrentClauseId(clause.id)}
              className={`block w-full border-l-2 pl-3 text-left transition-colors ${border} ${
                isActive ? 'bg-surface-raised' : 'hover:bg-surface-raised'
              }`}
            >
              <p className="font-sans text-xs font-medium text-text-secondary">
                {clauseTypeLabel(clause.clauseType)}
                <span className="ml-2 font-mono text-text-muted">{clause.sectionNumber}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap font-mono text-xs leading-5 text-text-primary">
                {clause.originalText}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

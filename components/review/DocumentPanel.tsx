'use client'

import { motion } from 'framer-motion'
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
  const { orderedClauses, decisions, currentClauseId, setCurrentClauseId, sortOrder } = useSession()

  return (
    <div className="h-full overflow-y-auto bg-surface p-6">
      <p className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-text-secondary">
        Clauses
        <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-text-muted">
          ({sortOrder === 'priority' ? 'priority order' : 'document order'})
        </span>
      </p>
      <motion.div layout className="space-y-4">
        {orderedClauses.map((clause) => {
          const resolved = isResolved(decisions[clause.id]?.decision ?? null)
          const isActive = clause.id === currentClauseId
          const border = resolved ? BORDER_RESOLVED[clause.priority] : BORDER_ACTIVE[clause.priority]
          return (
            <motion.button
              layout
              key={clause.id}
              type="button"
              transition={{ duration: 0.25, ease: 'easeOut' }}
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
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}

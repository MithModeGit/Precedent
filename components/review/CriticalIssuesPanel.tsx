'use client'

import { useState } from 'react'
import { clauseTypeLabel } from '@/lib/clause-labels'
import { useSession, isResolved } from '@/components/review/SessionContext'

export function CriticalIssuesPanel(): React.ReactElement | null {
  const { clauses, decisions, setCurrentClauseId } = useSession()
  const [collapsed, setCollapsed] = useState(false)

  const unresolvedMust = clauses.filter(
    (c) => c.priority === 'must' && !isResolved(decisions[c.id]?.decision ?? null),
  )

  // Auto-hide when every Must-Address redline has been resolved.
  if (unresolvedMust.length === 0) return null

  const count = unresolvedMust.length
  return (
    <div className="border-b border-must-border bg-must-bg px-6 py-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-must">
          {count} {count === 1 ? 'issue requires' : 'issues require'} attention before this document
          can be sent.
        </p>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="text-xs font-medium text-must"
          aria-label={collapsed ? 'Expand critical issues' : 'Collapse critical issues'}
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>
      {!collapsed && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {unresolvedMust.map((clause) => (
            <li key={clause.id}>
              <button
                type="button"
                onClick={() => setCurrentClauseId(clause.id)}
                className="text-xs text-must underline underline-offset-2"
              >
                {clauseTypeLabel(clause.clauseType)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

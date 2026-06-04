'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ClauseReview, Decision } from '@/types'
import type { EvaluateOutput } from '@/schemas/evaluate'
import { sortClauses, type SortOrder } from '@/lib/clause-ordering'

export interface ClauseDecisionState {
  decision: Decision | null
  acceptedText: string | null
  decidedAt: string | null
}

/** A decision counts as resolved (toward progress and critical issues) when it is a
 * final action. Skipped and null are deferred, not resolved. */
export function isResolved(decision: Decision | null): boolean {
  return decision === 'accepted' || decision === 'modified' || decision === 'rejected'
}

interface SessionContextValue {
  sessionId: string
  clauses: ClauseReview[]
  orderedClauses: ClauseReview[]
  decisions: Record<string, ClauseDecisionState>
  setDecision: (clauseId: string, decision: Decision, acceptedText?: string | null) => void
  currentClauseId: string | null
  setCurrentClauseId: (id: string) => void
  sortOrder: SortOrder
  setSortOrder: (order: SortOrder) => void
  evalResults: EvaluateOutput | null
  setEvalResults: (results: EvaluateOutput) => void
  resolvedCount: number
}

const SessionContext = createContext<SessionContextValue | null>(null)

async function persistDecision(
  clauseId: string,
  decision: Decision,
  acceptedText: string | null,
): Promise<void> {
  try {
    const res = await fetch(`/api/clause-reviews/${clauseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, acceptedText }),
    })
    if (!res.ok) console.error(`Failed to persist decision for clause ${clauseId}`)
  } catch (error) {
    console.error(`Error persisting decision: ${error instanceof Error ? error.message : 'unknown'}`)
  }
}

export function SessionProvider({
  sessionId,
  clauses,
  children,
}: {
  sessionId: string
  clauses: ClauseReview[]
  children: ReactNode
}): React.ReactElement {
  const [decisions, setDecisions] = useState<Record<string, ClauseDecisionState>>(() => {
    const initial: Record<string, ClauseDecisionState> = {}
    for (const clause of clauses) {
      initial[clause.id] = {
        decision: clause.decision,
        acceptedText: clause.acceptedText,
        decidedAt: clause.decidedAt ?? null,
      }
    }
    return initial
  })
  const [sortOrder, setSortOrder] = useState<SortOrder>('priority')
  const [evalResults, setEvalResults] = useState<EvaluateOutput | null>(null)

  const orderedClauses = useMemo(
    () => sortClauses(clauses, sortOrder),
    [clauses, sortOrder],
  )

  const [currentClauseId, setCurrentClauseId] = useState<string | null>(
    orderedClauses[0]?.id ?? null,
  )

  const setDecision = useCallback(
    (clauseId: string, decision: Decision, acceptedText: string | null = null) => {
      const updated = {
        ...decisions,
        [clauseId]: { decision, acceptedText, decidedAt: new Date().toISOString() },
      }
      setDecisions(updated)
      void persistDecision(clauseId, decision, acceptedText)

      // Auto-advance to the next clause that is not yet finally resolved.
      const idx = orderedClauses.findIndex((c) => c.id === clauseId)
      const next = orderedClauses
        .slice(idx + 1)
        .find((c) => !isResolved(updated[c.id]?.decision ?? null))
      if (next) setCurrentClauseId(next.id)
    },
    [decisions, orderedClauses],
  )

  const resolvedCount = useMemo(
    () => Object.values(decisions).filter((d) => isResolved(d.decision)).length,
    [decisions],
  )

  const value: SessionContextValue = {
    sessionId,
    clauses,
    orderedClauses,
    decisions,
    setDecision,
    currentClauseId,
    setCurrentClauseId,
    sortOrder,
    setSortOrder,
    evalResults,
    setEvalResults,
    resolvedCount,
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionProvider')
  return ctx
}

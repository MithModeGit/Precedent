import type { ClauseReview, Priority } from '@/types'

export type SortOrder = 'priority' | 'document'

const PRIORITY_RANK: Record<Priority, number> = { must: 0, should: 1, nice: 2 }

/**
 * Orders clauses for display.
 * - priority: Must, then Should, then Nice; original document order within each tier.
 * - document: the sequence in which clauses appear in the NDA (display_order).
 */
export function sortClauses(clauses: ClauseReview[], order: SortOrder): ClauseReview[] {
  const copy = [...clauses]
  if (order === 'document') {
    return copy.sort((a, b) => a.displayOrder - b.displayOrder)
  }
  return copy.sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.displayOrder - b.displayOrder,
  )
}

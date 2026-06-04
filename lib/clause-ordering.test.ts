import { describe, it, expect } from 'vitest'
import { sortClauses } from '@/lib/clause-ordering'
import type { ClauseReview, Priority } from '@/types'

function makeClause(id: string, priority: Priority, displayOrder: number): ClauseReview {
  return {
    id,
    clauseType: 'obligations',
    sectionNumber: String(displayOrder),
    priority,
    originalText: '',
    proposedText: '',
    rationale: '',
    citation: '',
    counterpartyPrediction: '',
    noActionNeeded: false,
    decision: null,
    acceptedText: null,
    decidedAt: null,
    displayOrder,
  }
}

describe('sortClauses: document order', () => {
  it('orders by displayOrder regardless of priority', () => {
    const out = sortClauses(
      [makeClause('a', 'nice', 2), makeClause('b', 'must', 0), makeClause('c', 'should', 1)],
      'document',
    )
    expect(out.map((c) => c.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('sortClauses: priority order', () => {
  it('orders must, then should, then nice, preserving document order within each tier', () => {
    const clauses = [
      makeClause('n1', 'nice', 0),
      makeClause('m1', 'must', 1),
      makeClause('s1', 'should', 2),
      makeClause('m2', 'must', 3),
      makeClause('n2', 'nice', 4),
    ]
    expect(sortClauses(clauses, 'priority').map((c) => c.id)).toEqual(['m1', 'm2', 's1', 'n1', 'n2'])
  })

  it('does not mutate the input array', () => {
    const input = [makeClause('a', 'nice', 1), makeClause('b', 'must', 0)]
    sortClauses(input, 'priority')
    expect(input.map((c) => c.id)).toEqual(['a', 'b'])
  })
})

import { describe, it, expect } from 'vitest'
import { pairScoreReviewIds } from '@/lib/eval-pairing'

const reviews = [
  { id: 'r1', clause_type: 'definition_of_ci', section_number: '2' },
  { id: 'r2', clause_type: 'exclusions', section_number: '3' },
  { id: 'r3', clause_type: 'non_solicitation', section_number: '8' },
]

describe('pairScoreReviewIds', () => {
  it('matches by key when types and sections line up', () => {
    const scores = [
      { clauseType: 'definition_of_ci', sectionNumber: '2' },
      { clauseType: 'exclusions', sectionNumber: '3' },
      { clauseType: 'non_solicitation', sectionNumber: '8' },
    ]
    expect(pairScoreReviewIds(scores, reviews)).toEqual(['r1', 'r2', 'r3'])
  })

  it('matches by key even when scores arrive out of order', () => {
    const scores = [
      { clauseType: 'non_solicitation', sectionNumber: '8' },
      { clauseType: 'definition_of_ci', sectionNumber: '2' },
    ]
    expect(pairScoreReviewIds(scores, reviews)).toEqual(['r3', 'r1'])
  })

  it('does not shift the others when the model skips a clause (key still matches the right one)', () => {
    // Model returned scores for the 1st and 3rd review only, in order.
    const scores = [
      { clauseType: 'definition_of_ci', sectionNumber: '2' },
      { clauseType: 'non_solicitation', sectionNumber: '8' },
    ]
    expect(pairScoreReviewIds(scores, reviews)).toEqual(['r1', 'r3'])
  })

  it('falls back to order when the section format drifts', () => {
    const scores = [
      { clauseType: 'definition_of_ci', sectionNumber: 'Section 2' },
      { clauseType: 'exclusions', sectionNumber: 'Section 3' },
      { clauseType: 'non_solicitation', sectionNumber: 'Section 8' },
    ]
    // No key matches; positional fallback assigns them in order.
    expect(pairScoreReviewIds(scores, reviews)).toEqual(['r1', 'r2', 'r3'])
  })

  it('returns null for extra scores beyond the available reviews', () => {
    const scores = [
      { clauseType: 'definition_of_ci', sectionNumber: '2' },
      { clauseType: 'exclusions', sectionNumber: '3' },
      { clauseType: 'non_solicitation', sectionNumber: '8' },
      { clauseType: 'residuals', sectionNumber: '9' },
    ]
    expect(pairScoreReviewIds(scores, reviews)).toEqual(['r1', 'r2', 'r3', null])
  })
})

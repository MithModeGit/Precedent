interface ScoreKey {
  clauseType: string
  sectionNumber: string
}

interface ReviewKey {
  id: string
  clause_type: string
  section_number: string
}

function normalizeKey(clauseType: string, sectionNumber: string): string {
  return `${clauseType}|${(sectionNumber ?? '').trim().toLowerCase().replace(/\s+/g, ' ')}`
}

/**
 * Pairs each per-clause eval score to a clause-review id, returning an array of ids aligned
 * to the scores (null where no pairing is possible). Hybrid strategy, robust to both the
 * model echoing a slightly different section format and the model skipping or adding a clause:
 *  1. Key match (clause type + normalized section number) against an unused review.
 *  2. For any score still unmatched, fall back to the next unused review in order.
 * A failed key match never shifts the others, so a single omission or addition cannot
 * silently corrupt the rest of the pairings.
 */
export function pairScoreReviewIds(
  scores: ScoreKey[],
  reviews: ReviewKey[],
): (string | null)[] {
  const used = new Array(reviews.length).fill(false)
  const result: (string | null)[] = new Array(scores.length).fill(null)

  scores.forEach((cs, i) => {
    const key = normalizeKey(cs.clauseType, cs.sectionNumber)
    const idx = reviews.findIndex(
      (r, j) => !used[j] && normalizeKey(r.clause_type, r.section_number) === key,
    )
    if (idx >= 0) {
      used[idx] = true
      result[i] = reviews[idx]!.id
    }
  })

  let nextFree = 0
  scores.forEach((cs, i) => {
    if (result[i] !== null) return
    while (nextFree < reviews.length && used[nextFree]) nextFree++
    if (nextFree < reviews.length) {
      used[nextFree] = true
      result[i] = reviews[nextFree]!.id
      nextFree++
    }
  })

  return result
}

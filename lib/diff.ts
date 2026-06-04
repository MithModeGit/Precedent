import { diff_match_patch } from 'diff-match-patch'

export type DiffOp = 'equal' | 'delete' | 'insert'

export interface DiffSegment {
  op: DiffOp
  text: string
}

const dmp = new diff_match_patch()

/**
 * Character-level diff between the original and proposed text, cleaned for
 * readability. Deletions and insertions render in the diff colors per DESIGN_BRIEF.
 */
export function computeDiff(original: string, proposed: string): DiffSegment[] {
  const diffs = dmp.diff_main(original, proposed)
  dmp.diff_cleanupSemantic(diffs)
  return diffs.map(([op, text]) => ({
    op: op === -1 ? 'delete' : op === 1 ? 'insert' : 'equal',
    text,
  }))
}

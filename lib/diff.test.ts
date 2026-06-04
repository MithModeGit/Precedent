import { describe, it, expect } from 'vitest'
import { computeDiff } from '@/lib/diff'

describe('computeDiff', () => {
  it('returns a single equal segment for identical text', () => {
    expect(computeDiff('hello world', 'hello world')).toEqual([{ op: 'equal', text: 'hello world' }])
  })

  it('captures a pure insertion and nothing deleted', () => {
    const segs = computeDiff('abc', 'abcdef')
    expect(segs.filter((s) => s.op === 'insert').map((s) => s.text).join('')).toBe('def')
    expect(segs.some((s) => s.op === 'delete')).toBe(false)
  })

  it('captures a pure deletion and nothing inserted', () => {
    const segs = computeDiff('abcdef', 'abc')
    expect(segs.filter((s) => s.op === 'delete').map((s) => s.text).join('')).toBe('def')
    expect(segs.some((s) => s.op === 'insert')).toBe(false)
  })

  it('records both a deletion and an insertion for a substitution', () => {
    const segs = computeDiff('the cat sat', 'the dog sat')
    expect(segs.some((s) => s.op === 'delete')).toBe(true)
    expect(segs.some((s) => s.op === 'insert')).toBe(true)
    expect(segs.some((s) => s.op === 'equal' && s.text.includes('the'))).toBe(true)
    expect(segs.some((s) => s.op === 'equal' && s.text.includes('sat'))).toBe(true)
  })
})

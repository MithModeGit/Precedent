'use client'

import { useEffect, useState } from 'react'
import type { ClauseReview, ConfidenceSignal } from '@/types'
import { PriorityBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { clauseTypeLabel } from '@/lib/clause-labels'
import { computeDiff } from '@/lib/diff'
import { useSession } from '@/components/review/SessionContext'

const SIGNAL_LABEL: Record<ConfidenceSignal, string> = {
  confident: 'Confident',
  review_needed: 'Review Needed',
  low_confidence: 'Low Confidence',
}

const SIGNAL_CLASSES: Record<ConfidenceSignal, { dot: string; text: string }> = {
  confident: { dot: 'bg-confident', text: 'text-confident' },
  review_needed: { dot: 'bg-review', text: 'text-review' },
  low_confidence: { dot: 'bg-low-confidence', text: 'text-low-confidence' },
}

function ConfidenceBadge({ signal }: { signal: ConfidenceSignal | null }): React.ReactElement {
  if (!signal) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--color-brand-navy)_30%,transparent)]" />
        Computing...
      </span>
    )
  }
  const classes = SIGNAL_CLASSES[signal]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${classes.text}`}>
      <span className={`h-2 w-2 rounded-full ${classes.dot}`} />
      {SIGNAL_LABEL[signal]}
    </span>
  )
}

function DiffView({ original, proposed }: { original: string; proposed: string }): React.ReactElement {
  const segments = computeDiff(original, proposed)
  return (
    <p className="whitespace-pre-wrap font-mono text-sm leading-6">
      {segments.map((seg, i) => {
        if (seg.op === 'delete') {
          return (
            <span key={i} className="bg-diff-delete-bg text-diff-delete line-through">
              {seg.text}
            </span>
          )
        }
        if (seg.op === 'insert') {
          return (
            <span key={i} className="bg-diff-insert-bg text-diff-insert underline">
              {seg.text}
            </span>
          )
        }
        return <span key={i}>{seg.text}</span>
      })}
    </p>
  )
}

export function RedlineCard({ clause }: { clause: ClauseReview }): React.ReactElement {
  const { decisions, setDecision, evalResults } = useSession()
  const state = decisions[clause.id]
  const decision = state?.decision ?? null

  const [isModifying, setIsModifying] = useState(false)
  const [draft, setDraft] = useState(clause.proposedText)
  const [debouncedDraft, setDebouncedDraft] = useState(clause.proposedText)
  const [showPrediction, setShowPrediction] = useState(false)

  // Reset local state when the active clause changes.
  useEffect(() => {
    setIsModifying(false)
    setDraft(clause.acceptedText ?? clause.proposedText)
    setDebouncedDraft(clause.acceptedText ?? clause.proposedText)
    setShowPrediction(false)
  }, [clause.id, clause.acceptedText, clause.proposedText])

  // Debounce the live diff while editing (300ms).
  useEffect(() => {
    if (!isModifying) return
    const t = setTimeout(() => setDebouncedDraft(draft), 300)
    return () => clearTimeout(t)
  }, [draft, isModifying])

  const evalScore = evalResults?.clauseScores.find(
    (s) => s.clauseType === clause.clauseType && s.sectionNumber === clause.sectionNumber,
  )
  const signal: ConfidenceSignal | null = evalScore?.confidenceSignal ?? null

  return (
    <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
      <p className="font-sans text-sm font-semibold uppercase tracking-widest text-text-secondary">
        {clauseTypeLabel(clause.clauseType)}
        <span className="ml-2 font-mono lowercase tracking-normal text-text-muted">
          Section {clause.sectionNumber}
        </span>
      </p>

      <div className="mt-3 flex items-center gap-3">
        <PriorityBadge priority={clause.priority} />
        <ConfidenceBadge signal={signal} />
        {decision && (
          <span className="ml-auto text-xs capitalize text-text-secondary">{decision}</span>
        )}
      </div>

      <div className="mt-4 border-t border-border-subtle pt-4">
        {isModifying ? (
          <div>
            <p className="mb-1 text-xs uppercase tracking-widest text-text-muted">Original</p>
            <p className="mb-3 whitespace-pre-wrap rounded-md bg-surface-raised p-3 font-mono text-sm leading-6 text-text-secondary">
              {clause.originalText}
            </p>
            <label className="mb-1 block text-xs uppercase tracking-widest text-text-muted">
              Your edit
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-border bg-surface p-3 font-mono text-sm leading-6 focus:border-navy focus:outline-none"
            />
            <p className="mb-1 mt-3 text-xs uppercase tracking-widest text-text-muted">Preview</p>
            <div className="rounded-md bg-surface-raised p-3">
              <DiffView original={clause.originalText} proposed={debouncedDraft} />
            </div>
            <div className="mt-4 flex gap-3">
              <Button onClick={() => setDecision(clause.id, 'modified', draft)}>Confirm Edit</Button>
              <Button variant="tertiary" onClick={() => setIsModifying(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <DiffView original={clause.originalText} proposed={clause.proposedText} />
        )}
      </div>

      {!isModifying && (
        <>
          <div className="mt-4 border-t border-border-subtle pt-4">
            <p className="text-sm leading-6 text-text-primary">{clause.rationale}</p>
            <p className="mt-2 font-mono text-xs text-text-secondary">{clause.citation}</p>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowPrediction((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-navy"
            >
              <span>{showPrediction ? '⌄' : '›'}</span>
              Expected counterparty response
            </button>
            {showPrediction && (
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {clause.counterpartyPrediction}
              </p>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              className="flex-1"
              onClick={() => setDecision(clause.id, 'accepted', clause.proposedText)}
            >
              Accept
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setIsModifying(true)}>
              Modify
            </Button>
            <Button
              variant="tertiary"
              className="flex-1"
              onClick={() => setDecision(clause.id, 'rejected', null)}
            >
              Reject
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setDecision(clause.id, 'skipped', null)}
            className="mt-3 text-xs text-text-muted hover:text-text-secondary"
          >
            Skip for now
          </button>
        </>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import type { Decision, Priority } from '@/types'
import type { EvaluateOutput } from '@/schemas/evaluate'
import { clauseTypeLabel } from '@/lib/clause-labels'
import { computeDiff } from '@/lib/diff'
import { DIMENSION_GUIDE, type DimensionKey } from '@/lib/dimension-guide'
import { PriorityBadge } from '@/components/ui/Badge'
import { ScoreBadge } from '@/components/dashboard/shared'
import { DimensionAccordion } from '@/components/eval/DimensionAccordion'
import { CoverageSection } from '@/components/eval/CoverageSection'

const CHECKS = [
  { key: 'dtsaNotice', label: 'DTSA Notice' },
  { key: 'california1660', label: 'California §16600' },
  { key: 'tradeSecretBifurcation', label: 'Trade Secret Bifurcation' },
  { key: 'aiTrainingCarveout', label: 'AI Training Carve-out' },
  { key: 'internalConsistency', label: 'Internal Consistency' },
] as const

export interface DetailClause {
  clauseType: EvaluateOutput['clauseScores'][number]['clauseType']
  sectionNumber: string
  priority: Priority
  decision: Decision | null
  originalText: string
  proposedText: string
  acceptedText: string | null
  dimensions: EvaluateOutput['dimensions'] | null
  clauseOverallScore: number | null
  evaluatorNote: string | null
}

export interface SessionDetailData {
  documentName: string
  documentType: string
  governingLaw: string
  mode: string
  partyPerspective: string
  createdAt: string
  evalRun: EvaluateOutput | null
  clauses: DetailClause[]
}

function DecisionBadge({ decision }: { decision: Decision | null }): React.ReactElement {
  const label = decision ?? 'pending'
  const cls =
    decision === 'accepted'
      ? 'bg-nice-bg text-nice'
      : decision === 'modified'
        ? 'bg-confident-bg text-confident'
        : decision === 'rejected'
          ? 'bg-surface-raised text-text-secondary'
          : 'bg-should-bg text-should'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{label}</span>
  )
}

function DiffView({ original, proposed }: { original: string; proposed: string }): React.ReactElement {
  return (
    <p className="whitespace-pre-wrap rounded-md bg-surface-raised p-3 font-mono text-xs leading-5">
      {computeDiff(original, proposed).map((seg, i) => {
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

/** The lowest-scoring dimension for a clause, to highlight where it is weakest. */
function weakestDimension(dimensions: EvaluateOutput['dimensions']): DimensionKey {
  return DIMENSION_GUIDE.reduce(
    (lowest, d) => (dimensions[d.key] < dimensions[lowest] ? d.key : lowest),
    DIMENSION_GUIDE[0]!.key,
  )
}

function ClauseRow({ clause }: { clause: DetailClause }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const weakest = clause.dimensions ? weakestDimension(clause.dimensions) : null
  return (
    <div className="border-b border-border-subtle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
      >
        <span className="text-text-muted">{open ? '⌄' : '›'}</span>
        <span className="flex-1 text-sm text-text-primary">
          {clauseTypeLabel(clause.clauseType)}
          <span className="ml-2 font-mono text-xs text-text-muted">{clause.sectionNumber}</span>
        </span>
        <PriorityBadge priority={clause.priority} />
        <DecisionBadge decision={clause.decision} />
        <ScoreBadge score={clause.clauseOverallScore} />
      </button>
      {open && (
        <div className="space-y-4 pb-4 pl-6">
          <div>
            <p className="mb-1 text-xs uppercase tracking-widest text-text-muted">AI redline</p>
            <DiffView original={clause.originalText} proposed={clause.proposedText} />
          </div>

          {clause.dimensions && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-text-muted">
                Dimension scores
              </p>
              <div className="space-y-1.5">
                {DIMENSION_GUIDE.map((d) => {
                  const score = clause.dimensions![d.key]
                  const isWeak = d.key === weakest && score < 5
                  return (
                    <div key={d.key} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 text-xs text-text-secondary">
                        {d.label}
                        {isWeak && (
                          <span className="ml-1.5 rounded-full bg-must-bg px-1.5 text-[10px] text-must">
                            weakest
                          </span>
                        )}
                      </span>
                      <span className="h-2 flex-1 rounded-full bg-surface-raised">
                        <span
                          className={`block h-2 rounded-full ${isWeak ? 'bg-must' : 'bg-navy'}`}
                          style={{ width: `${(score / 5) * 100}%` }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right font-mono text-xs text-text-primary">
                        {score}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {clause.evaluatorNote && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-widest text-text-muted">
                Evaluator assessment
              </p>
              <p className="text-sm leading-6 text-text-secondary">{clause.evaluatorNote}</p>
            </div>
          )}

          {clause.decision === 'modified' && clause.acceptedText && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-widest text-text-muted">
                Lawyer&apos;s accepted edit
              </p>
              <p className="whitespace-pre-wrap rounded-md bg-surface-raised p-3 font-mono text-xs leading-5">
                {clause.acceptedText}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function SessionDetail({ data }: { data: SessionDetailData }): React.ReactElement {
  const evalRun = data.evalRun
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-normal text-text-primary">
            {data.documentName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {new Date(data.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'UTC',
            })}{' '}
            · {data.documentType} · {data.governingLaw} · {data.mode} · {data.partyPerspective}
          </p>
        </div>
        <ScoreBadge score={evalRun?.overallScore ?? null} />
      </div>

      {evalRun ? (
        <>
          <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-secondary">
              Compliance checks
            </p>
            <ul className="space-y-2">
              {CHECKS.map((c) => {
                const check = evalRun.binaryChecks[c.key]
                const pass = check.result === 'PASS'
                return (
                  <li
                    key={c.key}
                    className="flex items-start justify-between border-b border-border-subtle pb-2"
                  >
                    <div>
                      <span className="text-sm text-text-primary">{c.label}</span>
                      <p className="text-xs text-text-secondary">{check.note}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        pass ? 'bg-nice-bg text-nice' : 'bg-must-bg text-must'
                      }`}
                    >
                      {check.result}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
            <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-text-secondary">
              Dimension scores
            </p>
            <p className="mb-4 text-xs text-text-muted">
              Select a dimension to see what it measures, what the score level means, and the
              evaluator&apos;s evidence for this document.
            </p>
            <DimensionAccordion
              dimensions={evalRun.dimensions}
              rationales={evalRun.dimensionRationales}
              clauseScores={evalRun.clauseScores}
            />
          </div>

          {evalRun.issueCoverage && (
            <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
              <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-text-secondary">
                Issue coverage
              </p>
              <p className="mb-4 text-xs text-text-muted">
                Precision measures the quality of the redlines made; coverage measures how many of
                the material issues in the document they caught. The overall score is a
                recall-weighted F-score of the two.
              </p>
              <CoverageSection dimensions={evalRun.dimensions} issueCoverage={evalRun.issueCoverage} />
            </div>
          )}

          {evalRun.improvementNotes.length > 0 && (
            <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-secondary">
                Improvement notes
              </p>
              <div className="space-y-2">
                {evalRun.improvementNotes.map((note, i) => (
                  <blockquote
                    key={i}
                    className="border-l-2 border-border pl-3 text-sm leading-6 text-text-secondary"
                  >
                    {note}
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-text-secondary">Evaluation has not finished for this session.</p>
      )}

      <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-text-secondary">
          Clause breakdown
        </p>
        {data.clauses.map((clause) => (
          <ClauseRow key={`${clause.clauseType}-${clause.sectionNumber}`} clause={clause} />
        ))}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import type { Decision, Priority } from '@/types'
import type { EvaluateOutput } from '@/schemas/evaluate'
import { clauseTypeLabel } from '@/lib/clause-labels'
import { PriorityBadge } from '@/components/ui/Badge'
import { ScoreBadge, DimensionBar } from '@/components/dashboard/shared'

const DIMENSIONS = [
  { key: 'legalAccuracy', label: 'Legal Accuracy' },
  { key: 'marketCalibration', label: 'Market Calibration' },
  { key: 'redlinePrecision', label: 'Redline Precision' },
  { key: 'explanationQuality', label: 'Explanation Quality' },
  { key: 'proportionality', label: 'Proportionality' },
] as const

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

function ClauseRow({ clause }: { clause: DetailClause }): React.ReactElement {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border-subtle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 py-3 text-left"
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
        <div className="space-y-3 pb-4 pl-6">
          {clause.dimensions && (
            <div className="space-y-2">
              {DIMENSIONS.map((d) => (
                <DimensionBar key={d.key} label={d.label} score={clause.dimensions![d.key]} />
              ))}
            </div>
          )}
          {clause.evaluatorNote && (
            <p className="text-sm text-text-secondary">{clause.evaluatorNote}</p>
          )}
          {clause.decision === 'modified' && clause.acceptedText && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs uppercase tracking-widest text-text-muted">AI proposed</p>
                <p className="whitespace-pre-wrap rounded-md bg-surface-raised p-3 font-mono text-xs leading-5">
                  {clause.proposedText}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-widest text-text-muted">
                  Lawyer accepted
                </p>
                <p className="whitespace-pre-wrap rounded-md bg-surface-raised p-3 font-mono text-xs leading-5">
                  {clause.acceptedText}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function SessionDetail({ data }: { data: SessionDetailData }): React.ReactElement {
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
            })}{' '}
            · {data.documentType} · {data.governingLaw} · {data.mode} · {data.partyPerspective}
          </p>
        </div>
        <ScoreBadge score={data.evalRun?.overallScore ?? null} />
      </div>

      {data.evalRun ? (
        <>
          <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-secondary">
              Compliance checks
            </p>
            <ul className="space-y-2">
              {CHECKS.map((c) => {
                const check = data.evalRun!.binaryChecks[c.key]
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
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
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
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-secondary">
              Dimension scores
            </p>
            <div className="space-y-3">
              {DIMENSIONS.map((d) => (
                <DimensionBar key={d.key} label={d.label} score={data.evalRun!.dimensions[d.key]} />
              ))}
            </div>
          </div>

          {data.evalRun.improvementNotes.length > 0 && (
            <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-secondary">
                Improvement notes
              </p>
              <div className="space-y-2">
                {data.evalRun.improvementNotes.map((note, i) => (
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

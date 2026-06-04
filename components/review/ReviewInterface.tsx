'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import type { ClauseReview, ReviewSession } from '@/types'
import { Button } from '@/components/ui/Button'
import { SessionProvider, useSession, isResolved } from '@/components/review/SessionContext'
import { DocumentPanel } from '@/components/review/DocumentPanel'
import { RedlineCard } from '@/components/review/RedlineCard'
import { CriticalIssuesPanel } from '@/components/review/CriticalIssuesPanel'
import { RunningLog } from '@/components/review/RunningLog'
import { QualityReport } from '@/components/review/QualityReport'
import type { SortOrder } from '@/lib/clause-ordering'

const PERSPECTIVE_LABEL = { disclosing: 'Disclosing Party', receiving: 'Receiving Party' } as const

function SortToggle(): React.ReactElement {
  const { sortOrder, setSortOrder } = useSession()
  const options: { value: SortOrder; label: string }[] = [
    { value: 'priority', label: 'Priority Order' },
    { value: 'document', label: 'Document Order' },
  ]
  return (
    <div className="inline-flex rounded-md border border-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setSortOrder(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium first:rounded-l-md last:rounded-r-md ${
            sortOrder === opt.value ? 'bg-navy text-surface' : 'bg-surface text-text-secondary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Header({ session }: { session: ReviewSession }): React.ReactElement {
  const { clauses, decisions, resolvedCount } = useSession()
  const [exporting, setExporting] = useState(false)

  const unreviewedCount = clauses.filter(
    (c) => !isResolved(decisions[c.id]?.decision ?? null),
  ).length

  async function handleExport(): Promise<void> {
    if (
      unreviewedCount > 0 &&
      !window.confirm(`You have ${unreviewedCount} unreviewed redlines. Export anyway?`)
    ) {
      return
    }
    setExporting(true)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })
      if (!res.ok) {
        window.alert('The document could not be generated. Wait a moment and try exporting again.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${session.documentName.replace(/\.[^.]+$/, '')}-redlined.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      window.alert('The document could not be generated. Wait a moment and try exporting again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <header className="flex items-center gap-4 border-b border-border bg-surface px-6 py-3">
      <Link
        href="/"
        className="font-display text-lg text-text-primary transition-colors hover:text-navy"
        aria-label="Go to home"
      >
        Precedent
      </Link>
      <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
      <span className="text-sm font-medium text-text-primary">
        Reviewed {resolvedCount} of {clauses.length} redlines
      </span>
      <div className="mx-auto">
        <SortToggle />
      </div>
      <span className="hidden text-xs text-text-secondary lg:inline">
        {session.documentName} · {session.mode} · {PERSPECTIVE_LABEL[session.partyPerspective]}
      </span>
      <Button onClick={handleExport} disabled={exporting}>
        {exporting ? 'Preparing...' : 'Export Document'}
      </Button>
    </header>
  )
}

function ActiveCard(): React.ReactElement {
  const { orderedClauses, currentClauseId } = useSession()
  const active = useMemo(
    () => orderedClauses.find((c) => c.id === currentClauseId) ?? orderedClauses[0] ?? null,
    [orderedClauses, currentClauseId],
  )

  if (!active) {
    return (
      <div className="p-6 text-sm text-text-secondary">
        No redlines were generated for this document.
      </div>
    )
  }

  return (
    <div className="overflow-y-auto p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          <RedlineCard clause={active} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

type RightTab = 'redlines' | 'quality'

function RightPanel(): React.ReactElement {
  const [tab, setTab] = useState<RightTab>('redlines')
  const tabs: { value: RightTab; label: string }[] = [
    { value: 'redlines', label: 'Redlines' },
    { value: 'quality', label: 'Quality Report' },
  ]
  return (
    <div className="flex min-h-0 w-3/5 min-w-0 flex-col">
      <div className="flex gap-4 border-b border-border bg-surface px-6">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`-mb-px border-b-2 py-2 text-sm font-medium ${
              tab === t.value
                ? 'border-navy text-text-primary'
                : 'border-transparent text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'redlines' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <CriticalIssuesPanel />
          <ActiveCard />
        </div>
      ) : (
        <QualityReport />
      )}
    </div>
  )
}

export function ReviewInterface({
  session,
  clauses,
}: {
  session: ReviewSession
  clauses: ClauseReview[]
}): React.ReactElement {
  return (
    <SessionProvider sessionId={session.id} clauses={clauses}>
      <div className="flex h-screen flex-col">
        <Header session={session} />
        <div className="flex min-h-0 flex-1">
          <div className="w-2/5 min-w-0 overflow-hidden border-r border-border">
            <DocumentPanel />
          </div>
          <RightPanel />
          <RunningLog />
        </div>
      </div>
    </SessionProvider>
  )
}

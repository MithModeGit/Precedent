'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { BinaryResult } from '@/types'
import type { SessionWithEval } from '@/lib/dashboard-queries'
import { ScoreBadge, BinaryDots } from '@/components/dashboard/shared'

const DOC_TYPE_LABEL: Record<string, string> = {
  mutual_nda: 'Mutual NDA',
  one_way_nda: 'One-Way NDA',
}

function Chip({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <span className="rounded-full bg-surface-raised px-2 py-0.5 text-xs capitalize text-text-secondary">
      {children}
    </span>
  )
}

export function SessionIndex({ sessions }: { sessions: SessionWithEval[] }): React.ReactElement {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = q ? sessions.filter((s) => s.documentName.toLowerCase().includes(q)) : sessions
    return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [sessions, query])

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by document name"
        className="w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-navy focus:outline-none"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-text-secondary">No sessions match that search.</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-text-secondary">
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Checks</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-border-subtle">
                  <td className="px-4 py-3 text-text-primary">
                    {s.documentName}
                    {s.isBenchmark && (
                      <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold">
                        Benchmark
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(s.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Chip>{DOC_TYPE_LABEL[s.documentType] ?? s.documentType}</Chip>
                  </td>
                  <td className="px-4 py-3">
                    <Chip>{s.mode}</Chip>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={s.overallScore} />
                  </td>
                  <td className="px-4 py-3">
                    {s.binaryChecks ? (
                      <BinaryDots
                        results={Object.values(s.binaryChecks) as BinaryResult[]}
                      />
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/${s.id}`} className="text-xs font-medium text-navy">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

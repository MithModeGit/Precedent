'use client'

import { useState } from 'react'
import type { DashboardData } from '@/lib/dashboard-queries'
import { TrendOverview } from '@/components/dashboard/TrendOverview'
import { SessionIndex } from '@/components/dashboard/SessionIndex'

type Tab = 'trend' | 'sessions'

export function EvalDashboard({
  data,
  now,
}: {
  data: DashboardData
  now: number
}): React.ReactElement {
  const [tab, setTab] = useState<Tab>('trend')
  const tabs: { value: Tab; label: string }[] = [
    { value: 'trend', label: 'Trend Overview' },
    { value: 'sessions', label: 'Session History' },
  ]

  return (
    <div>
      <div className="mb-6 flex gap-6 border-b border-border">
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

      {tab === 'trend' ? (
        <TrendOverview
          sessions={data.sessions}
          clausePerformance={data.clausePerformance}
          scoreDistribution={data.scoreDistribution}
          now={now}
        />
      ) : (
        <SessionIndex sessions={data.sessions} />
      )}
    </div>
  )
}

'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface TrendPoint {
  date: string
  label: string
  overallScore: number
  documentName: string
  documentType: string
}

export function ScoreTrendChart({ data }: { data: TrendPoint[] }): React.ReactElement {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-text-secondary">
        No sessions in this period yet.
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="label"
          interval={0}
          tick={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, fill: 'var(--color-text-secondary)' }}
        />
        <YAxis
          domain={[0, 5]}
          tick={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, fill: 'var(--color-text-secondary)' }}
        />
        <Tooltip
          contentStyle={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 12,
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
          }}
          formatter={(value: number) => [value.toFixed(2), 'Score']}
          labelFormatter={(_label, payload) => {
            const p = payload?.[0]?.payload as TrendPoint | undefined
            return p ? `${p.documentName} (${p.documentType})` : ''
          }}
        />
        <ReferenceArea y1={4} y2={5} fill="var(--color-nice-bg)" fillOpacity={0.5} />
        <ReferenceArea y1={3} y2={4} fill="var(--color-should-bg)" fillOpacity={0.5} />
        <ReferenceArea y1={0} y2={3} fill="var(--color-must-bg)" fillOpacity={0.3} />
        <Line
          type="monotone"
          dataKey="overallScore"
          stroke="var(--color-brand-navy)"
          strokeWidth={2}
          dot={{ r: 5, fill: 'var(--color-brand-navy)' }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

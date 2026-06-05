import Link from 'next/link'
import { getDashboardData } from '@/lib/dashboard-queries'
import { EvalDashboard } from '@/components/dashboard/EvalDashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage(): Promise<React.ReactElement> {
  const data = await getDashboardData()

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-normal text-text-primary">Evaluation</h1>
        <Link href="/" className="text-sm font-medium text-navy">
          Home
        </Link>
      </div>
      <EvalDashboard data={data} />
    </main>
  )
}

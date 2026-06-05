'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { SessionRow, EvalRunRow } from '@/types'
import { Button } from '@/components/ui/Button'
import { ScoreBadge } from '@/components/dashboard/shared'
import { AboutPrototype } from '@/components/home/AboutPrototype'
import { getSupabaseBrowser } from '@/lib/supabase'
import { getOrCreateDeviceId } from '@/lib/session'

const DOC_TYPE_LABEL: Record<string, string> = {
  mutual_nda: 'Mutual NDA',
  one_way_nda: 'One-Way NDA',
}

interface HomeSession extends SessionRow {
  score: number | null
}

export function HomeScreen(): React.ReactElement {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<HomeSession[]>([])
  const [unfinished, setUnfinished] = useState<HomeSession | null>(null)
  const [showArchive, setShowArchive] = useState(false)

  useEffect(() => {
    async function load(): Promise<void> {
      const supabase = getSupabaseBrowser()
      const deviceId = getOrCreateDeviceId()

      let rows: SessionRow[] = []
      const own = await supabase
        .from('sessions')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
      if (own.data && own.data.length > 0) {
        rows = own.data
      } else {
        const bench = await supabase
          .from('sessions')
          .select('*')
          .eq('is_benchmark', true)
          .order('created_at', { ascending: false })
        rows = bench.data ?? []
      }

      const ids = rows.map((r) => r.id)
      const scoreBySession = new Map<string, number>()
      if (ids.length > 0) {
        const evals = await supabase
          .from('eval_runs')
          .select('session_id, overall_score')
          .in('session_id', ids)
        // The browser client does not infer column-subset selects; cast to the needed shape.
        for (const e of (evals.data ?? []) as Pick<
          EvalRunRow,
          'session_id' | 'overall_score'
        >[]) {
          scoreBySession.set(e.session_id, Number(e.overall_score))
        }
      }

      const withScores: HomeSession[] = rows.map((r) => ({
        ...r,
        score: scoreBySession.get(r.id) ?? null,
      }))
      setSessions(withScores)
      setUnfinished(withScores.find((s) => !s.is_benchmark && s.status === 'in_progress') ?? null)
      setLoading(false)
    }
    void load()
  }, [])

  function handleStart(): void {
    if (unfinished) {
      setShowArchive(true)
      return
    }
    router.push('/upload')
  }

  const scored = sessions.filter((s) => s.score !== null)
  const avgScore = scored.length
    ? scored.reduce((a, s) => a + (s.score as number), 0) / scored.length
    : null
  // For first-time users this reflects the benchmark sessions (PRD §5.9); for returning
  // users it is their own review count (all device sessions are fetched, not just 5).
  const totalReviews = sessions.length

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <span className="font-display text-2xl font-semibold tracking-tight text-text-primary">
          Precedent
        </span>
        <Link href="/dashboard" className="text-sm font-medium text-navy">
          Evaluation dashboard
        </Link>
      </div>

      <section className="mt-12">
        <h1 className="font-display text-3xl font-normal text-text-primary">
          AI-powered NDA review
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-6 text-text-secondary">
          Precedent generates market-calibrated redlines grounded in documented practice, scores
          them against a legal quality rubric, and tracks whether the output improves over time.
        </p>
        <div className="mt-6">
          <Button onClick={handleStart}>Start New Review</Button>
        </div>
      </section>

      {showArchive && unfinished && (
        <div className="mt-6 rounded-md border border-should-border bg-should-bg p-4">
          <p className="text-sm text-should">
            You have an unfinished session: {unfinished.document_name}. Start a new review and
            archive the previous one, or return to finish it?
          </p>
          <div className="mt-3 flex gap-3">
            <Button onClick={() => router.push('/upload')}>Start New Review</Button>
            <Button variant="secondary" onClick={() => router.push(`/review/${unfinished.id}`)}>
              Return to finish
            </Button>
          </div>
        </div>
      )}

      <section className="mt-12 grid grid-cols-2 gap-4">
        {loading ? (
          <>
            <div className="h-[92px] animate-pulse rounded-md border border-border bg-surface" />
            <div className="h-[92px] animate-pulse rounded-md border border-border bg-surface" />
          </>
        ) : (
          <>
            <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
              <p className="font-display text-3xl text-text-primary">{totalReviews}</p>
              <p className="mt-1 text-xs text-text-secondary">Total Reviews</p>
            </div>
            <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
              <p className="font-display text-3xl text-text-primary">
                {avgScore != null ? `${avgScore.toFixed(1)} / 5.0` : 'N/A'}
              </p>
              <p className="mt-1 text-xs text-text-secondary">Average Quality Score</p>
            </div>
          </>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold text-text-primary">Recent Sessions</h2>
        {loading ? (
          <div className="mt-4 space-y-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[68px] animate-pulse rounded-md border border-border bg-surface"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">
            No reviews yet. Start your first review above.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {sessions.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border border-border bg-surface p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {s.document_name}
                    {s.is_benchmark && (
                      <span className="ml-2 rounded-full bg-[color-mix(in_srgb,var(--color-accent-gold)_15%,transparent)] px-2 py-0.5 text-[10px] text-gold">
                        Benchmark
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {new Date(s.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}{' '}
                    · {DOC_TYPE_LABEL[s.document_type] ?? s.document_type} · {s.mode}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <ScoreBadge score={s.score} />
                  {s.status === 'in_progress' && !s.is_benchmark ? (
                    <Link href={`/review/${s.id}`} className="text-xs font-medium text-navy">
                      Continue
                    </Link>
                  ) : (
                    <Link href={`/dashboard/${s.id}`} className="text-xs font-medium text-navy">
                      View
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <AboutPrototype />
    </main>
  )
}

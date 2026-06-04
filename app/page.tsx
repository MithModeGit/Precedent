import { Card } from '@/components/ui/Card'
import { PriorityBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

// Placeholder home screen for Phase 1. Replaced by the full HomeScreen in Phase 7.
export default function HomePage(): React.ReactElement {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl font-normal text-text-primary">Precedent</h1>
      <p className="mt-3 max-w-prose text-sm leading-6 text-text-secondary">
        AI-powered NDA review for legal professionals. Precedent generates
        market-calibrated redlines, scores them against a legal quality rubric, and tracks
        whether the AI is improving over time.
      </p>

      <div className="mt-8">
        <Button>Start Review</Button>
      </div>

      <Card className="mt-12">
        <p className="font-sans text-sm font-semibold uppercase tracking-widest text-text-secondary">
          Design system check
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <PriorityBadge priority="must" />
          <PriorityBadge priority="should" />
          <PriorityBadge priority="nice" />
        </div>
        <p className="mt-4 font-mono text-sm leading-6 text-text-primary">
          Clause text renders in JetBrains Mono.
        </p>
      </Card>
    </main>
  )
}

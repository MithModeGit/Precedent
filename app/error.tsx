'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }): React.ReactElement {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <h1 className="font-display text-2xl text-text-primary">Something went wrong</h1>
      <p className="mt-3 text-sm leading-6 text-text-secondary">
        An unexpected error interrupted this page. You can try again, or return to the home screen
        and start over.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/"
          className="inline-flex items-center rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
        >
          Return to home
        </Link>
      </div>
    </main>
  )
}

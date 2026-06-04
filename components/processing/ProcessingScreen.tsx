'use client'

const STAGES = [
  { label: 'Parsing Document', context: 'Extracting text from your file' },
  { label: 'Classifying Contract', context: 'Identifying clause types and governing law' },
  { label: 'Generating Redlines', context: 'Comparing clauses to market-standard positions' },
  { label: 'Preparing Interface', context: 'Loading the review workspace' },
]

/** Four-stage pipeline progress. `stage` is the index of the currently active step. */
export function ProcessingScreen({ stage }: { stage: number }): React.ReactElement {
  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <h1 className="font-display text-2xl font-normal text-text-primary">Reviewing your document</h1>
      <ol className="mt-8 space-y-5">
        {STAGES.map((s, i) => {
          const state = i < stage ? 'complete' : i === stage ? 'active' : 'pending'
          return (
            <li key={s.label} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  state === 'complete'
                    ? 'bg-nice text-surface'
                    : state === 'active'
                      ? 'bg-navy text-surface'
                      : 'bg-surface-raised text-text-muted'
                }`}
              >
                {state === 'complete' ? '✓' : state === 'active' ? '' : ''}
                {state === 'active' && (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-surface" />
                )}
              </span>
              <div>
                <p
                  className={`text-sm font-medium ${
                    state === 'pending' ? 'text-text-muted' : 'text-text-primary'
                  }`}
                >
                  {s.label}
                </p>
                {state === 'active' && (
                  <p className="text-xs text-text-secondary">{s.context}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

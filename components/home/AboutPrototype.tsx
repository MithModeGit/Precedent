const PIPELINE: { n: string; label: string; body: string }[] = [
  {
    n: '1',
    label: 'Classify',
    body: 'Identifies the document type, governing law, and signatory so the right rules apply.',
  },
  {
    n: '2',
    label: 'Redline',
    body: 'Generates priority-ranked edits grounded in a market-standard reference database, each with a citation.',
  },
  {
    n: '3',
    label: 'Evaluate',
    body: 'Scores its own redlines against a legal-quality rubric, including how many real issues it caught.',
  },
  {
    n: '4',
    label: 'Improve',
    body: 'Records where the engine fell short so the prompts can be tuned over time.',
  },
]

/**
 * Honest framing for the home screen: what the prototype is, how the pipeline works, how the
 * evaluation scores itself (precision and recall), and the limitations a reviewer should know.
 */
export function AboutPrototype(): React.ReactElement {
  return (
    <section className="mt-16 border-t border-border pt-10">
      <h2 className="font-display text-xl font-semibold text-text-primary">About this prototype</h2>
      <p className="mt-3 max-w-prose text-sm leading-6 text-text-secondary">
        Precedent is a working demonstration of an AI NDA-review pipeline, assembled in about a day.
        It is not a production legal product; it is a focused prototype built to show how an AI legal
        tool can be made transparent and self-critical about the quality of its own work.
      </p>

      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
          How it works
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PIPELINE.map((s) => (
            <div key={s.n} className="rounded-md border border-border-subtle p-4">
              <p className="text-sm font-medium text-text-primary">
                <span className="text-gold">{s.n}.</span> {s.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-secondary">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
            How it grades itself
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            The evaluation reports two numbers, not one. Precision measures how good the redlines it
            produced are; coverage (recall) measures how many of the material issues actually present
            in the document it caught. The overall score is a recall-weighted F-score of the two, so a
            polished review that misses a contradiction cannot score near the top.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
            What it is honest about
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Scores come from a language model on a single, non-deterministic run, and the benchmarks
            are synthetic NDAs rather than attorney-labeled ground truth. To limit the risk of a model
            grading its own work, the evaluation is moving to a different model family than the one that
            writes the redlines. This tool does not provide legal advice.
          </p>
        </div>
      </div>
    </section>
  )
}

import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import type { z } from 'zod'
import { GEMINI_MODEL_ID } from '@/lib/env'

export type PipelinePass = 1 | 2 | 3 | 4

/** Error carrying which pipeline pass failed, for structured API error responses. */
export class PipelineError extends Error {
  readonly pass: PipelinePass
  constructor(pass: PipelinePass, cause?: unknown) {
    super(`Pipeline pass ${pass} failed`)
    this.name = 'PipelineError'
    this.pass = pass
    if (cause instanceof Error) this.stack = cause.stack
  }
}

interface GenerateStructuredOptions<T> {
  schema: z.ZodType<T>
  system: string
  prompt: string
  pass: PipelinePass
}

/**
 * Runs a single structured-output pass against Gemini. Retries once on failure
 * (transient error or schema-validation miss), then throws a PipelineError.
 */
export async function generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<T> {
  const model = google(GEMINI_MODEL_ID)

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { object } = await generateObject({
        model,
        schema: opts.schema,
        system: opts.system,
        prompt: opts.prompt,
        // Pass 2 echoes full clause text per redline and Pass 3 scores every clause, so
        // the output can be large; raise the cap well above the model default to avoid
        // truncated JSON (finishReason "length").
        maxTokens: 60000,
        // Disable thinking: unbounded reasoning consumes the output token budget and
        // truncates the structured JSON (these passes are extraction/scoring, not open
        // reasoning). gemini-3-flash-preview does not reliably honor partial budgets.
        providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
      })
      return object
    } catch (error) {
      if (attempt === 2) {
        throw new PipelineError(opts.pass, error)
      }
      // Brief backoff so transient rate limits (429) or overload (503) can clear.
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }

  // Unreachable: the loop either returns or throws.
  throw new PipelineError(opts.pass)
}

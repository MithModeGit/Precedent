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
      })
      return object
    } catch (error) {
      if (attempt === 2) {
        throw new PipelineError(opts.pass, error)
      }
    }
  }

  // Unreachable: the loop either returns or throws.
  throw new PipelineError(opts.pass)
}

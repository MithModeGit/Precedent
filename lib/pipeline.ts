import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateObject, generateText } from 'ai'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { z } from 'zod'
import { GEMINI_MODEL_ID, CLAUDE_JUDGE_MODEL_ID, serverEnv } from '@/lib/env'

// Extended-thinking budget for the judge. High enough for deliberate scoring of a full
// document; the route sets a long maxDuration to accommodate the latency.
const JUDGE_THINKING_BUDGET = 24000
const JUDGE_MAX_TOKENS = 64000

/**
 * Extracts the JSON object from model text by taking the span from the first opening brace
 * to the last closing brace. This is robust to markdown fences (which contain no braces) and
 * to multiple code blocks, unlike matching the first fenced block.
 */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  // The prompt asks for only JSON, so the whole response usually parses directly. Fall back
  // to the outermost-brace span only when the model wraps the object in fences or stray text.
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start === -1 || end <= start) throw new Error('No JSON object found in evaluator output')
    return JSON.parse(trimmed.slice(start, end + 1))
  }
}

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
  // Build the provider with the sanitized key rather than the default google() provider,
  // which reads process.env.GOOGLE_GENERATIVE_AI_API_KEY directly and would inherit any
  // BOM/whitespace, breaking the request's auth header.
  const google = createGoogleGenerativeAI({ apiKey: serverEnv.googleApiKey })
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

/**
 * Runs a structured-output pass on Claude (the evaluation judge), a different model family
 * than the Gemini generator, with extended thinking. Anthropic does not support JSON-mode
 * object generation, and tool-mode object generation cannot run with thinking enabled, so
 * this drives generateText, injects the JSON Schema, and parses the result. Retries once.
 */
export async function generateJudged<T>(opts: GenerateStructuredOptions<T>): Promise<T> {
  const model = createAnthropic({ apiKey: serverEnv.anthropicApiKey })(CLAUDE_JUDGE_MODEL_ID)
  const schemaJson = JSON.stringify(zodToJsonSchema(opts.schema, { $refStrategy: 'none' }), null, 2)
  const prompt = `${opts.prompt}\n\nReturn ONLY a single JSON object (no markdown fences, no commentary) that conforms exactly to this JSON Schema:\n${schemaJson}`

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { text } = await generateText({
        model,
        maxTokens: JUDGE_MAX_TOKENS,
        providerOptions: {
          anthropic: { thinking: { type: 'enabled', budgetTokens: JUDGE_THINKING_BUDGET } },
        },
        system: opts.system,
        prompt,
      })
      return opts.schema.parse(extractJsonObject(text))
    } catch (error) {
      if (attempt === 2) {
        throw new PipelineError(opts.pass, error)
      }
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }

  // Unreachable: the loop either returns or throws.
  throw new PipelineError(opts.pass)
}

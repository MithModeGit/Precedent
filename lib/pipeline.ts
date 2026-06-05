import { GoogleGenAI, ThinkingLevel } from '@google/genai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
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

// Reuse a single Gemini client across passes rather than recreating it per call. Created
// lazily so the server-only API key is read on first use, not at module load.
let genAIClient: GoogleGenAI | null = null
function getGenAI(): GoogleGenAI {
  if (!genAIClient) genAIClient = new GoogleGenAI({ apiKey: serverEnv.googleApiKey })
  return genAIClient
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
 * Runs a structured-output generator pass on Gemini via the official @google/genai SDK.
 * Unlike the Vercel AI SDK's tool-mode generateObject (which triggered runaway dynamic
 * thinking that consumed the 64k output budget and truncated the JSON), the official SDK
 * honors thinking_level, so high reasoning stays bounded and the response completes. We
 * request JSON output, inject the JSON Schema into the prompt, and validate with Zod.
 * Retries on a transient or unparseable result, then throws a PipelineError.
 */
export async function generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<T> {
  const ai = getGenAI()
  const schemaJson = JSON.stringify(zodToJsonSchema(opts.schema, { $refStrategy: 'none' }), null, 2)
  const prompt = `${opts.prompt}\n\nReturn ONLY a single JSON object (no markdown fences, no commentary) that conforms exactly to this JSON Schema:\n${schemaJson}`

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL_ID,
        contents: prompt,
        config: {
          systemInstruction: opts.system,
          // High reasoning, reliably bounded by thinking_level (the official SDK honors it),
          // so thinking never consumes the output budget. Temperature left at the default 1.0.
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: 'application/json',
          maxOutputTokens: 65536,
        },
      })
      const text = response.text
      if (!text) throw new Error('Empty response from the generator')
      return opts.schema.parse(extractJsonObject(text))
    } catch (error) {
      if (attempt === 3) {
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

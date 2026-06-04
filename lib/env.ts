/**
 * Type-safe environment variable access.
 *
 * Validation is presence-only and performs no network calls, so `next build`
 * succeeds with the placeholder values the CI workflow injects. Real values are
 * required at runtime when a pipeline pass or Supabase query actually executes.
 */

/**
 * The Gemini model id used for all four pipeline passes. Update here only.
 * The spec named "gemini-3-flash"; the released id is "gemini-3-flash-preview"
 * (Gemini 3 Flash Preview: structured outputs supported, 1M-token input).
 */
export const GEMINI_MODEL_ID = 'gemini-3-flash-preview'

type ServerEnvKey = 'GOOGLE_GENERATIVE_AI_API_KEY'
type PublicEnvKey = 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'

function readPublic(key: PublicEnvKey): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `Missing required environment variable ${key}. Add it to .env.local (see .env.example).`,
    )
  }
  return value
}

/**
 * Reads the first present of several env var names. Supports both the spec name
 * (NEXT_PUBLIC_SUPABASE_ANON_KEY, injected by CI) and Supabase's newer
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY naming.
 */
function readFirstPublic(keys: readonly string[]): string {
  for (const key of keys) {
    const value = process.env[key]
    if (value) return value
  }
  throw new Error(
    `Missing required environment variable. Set one of: ${keys.join(', ')} (see .env.example).`,
  )
}

function readServer(key: ServerEnvKey): string {
  if (typeof window !== 'undefined') {
    throw new Error(`Server-only environment variable ${key} read in the browser.`)
  }
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `Missing required environment variable ${key}. Add it to .env.local (see .env.example).`,
    )
  }
  return value
}

export const publicEnv = {
  get supabaseUrl(): string {
    return readPublic('NEXT_PUBLIC_SUPABASE_URL')
  },
  get supabaseAnonKey(): string {
    return readFirstPublic([
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ])
  },
}

export const serverEnv = {
  get googleApiKey(): string {
    return readServer('GOOGLE_GENERATIVE_AI_API_KEY')
  },
}

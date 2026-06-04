/**
 * Type-safe environment variable access.
 *
 * Validation is presence-only and performs no network calls, so `next build`
 * succeeds with the placeholder values the CI workflow injects. Real values are
 * required at runtime when a pipeline pass or Supabase query actually executes.
 */

/** The Gemini model id used for all four pipeline passes. Update here only. */
export const GEMINI_MODEL_ID = 'gemini-3-flash'

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
    return readPublic('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  },
}

export const serverEnv = {
  get googleApiKey(): string {
    return readServer('GOOGLE_GENERATIVE_AI_API_KEY')
  },
}

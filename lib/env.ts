/**
 * Type-safe environment variable access.
 *
 * Validation is presence-only and performs no network calls, so `next build`
 * succeeds with the placeholder values the CI workflow injects. Real values are
 * required at runtime when a pipeline pass or Supabase query actually executes.
 *
 * NEXT_PUBLIC_ variables are referenced by literal name only: Next.js statically
 * inlines them into the client bundle at build time, and dynamic `process.env[key]`
 * lookups would evaluate to undefined in the browser.
 */

/**
 * The Gemini model id used for all four pipeline passes. Update here only.
 * The spec named "gemini-3-flash"; the released id is "gemini-3-flash-preview"
 * (Gemini 3 Flash Preview: structured outputs supported, 1M-token input).
 */
export const GEMINI_MODEL_ID = 'gemini-3-flash-preview'

/** Byte Order Mark code point (U+FEFF). */
const BOM = 0xfeff

function sanitize(value: string): string {
  // Drop a leading BOM and surrounding whitespace. Some env sources prepend a BOM
  // (for example, values piped through PowerShell into the Vercel CLI). A BOM is
  // illegal in the HTTP headers the Supabase and Gemini clients build from these
  // values and raises "Cannot convert argument to a ByteString because the
  // character at index 0 has a value of 65279", failing every request.
  const withoutBom = value.charCodeAt(0) === BOM ? value.slice(1) : value
  return withoutBom.trim()
}

function required(name: string, value: string | undefined): string {
  const cleaned = value === undefined ? '' : sanitize(value)
  if (!cleaned) {
    throw new Error(
      `Missing required environment variable ${name}. Add it to .env.local (see .env.example).`,
    )
  }
  return cleaned
}

export const publicEnv = {
  get supabaseUrl(): string {
    return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
  },
  get supabaseAnonKey(): string {
    // Both names referenced as literals so Next.js inlines whichever is set.
    // Supports the spec/CI name and Supabase's newer publishable-key name.
    const value =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    return required(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      value,
    )
  },
}

export const serverEnv = {
  get googleApiKey(): string {
    if (typeof window !== 'undefined') {
      throw new Error('Server-only environment variable GOOGLE_GENERATIVE_AI_API_KEY read in the browser.')
    }
    return required('GOOGLE_GENERATIVE_AI_API_KEY', process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  },
}

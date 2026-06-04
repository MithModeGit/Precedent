import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'

/**
 * Server-side Supabase client for Route Handlers and Server Components.
 * Created lazily so that `next build` does not require live credentials.
 */
let cachedServerClient: ReturnType<typeof createClient> | null = null

export function getSupabaseServer(): ReturnType<typeof createClient> {
  if (!cachedServerClient) {
    cachedServerClient = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
      auth: { persistSession: false },
    })
  }
  return cachedServerClient
}

/** Browser Supabase client for Client Components. */
export function getSupabaseBrowser(): ReturnType<typeof createBrowserClient> {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey)
}

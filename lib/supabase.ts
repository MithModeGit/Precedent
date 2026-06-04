import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'

/**
 * Server-side Supabase client for Route Handlers and Server Components.
 * A fresh instance is created per call: the Node server process is shared across
 * concurrent requests, so a globally cached client risks cross-request state
 * leakage once request-specific auth context is introduced.
 */
export function getSupabaseServer(): ReturnType<typeof createClient> {
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false },
  })
}

/** Browser Supabase client for Client Components. */
export function getSupabaseBrowser(): ReturnType<typeof createBrowserClient> {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey)
}

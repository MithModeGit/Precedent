import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Server-side Supabase client for Route Handlers and Server Components.
 * A fresh instance is created per call: the Node server process is shared across
 * concurrent requests, so a globally cached client risks cross-request state
 * leakage once request-specific auth context is introduced.
 */
export function getSupabaseServer() {
  return createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false },
  })
}

/** Browser Supabase client for Client Components. */
export function getSupabaseBrowser() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey)
}

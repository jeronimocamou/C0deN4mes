import { createClient } from '@supabase/supabase-js'

// Server-only client using the service role key — bypasses RLS.
// Never import this from client components.
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    // Fail loudly rather than silently downgrading to the anon key, which
    // can't write to locked-down tables and hides the misconfiguration.
    throw new Error(
      'Supabase server client misconfigured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }
  return createClient(url, key, { auth: { persistSession: false } })
}


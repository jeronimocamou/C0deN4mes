import { createBrowserClient } from '@supabase/ssr'

// Auth-aware browser client — persists session in cookies automatically.
// Use in Client Components that need to know the logged-in user.
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

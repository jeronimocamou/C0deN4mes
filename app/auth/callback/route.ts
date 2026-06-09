import { NextRequest } from 'next/server'
import { createAuthClient } from '@/lib/supabase-auth'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createAuthClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return Response.redirect(`${origin}${next}`)
}

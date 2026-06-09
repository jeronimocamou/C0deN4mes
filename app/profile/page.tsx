import { createAuthClient } from '@/lib/supabase-auth'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: stats } = await supabase
    .from('user_stats')
    .select('games_played, games_won, display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <ProfileClient
      email={user.email ?? ''}
      displayName={stats?.display_name ?? user.email?.split('@')[0] ?? 'Player'}
      gamesPlayed={stats?.games_played ?? 0}
      gamesWon={stats?.games_won ?? 0}
    />
  )
}

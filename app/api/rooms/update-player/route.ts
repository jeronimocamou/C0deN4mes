import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabase as anonClient } from '@/lib/supabase'

// All team/role changes go through here so the server can enforce the rules:
// you can only edit yourself, only while the game is in the lobby, and only
// one spymaster per team. Clients must not write to game_players directly.
export async function POST(req: NextRequest) {
  const { room_code, session_id, team, role } = await req.json()
  if (!room_code || !session_id || (!team && !role)) {
    return Response.json({ error: 'room_code, session_id, and team or role required' }, { status: 400 })
  }
  if (team && !['red', 'blue'].includes(team)) {
    return Response.json({ error: 'team must be red or blue' }, { status: 400 })
  }
  if (role && !['spymaster', 'operative'].includes(role)) {
    return Response.json({ error: 'role must be spymaster or operative' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, status')
    .eq('room_code', room_code)
    .maybeSingle()

  if (!game) return Response.json({ error: 'Room not found' }, { status: 404 })
  if (game.status !== 'lobby') return Response.json({ error: 'Teams are locked once the game starts' }, { status: 409 })

  const { data: player } = await supabase
    .from('game_players')
    .select('id, team, role_locked_at')
    .eq('game_id', game.id)
    .eq('session_id', session_id)
    .maybeSingle()

  if (!player) return Response.json({ error: 'Not in this game' }, { status: 403 })
  if (player.role_locked_at) return Response.json({ error: 'Teams are locked once the game starts' }, { status: 409 })

  let update: { team?: string; role?: string | null }
  if (team) {
    // Switching teams resets role so you re-pick on the new team
    update = { team, role: null }
  } else {
    if (!player.team) return Response.json({ error: 'Pick a team first' }, { status: 400 })
    if (role === 'spymaster') {
      const { data: existing } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('team', player.team)
        .eq('role', 'spymaster')
        .neq('id', player.id)
        .maybeSingle()
      if (existing) return Response.json({ error: 'Spymaster already taken' }, { status: 409 })
    }
    update = { role }
  }

  const { error: updateError } = await supabase
    .from('game_players')
    .update(update)
    .eq('id', player.id)

  if (updateError) return Response.json({ error: updateError.message }, { status: 500 })

  await anonClient.channel(`room:${room_code}`).send({
    type: 'broadcast',
    event: 'lobby_update',
    payload: {},
  })

  return Response.json({ ok: true })
}

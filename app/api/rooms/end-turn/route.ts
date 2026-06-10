import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabase as anonClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { room_code, session_id } = await req.json()
  if (!room_code || !session_id) {
    return Response.json({ error: 'room_code and session_id required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, status, current_team')
    .eq('room_code', room_code)
    .maybeSingle()

  if (!game) return Response.json({ error: 'Room not found' }, { status: 404 })
  if (game.status !== 'active') return Response.json({ error: 'Game not active' }, { status: 409 })

  const { data: player } = await supabase
    .from('game_players')
    .select('role, team')
    .eq('game_id', game.id)
    .eq('session_id', session_id)
    .maybeSingle()

  if (!player) return Response.json({ error: 'Not in this game' }, { status: 403 })
  if (player.team !== game.current_team) return Response.json({ error: "Not your team's turn" }, { status: 403 })

  const nextTeam = game.current_team === 'red' ? 'blue' : 'red'

  await supabase
    .from('games')
    .update({ current_team: nextTeam, turn_started_at: new Date().toISOString() })
    .eq('id', game.id)

  await anonClient.channel(`room:${room_code}`).send({
    type: 'broadcast',
    event: 'board_update',
    payload: { next_team: nextTeam },
  })

  return Response.json({ ok: true, next_team: nextTeam })
}

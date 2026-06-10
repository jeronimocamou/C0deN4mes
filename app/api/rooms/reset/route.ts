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
    .select('id, status')
    .eq('room_code', room_code)
    .maybeSingle()

  if (!game) return Response.json({ error: 'Room not found' }, { status: 404 })

  const { data: player } = await supabase
    .from('game_players')
    .select('is_host')
    .eq('game_id', game.id)
    .eq('session_id', session_id)
    .maybeSingle()

  if (!player?.is_host) return Response.json({ error: 'Only the host can reset the game' }, { status: 403 })

  // Delete all cards
  await supabase.from('cards').delete().eq('game_id', game.id)

  // Unlock all players and clear teams/roles so everyone picks fresh
  await supabase
    .from('game_players')
    .update({ team: null, role: null, role_locked_at: null })
    .eq('game_id', game.id)

  // Reset game to lobby
  await supabase
    .from('games')
    .update({
      status: 'lobby',
      current_team: 'red',
      winner: null,
      turn_started_at: null,
      red_words_remaining: 9,
      blue_words_remaining: 8,
    })
    .eq('id', game.id)

  // Send everyone on the board back to the lobby
  await anonClient.channel(`room:${room_code}`).send({
    type: 'broadcast',
    event: 'game_reset',
    payload: {},
  })

  return Response.json({ ok: true })
}

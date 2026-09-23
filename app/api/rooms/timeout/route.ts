import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabase as anonClient } from '@/lib/supabase'

// Ends the current team's turn if they haven't submitted a clue within 90s.
// Clients ping this when their clue countdown reaches zero; the server is the
// source of truth, so a stale or early ping is a harmless no-op.
const CLUE_DEADLINE_MS = 90_000

export async function POST(req: NextRequest) {
  const { room_code, session_id } = await req.json()
  if (!room_code || !session_id) {
    return Response.json({ error: 'room_code and session_id required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, status, current_team, turn_started_at, clue_word')
    .eq('room_code', room_code)
    .maybeSingle()

  if (!game) return Response.json({ error: 'Room not found' }, { status: 404 })
  if (game.status !== 'active') return Response.json({ ok: true, changed: false })

  // Only players in this game may drive the clock
  const { data: player } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', game.id)
    .eq('session_id', session_id)
    .maybeSingle()

  if (!player) return Response.json({ error: 'Not in this game' }, { status: 403 })

  // No-op unless the turn still owes a clue and the 90s window has elapsed
  const startedAt = game.turn_started_at ? new Date(game.turn_started_at).getTime() : 0
  const expired = startedAt > 0 && Date.now() - startedAt >= CLUE_DEADLINE_MS
  if (game.clue_word || !expired) {
    return Response.json({ ok: true, changed: false })
  }

  const nextTeam = game.current_team === 'red' ? 'blue' : 'red'
  await supabase
    .from('games')
    .update({
      current_team: nextTeam,
      turn_started_at: new Date().toISOString(),
      clue_word: null,
      clue_count: null,
      clue_team: null,
    })
    .eq('id', game.id)

  await anonClient.channel(`room:${room_code}`).send({
    type: 'broadcast',
    event: 'board_update',
    payload: { next_team: nextTeam, reason: 'clue_timeout' },
  })

  return Response.json({ ok: true, changed: true, next_team: nextTeam })
}

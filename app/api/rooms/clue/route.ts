import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabase as anonClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { room_code, session_id, word, count } = await req.json()
  if (!room_code || !session_id || !word || count == null) {
    return Response.json({ error: 'room_code, session_id, word, count required' }, { status: 400 })
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
  if (player.role !== 'spymaster') return Response.json({ error: 'Only spymasters can give clues' }, { status: 403 })
  if (player.team !== game.current_team) return Response.json({ error: "Not your team's turn" }, { status: 403 })

  const clueWord = String(word).trim().toUpperCase().slice(0, 30)
  const clueCount = Math.max(0, Math.min(9, Math.floor(Number(count)) || 0))
  if (!clueWord || /\s/.test(clueWord)) {
    return Response.json({ error: 'Clue must be a single word' }, { status: 400 })
  }

  // Persist so refreshes and late joiners still see the current clue
  const { error: updateError } = await supabase
    .from('games')
    .update({ clue_word: clueWord, clue_count: clueCount, clue_team: player.team })
    .eq('id', game.id)

  if (updateError) return Response.json({ error: updateError.message }, { status: 500 })

  // Broadcast for instant delivery
  await anonClient.channel(`room:${room_code}`).send({
    type: 'broadcast',
    event: 'clue_given',
    payload: { word: clueWord, count: clueCount, team: player.team },
  })

  return Response.json({ ok: true })
}

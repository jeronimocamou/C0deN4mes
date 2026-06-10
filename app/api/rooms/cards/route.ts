import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// Returns cards with color only if the requester is a spymaster.
// Operatives receive word + is_revealed + position only.
export async function POST(req: NextRequest) {
  const { room_code, session_id } = await req.json()
  if (!room_code || !session_id) {
    return Response.json({ error: 'room_code and session_id required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, status, current_team, winner, turn_started_at, red_words_remaining, blue_words_remaining')
    .eq('room_code', room_code)
    .maybeSingle()

  if (!game) return Response.json({ error: 'Room not found' }, { status: 404 })
  // Finished games stay viewable so the final reveal and winner banner render;
  // only a lobby-state game has no board to show.
  if (game.status === 'lobby') return Response.json({ error: 'Game not started' }, { status: 409 })

  const { data: player } = await supabase
    .from('game_players')
    .select('role, team, role_locked_at, is_host')
    .eq('game_id', game.id)
    .eq('session_id', session_id)
    .maybeSingle()

  if (!player) return Response.json({ error: 'Player not found in this game' }, { status: 403 })

  const { data: cards } = await supabase
    .from('cards')
    .select('id, word, color, is_revealed, position')
    .eq('game_id', game.id)
    .order('position')

  if (!cards) return Response.json({ error: 'Failed to load cards' }, { status: 500 })

  const isSpymaster = player.role === 'spymaster'

  // Strip color from unrevealed cards for operatives
  const safeCards = cards.map(c => ({
    id: c.id,
    word: c.word,
    position: c.position,
    is_revealed: c.is_revealed,
    color: isSpymaster || c.is_revealed ? c.color : null,
  }))

  return Response.json({
    cards: safeCards,
    game: {
      current_team: game.current_team,
      winner: game.winner,
      turn_started_at: game.turn_started_at,
      red_words_remaining: game.red_words_remaining,
      blue_words_remaining: game.blue_words_remaining,
    },
    player: { role: player.role, team: player.team, is_host: player.is_host },
  })
}

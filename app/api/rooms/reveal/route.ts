import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabase as anonClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { room_code, session_id, card_id } = await req.json()
  if (!room_code || !session_id || !card_id) {
    return Response.json({ error: 'room_code, session_id, card_id required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, status, current_team, red_words_remaining, blue_words_remaining')
    .eq('room_code', room_code)
    .maybeSingle()

  if (!game) return Response.json({ error: 'Room not found' }, { status: 404 })
  if (game.status !== 'active') return Response.json({ error: 'Game not active' }, { status: 409 })

  const { data: player } = await supabase
    .from('game_players')
    .select('role, team, role_locked_at')
    .eq('game_id', game.id)
    .eq('session_id', session_id)
    .maybeSingle()

  if (!player) return Response.json({ error: 'Not in this game' }, { status: 403 })
  if (player.role !== 'operative') return Response.json({ error: 'Only operatives can reveal cards' }, { status: 403 })
  if (player.team !== game.current_team) return Response.json({ error: "Not your team's turn" }, { status: 403 })

  // Atomic reveal: the is_revealed guard makes concurrent clicks on the same
  // card a no-op for all but one request.
  const { data: revealed } = await supabase
    .from('cards')
    .update({ is_revealed: true })
    .eq('id', card_id)
    .eq('game_id', game.id)
    .eq('is_revealed', false)
    .select('id, color')

  if (!revealed || revealed.length === 0) {
    return Response.json({ error: 'Card already revealed' }, { status: 409 })
  }

  // Derive remaining counts from the cards table so racing reveals can't
  // drift the counters.
  const { data: unrevealed } = await supabase
    .from('cards')
    .select('color')
    .eq('game_id', game.id)
    .eq('is_revealed', false)

  const color = revealed[0].color as string
  const redRemaining = unrevealed?.filter(c => c.color === 'red').length ?? game.red_words_remaining
  const blueRemaining = unrevealed?.filter(c => c.color === 'blue').length ?? game.blue_words_remaining
  let nextTeam = game.current_team
  let winner: string | null = null
  let newStatus = 'active'

  if (color === 'assassin') {
    // Revealing the assassin loses immediately
    winner = game.current_team === 'red' ? 'blue' : 'red'
    newStatus = 'finished'
  } else {
    if (redRemaining === 0) { winner = 'red'; newStatus = 'finished' }
    else if (blueRemaining === 0) { winner = 'blue'; newStatus = 'finished' }
    // Any card that isn't the guessing team's color ends the turn
    if (color !== game.current_team) {
      nextTeam = game.current_team === 'red' ? 'blue' : 'red'
    }
  }

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    red_words_remaining: redRemaining,
    blue_words_remaining: blueRemaining,
    status: newStatus,
  }
  if (winner) updates.winner = winner
  if (nextTeam !== game.current_team || newStatus === 'finished') {
    updates.current_team = nextTeam
    updates.turn_started_at = now
    // The clue belongs to the turn that just ended
    updates.clue_word = null
    updates.clue_count = null
    updates.clue_team = null
  }

  await supabase.from('games').update(updates).eq('id', game.id)

  // Push the reveal to every client so the tile flips with its true color
  await anonClient.channel(`room:${room_code}`).send({
    type: 'broadcast',
    event: 'board_update',
    payload: { card_id, color, winner, next_team: nextTeam },
  })

  // Record stats when game ends
  if (winner) {
    const { data: players } = await supabase
      .from('game_players')
      .select('user_id, team')
      .eq('game_id', game.id)
      .not('user_id', 'is', null)

    if (players && players.length > 0) {
      for (const p of players) {
        if (!p.user_id) continue
        const won = p.team === winner
        // Upsert: create row if doesn't exist, then increment
        await supabase.rpc('increment_user_stats', {
          p_user_id: p.user_id,
          p_won: won,
        })
      }
    }
  }

  return Response.json({ color, winner, next_team: nextTeam })
}

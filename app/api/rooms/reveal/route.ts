import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

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

  const { data: card } = await supabase
    .from('cards')
    .select('id, color, is_revealed')
    .eq('id', card_id)
    .eq('game_id', game.id)
    .maybeSingle()

  if (!card) return Response.json({ error: 'Card not found' }, { status: 404 })
  if (card.is_revealed) return Response.json({ error: 'Card already revealed' }, { status: 409 })

  // Reveal the card
  await supabase.from('cards').update({ is_revealed: true }).eq('id', card_id)

  // Determine outcome
  const color = card.color as string
  let nextTeam = game.current_team
  let redRemaining = game.red_words_remaining
  let blueRemaining = game.blue_words_remaining
  let winner: string | null = null
  let newStatus = 'active'

  if (color === 'assassin') {
    // Revealing the assassin loses immediately
    winner = game.current_team === 'red' ? 'blue' : 'red'
    newStatus = 'finished'
  } else if (color === 'red') {
    redRemaining -= 1
    if (redRemaining === 0) { winner = 'red'; newStatus = 'finished' }
    if (game.current_team === 'blue') nextTeam = 'blue' // wrong team card ends turn
    // red team guessed red — stays their turn (nextTeam stays 'red')
  } else if (color === 'blue') {
    blueRemaining -= 1
    if (blueRemaining === 0) { winner = 'blue'; newStatus = 'finished' }
    if (game.current_team === 'red') nextTeam = 'red' // wrong team card ends turn
  } else {
    // neutral — always ends the turn
    nextTeam = game.current_team === 'red' ? 'blue' : 'red'
  }

  // Fix turn-switching logic: wrong color OR neutral ends turn
  if (color !== game.current_team && color !== 'assassin') {
    nextTeam = game.current_team === 'red' ? 'blue' : 'red'
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
  }

  await supabase.from('games').update(updates).eq('id', game.id)

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

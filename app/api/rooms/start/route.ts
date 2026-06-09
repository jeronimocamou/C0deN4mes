import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function POST(req: NextRequest) {
  const { room_code, session_id } = await req.json()

  if (!room_code || !session_id) {
    return Response.json({ error: 'room_code and session_id are required' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Load game
  const { data: game } = await supabase
    .from('games')
    .select('id, status')
    .eq('room_code', room_code)
    .maybeSingle()

  if (!game) return Response.json({ error: 'Room not found' }, { status: 404 })
  if (game.status !== 'lobby') return Response.json({ error: 'Game already started' }, { status: 409 })

  // Verify requester is host
  const { data: requester } = await supabase
    .from('game_players')
    .select('id, is_host')
    .eq('game_id', game.id)
    .eq('session_id', session_id)
    .maybeSingle()

  if (!requester?.is_host) return Response.json({ error: 'Only the host can start the game' }, { status: 403 })

  // Load all players
  const { data: players } = await supabase
    .from('game_players')
    .select('id, team, role')
    .eq('game_id', game.id)

  if (!players) return Response.json({ error: 'Failed to load players' }, { status: 500 })

  const redTeam = players.filter(p => p.team === 'red')
  const blueTeam = players.filter(p => p.team === 'blue')

  if (!redTeam.some(p => p.role === 'spymaster'))
    return Response.json({ error: 'Red team needs a spymaster' }, { status: 400 })
  if (!blueTeam.some(p => p.role === 'spymaster'))
    return Response.json({ error: 'Blue team needs a spymaster' }, { status: 400 })
  if (!redTeam.some(p => p.role === 'operative'))
    return Response.json({ error: 'Red team needs an operative' }, { status: 400 })
  if (!blueTeam.some(p => p.role === 'operative'))
    return Response.json({ error: 'Blue team needs an operative' }, { status: 400 })

  // Fetch word pack
  const { data: pack } = await supabase
    .from('word_packs')
    .select('words')
    .eq('is_default', true)
    .maybeSingle()

  if (!pack?.words?.length) return Response.json({ error: 'No word pack found' }, { status: 500 })

  // Pick 25 random words and assign colors: 9 red, 8 blue, 7 neutral, 1 assassin
  const words = shuffle(pack.words).slice(0, 25)
  const colors = shuffle([
    ...Array(9).fill('red'),
    ...Array(8).fill('blue'),
    ...Array(7).fill('neutral'),
    'assassin',
  ])

  const cards = (words as string[]).map((word, i) => ({
    game_id: game.id,
    word,
    color: colors[i],
    is_revealed: false,
    position: i,
  }))

  // Insert cards
  const { error: cardsError } = await supabase.from('cards').insert(cards)
  if (cardsError) return Response.json({ error: cardsError.message }, { status: 500 })

  // Lock all roles with role_locked_at timestamp
  const now = new Date().toISOString()
  const { error: lockError } = await supabase
    .from('game_players')
    .update({ role_locked_at: now })
    .eq('game_id', game.id)

  if (lockError) return Response.json({ error: lockError.message }, { status: 500 })

  // Activate game
  const { error: gameError } = await supabase
    .from('games')
    .update({
      status: 'active',
      current_team: 'red',
      turn_started_at: now,
    })
    .eq('id', game.id)

  if (gameError) return Response.json({ error: gameError.message }, { status: 500 })

  return Response.json({ ok: true })
}

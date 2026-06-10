import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { createAuthClient } from '@/lib/supabase-auth'
import { supabase as anonClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { session_id, display_name, room_code } = body

  if (!session_id || !display_name?.trim() || !room_code) {
    return Response.json({ error: 'session_id, display_name, and room_code are required' }, { status: 400 })
  }

  const supabase = createServerClient()
  const code = (room_code as string).toUpperCase().trim()

  // Attach user_id if authenticated
  let user_id: string | null = null
  try {
    const authClient = await createAuthClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (user) user_id = user.id
  } catch {}

  // Find game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status')
    .eq('room_code', code)
    .maybeSingle()

  if (gameError) {
    return Response.json({ error: gameError.message }, { status: 500 })
  }
  if (!game) {
    return Response.json({ error: 'Room not found' }, { status: 404 })
  }
  if (game.status !== 'lobby') {
    return Response.json({ error: 'Game has already started' }, { status: 409 })
  }

  // Check if this session already joined
  const { data: existing } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', game.id)
    .eq('session_id', session_id)
    .maybeSingle()

  if (existing) {
    return Response.json({ room_code: code, game_id: game.id, player_id: existing.id })
  }

  // Insert player
  const { data: player, error: playerError } = await supabase
    .from('game_players')
    .insert({
      game_id: game.id,
      session_id,
      display_name: display_name.trim(),
      is_host: false,
      ...(user_id ? { user_id } : {}),
    })
    .select('id')
    .single()

  if (playerError || !player) {
    return Response.json({ error: playerError?.message ?? 'Failed to join game' }, { status: 500 })
  }

  // Let everyone already in the lobby see the new player immediately
  await anonClient.channel(`room:${code}`).send({
    type: 'broadcast',
    event: 'lobby_update',
    payload: {},
  })

  return Response.json({ room_code: code, game_id: game.id, player_id: player.id })
}

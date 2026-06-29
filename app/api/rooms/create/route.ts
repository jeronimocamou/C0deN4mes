import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { createAuthClient } from '@/lib/supabase-auth'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I or O to avoid confusion
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { session_id, display_name, language } = body

  if (!session_id || !display_name?.trim()) {
    return Response.json({ error: 'session_id and display_name are required' }, { status: 400 })
  }

  // Word-pack language for this room; default to English
  const lang = language === 'es' ? 'es' : 'en'

  const supabase = createServerClient()

  // Attach user_id if authenticated
  let user_id: string | null = null
  try {
    const authClient = await createAuthClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (user) user_id = user.id
  } catch {}

  // Generate a unique room code (retry on collision)
  let room_code = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateRoomCode()
    const { data } = await supabase.from('games').select('id').eq('room_code', candidate).maybeSingle()
    if (!data) { room_code = candidate; break }
  }
  if (!room_code) {
    return Response.json({ error: 'Failed to generate unique room code' }, { status: 500 })
  }

  // Insert game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({ room_code, status: 'lobby', language: lang })
    .select('id')
    .single()

  if (gameError || !game) {
    return Response.json({ error: gameError?.message ?? 'Failed to create game' }, { status: 500 })
  }

  // Insert host player
  const { data: player, error: playerError } = await supabase
    .from('game_players')
    .insert({
      game_id: game.id,
      session_id,
      display_name: display_name.trim(),
      is_host: true,
      ...(user_id ? { user_id } : {}),
    })
    .select('id')
    .single()

  if (playerError || !player) {
    return Response.json({ error: playerError?.message ?? 'Failed to create player' }, { status: 500 })
  }

  return Response.json({ room_code, game_id: game.id, player_id: player.id })
}

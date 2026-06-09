import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabase as anonClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { room_code, session_id, message, scope } = await req.json()

  if (!room_code || !session_id || !message?.trim()) {
    return Response.json({ error: 'room_code, session_id, message required' }, { status: 400 })
  }
  if (!['all', 'team'].includes(scope)) {
    return Response.json({ error: 'scope must be all or team' }, { status: 400 })
  }

  const text = message.trim().slice(0, 300)
  const supabase = createServerClient()

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('room_code', room_code)
    .maybeSingle()

  if (!game) return Response.json({ error: 'Room not found' }, { status: 404 })

  const { data: player } = await supabase
    .from('game_players')
    .select('display_name, team')
    .eq('game_id', game.id)
    .eq('session_id', session_id)
    .maybeSingle()

  if (!player) return Response.json({ error: 'Not in this game' }, { status: 403 })

  await anonClient.channel(`room:${room_code}`).send({
    type: 'broadcast',
    event: 'chat_message',
    payload: {
      sender: player.display_name,
      team: player.team,
      message: text,
      scope,
      ts: Date.now(),
    },
  })

  return Response.json({ ok: true })
}

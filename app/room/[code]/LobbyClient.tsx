'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import ChatSidebar from '@/app/components/ChatSidebar'

type Player = {
  id: string
  session_id: string
  display_name: string
  team: string | null
  role: string | null
  is_host: boolean
}

type GameStatus = 'lobby' | 'active' | 'finished'

export default function LobbyClient({ code }: { code: string }) {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [gameId, setGameId] = useState<string | null>(null)
  const [gameStatus, setGameStatus] = useState<GameStatus>('lobby')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Load session from localStorage
  useEffect(() => {
    setSessionId(localStorage.getItem('session_id'))
  }, [])

  // Prefetch the board so the lobby → game transition is instant
  useEffect(() => {
    router.prefetch(`/room/${code}/game`)
  }, [router, code])

  // Fetch game + players
  const fetchGame = useCallback(async () => {
    const { data: game } = await supabase
      .from('games')
      .select('id, status')
      .eq('room_code', code)
      .maybeSingle()

    if (!game) { setError('Room not found'); return }
    setGameId(game.id)
    setGameStatus(game.status as GameStatus)

    if (game.status === 'active') {
      router.push(`/room/${code}/game`)
      return
    }

    const { data: rows } = await supabase
      .from('game_players')
      .select('id, session_id, display_name, team, role, is_host')
      .eq('game_id', game.id)

    setPlayers(rows ?? [])
  }, [code, router])

  // Resolve my player id once session + players are known
  useEffect(() => {
    if (!sessionId || players.length === 0) return
    const me = players.find(p => p.session_id === sessionId)
    if (me) setMyPlayerId(me.id)
  }, [sessionId, players])

  // Initial fetch + realtime subscription
  useEffect(() => {
    fetchGame()
  }, [fetchGame])

  // Polling fallback so the lobby stays fresh even if realtime events are missed
  useEffect(() => {
    const id = setInterval(fetchGame, 3000)
    return () => clearInterval(id)
  }, [fetchGame])

  useEffect(() => {
    if (!gameId) return

    const channel = supabase
      .channel(`room:${code}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_players',
      }, (payload) => {
        const row = (payload.new ?? payload.old) as { game_id?: string } | null
        if (row?.game_id === gameId) fetchGame()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
      }, (payload) => {
        if (payload.new.id !== gameId) return
        const status = payload.new.status as GameStatus
        setGameStatus(status)
        if (status === 'active') router.push(`/room/${code}/game`)
      })
      .on('broadcast', { event: 'lobby_update' }, () => {
        fetchGame()
      })
      .on('broadcast', { event: 'game_started' }, () => {
        router.push(`/room/${code}/game`)
      })
      .subscribe()

    channelRef.current = channel
    return () => {
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [gameId, code, fetchGame, router])

  async function updateMyRole(field: 'team' | 'role', value: string) {
    if (!myPlayerId) return
    // Switching teams resets role so you re-pick on the new team
    const update = field === 'team' ? { team: value, role: null } : { role: value }
    await supabase
      .from('game_players')
      .update(update)
      .eq('id', myPlayerId)
    fetchGame()
    // Tell other lobby clients to refetch right away
    channelRef.current?.send({ type: 'broadcast', event: 'lobby_update', payload: {} })
  }

  async function handleStartGame() {
    setStarting(true)
    setError('')
    try {
      const res = await fetch('/api/rooms/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: code, session_id: sessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start game')
      // Host navigates immediately — don't wait for realtime
      router.push(`/room/${code}/game`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setStarting(false)
    }
  }

  const me = players.find(p => p.session_id === sessionId)
  const redTeam = players.filter(p => p.team === 'red')
  const blueTeam = players.filter(p => p.team === 'blue')
  const unassigned = players.filter(p => !p.team)

  const hasRedSpymaster = redTeam.some(p => p.role === 'spymaster')
  const hasBlueSpymaster = blueTeam.some(p => p.role === 'spymaster')
  const canStart = hasRedSpymaster && hasBlueSpymaster && redTeam.length > 0 && blueTeam.length > 0

  if (error && players.length === 0) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="font-mono text-red-400">{error}</p>
      </main>
    )
  }

  return (
    <div className={`min-h-screen bg-[#0a0a0a] text-white transition-[padding] ${chatOpen ? 'sm:pr-72' : ''}`}>
    <main className="px-4 py-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">room code</p>
        <h1 className="font-mono text-5xl font-bold tracking-widest text-white">{code}</h1>
        <p className="mt-2 font-mono text-xs text-zinc-600">share this code with friends</p>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Red team */}
        <TeamColumn
          color="red"
          players={redTeam}
          me={me}
          spymasterTaken={redTeam.some(p => p.role === 'spymaster')}
          onJoinTeam={() => updateMyRole('team', 'red')}
          onPickRole={(role) => updateMyRole('role', role)}
        />
        {/* Blue team */}
        <TeamColumn
          color="blue"
          players={blueTeam}
          me={me}
          spymasterTaken={blueTeam.some(p => p.role === 'spymaster')}
          onJoinTeam={() => updateMyRole('team', 'blue')}
          onPickRole={(role) => updateMyRole('role', role)}
        />
      </div>

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="font-mono text-xs text-zinc-500 uppercase tracking-wider mb-3">waiting to pick team</p>
          <div className="flex flex-wrap gap-3">
            {unassigned.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <PlayerAvatar name={p.display_name} team={null} />
                <span className="font-mono text-sm text-zinc-300">
                  {p.display_name}{p.is_host ? ' ★' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start game (host only) */}
      {me?.is_host && (
        <div className="mt-4">
          {error && <p className="font-mono text-xs text-red-400 mb-2 text-center">{error}</p>}
          <button
            onClick={handleStartGame}
            disabled={!canStart || starting}
            className="w-full bg-white text-black font-mono font-bold py-3 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
          >
            {starting ? 'Starting…' : 'Start Game'}
          </button>
          {!canStart && (
            <p className="mt-2 font-mono text-xs text-zinc-600 text-center">
              each team needs at least one player and a spymaster
            </p>
          )}
        </div>
      )}

      {!me?.is_host && (
        <p className="mt-6 font-mono text-xs text-zinc-700 text-center">waiting for host to start…</p>
      )}

      <ChatSidebar roomCode={code} sessionId={sessionId} myTeam={me?.team ?? null} onOpenChange={setChatOpen} />
    </main>
    </div>
  )
}

function PlayerAvatar({ name, team }: { name: string; team: 'red' | 'blue' | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const bg = team === 'red' ? 'bg-red-800' : team === 'blue' ? 'bg-blue-800' : 'bg-zinc-700'
  const ring = team === 'red' ? 'ring-red-600' : team === 'blue' ? 'ring-blue-600' : 'ring-zinc-600'
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-mono text-sm font-bold text-white ${bg} ring-1 ${ring}`}>
      {initial}
    </div>
  )
}

function TeamColumn({
  color,
  players,
  me,
  spymasterTaken,
  onJoinTeam,
  onPickRole,
}: {
  color: 'red' | 'blue'
  players: Player[]
  me: Player | undefined
  spymasterTaken: boolean
  onJoinTeam: () => void
  onPickRole: (role: 'spymaster' | 'operative') => void
}) {
  const isMyTeam = me?.team === color
  const borderColor = color === 'red' ? 'border-red-800' : 'border-blue-800'
  const headerColor = color === 'red' ? 'text-red-500' : 'text-blue-500'
  const joinBg = color === 'red' ? 'bg-red-700 hover:bg-red-600' : 'bg-blue-700 hover:bg-blue-600'

  return (
    <div className={`bg-zinc-900 border ${borderColor} rounded-xl p-4 space-y-3`}>
      <h2 className={`font-mono text-sm font-bold uppercase tracking-widest ${headerColor}`}>
        {color} team
      </h2>

      {players.map(p => (
        <div key={p.id} className="flex items-center gap-3">
          <PlayerAvatar name={p.display_name} team={color} />
          <div className="flex-1 min-w-0">
            <span className="font-mono text-sm text-zinc-200 truncate block">
              {p.display_name}{p.is_host ? ' ★' : ''}
            </span>
            <span className="font-mono text-[10px] text-zinc-600">{p.role ?? 'no role'}</span>
          </div>
        </div>
      ))}

      {/* Join / Switch team button — shown when not on this team */}
      {!isMyTeam && me !== undefined && (
        <button
          onClick={onJoinTeam}
          className={`w-full ${joinBg} text-white font-mono text-xs py-2 rounded-lg transition-colors`}
        >
          {me.team ? `Switch to ${color}` : `Join ${color}`}
        </button>
      )}

      {/* Role picker — always shown when on this team so you can switch */}
      {isMyTeam && (
        <div className="flex gap-2">
          <button
            onClick={() => onPickRole('operative')}
            className={`flex-1 font-mono text-xs py-2 rounded-lg transition-colors ${
              me?.role === 'operative'
                ? 'bg-zinc-500 text-white ring-1 ring-white/30'
                : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
            }`}
          >
            Operative
          </button>
          <button
            onClick={() => !spymasterTaken && onPickRole('spymaster')}
            disabled={spymasterTaken && me?.role !== 'spymaster'}
            className={`flex-1 font-mono text-xs py-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              me?.role === 'spymaster'
                ? 'bg-zinc-500 text-white ring-1 ring-white/30'
                : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
            }`}
            title={spymasterTaken && me?.role !== 'spymaster' ? 'Spymaster already taken' : undefined}
          >
            Spymaster
          </button>
        </div>
      )}
    </div>
  )
}

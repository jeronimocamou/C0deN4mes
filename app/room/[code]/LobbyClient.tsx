'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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

  // Load session from localStorage
  useEffect(() => {
    setSessionId(localStorage.getItem('session_id'))
  }, [])

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

  useEffect(() => {
    if (!gameId) return

    const channel = supabase
      .channel(`room:${code}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${gameId}`,
      }, () => { fetchGame() })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      }, (payload) => {
        const status = payload.new.status as GameStatus
        setGameStatus(status)
        if (status === 'active') router.push(`/room/${code}/game`)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId, code, fetchGame, router])

  async function updateMyRole(field: 'team' | 'role', value: string) {
    if (!myPlayerId) return
    await supabase
      .from('game_players')
      .update({ [field]: value })
      .eq('id', myPlayerId)
    fetchGame()
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
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 py-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1">room code</p>
        <h1 className="font-mono text-5xl font-bold tracking-widest text-white">{code}</h1>
        <p className="mt-2 font-mono text-xs text-zinc-600">share this code with friends</p>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-2 gap-4 mb-6">
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
          <div className="flex flex-wrap gap-2">
            {unassigned.map(p => (
              <span key={p.id} className="font-mono text-sm bg-zinc-800 px-3 py-1 rounded-full text-zinc-300">
                {p.display_name}{p.is_host ? ' ★' : ''}
              </span>
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

      <ChatSidebar roomCode={code} sessionId={sessionId} myTeam={me?.team ?? null} />
    </main>
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
        <div key={p.id} className="flex items-center justify-between">
          <span className="font-mono text-sm text-zinc-300">
            {p.display_name}{p.is_host ? ' ★' : ''}
          </span>
          <span className="font-mono text-xs text-zinc-600">
            {p.role ?? '—'}
          </span>
        </div>
      ))}

      {!isMyTeam && (
        <button
          onClick={onJoinTeam}
          className={`w-full ${joinBg} text-white font-mono text-xs py-2 rounded-lg transition-colors`}
        >
          Join {color}
        </button>
      )}

      {isMyTeam && !me?.role && (
        <div className="flex gap-2">
          <button
            onClick={() => onPickRole('operative')}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-mono text-xs py-2 rounded-lg transition-colors"
          >
            Operative
          </button>
          <button
            onClick={() => !spymasterTaken && onPickRole('spymaster')}
            disabled={spymasterTaken}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-mono text-xs py-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={spymasterTaken ? 'Spymaster already taken' : undefined}
          >
            Spymaster
          </button>
        </div>
      )}

      {isMyTeam && me?.role && (
        <p className="font-mono text-xs text-zinc-500 text-center">you are {me.role}</p>
      )}
    </div>
  )
}

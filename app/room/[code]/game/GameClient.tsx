'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ChatSidebar from '@/app/components/ChatSidebar'

type Card = {
  id: string
  word: string
  position: number
  is_revealed: boolean
  color: string | null // null for operatives on unrevealed cards
}

type GameState = {
  current_team: string
  winner: string | null
  turn_started_at: string | null
  red_words_remaining: number
  blue_words_remaining: number
}

type PlayerInfo = { role: string; team: string; is_host: boolean }

type Clue = { word: string; count: number; team: string } | null

export default function GameClient({ code }: { code: string }) {
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [game, setGame] = useState<GameState | null>(null)
  const [player, setPlayer] = useState<PlayerInfo | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [clue, setClue] = useState<Clue>(null)
  const [clueWord, setClueWord] = useState('')
  const [clueCount, setClueCount] = useState('1')
  const [submittingClue, setSubmittingClue] = useState(false)
  const [revealingId, setRevealingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setSessionId(localStorage.getItem('session_id'))
  }, [])

  const fetchCards = useCallback(async (sid: string) => {
    const res = await fetch('/api/rooms/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_code: code, session_id: sid }),
    })
    if (!res.ok) return
    const data = await res.json()
    setCards(data.cards)
    setGame(data.game)
    setPlayer(data.player)
  }, [code])

  useEffect(() => {
    if (!sessionId) return
    fetchCards(sessionId)
  }, [sessionId, fetchCards])

  // Turn timer
  useEffect(() => {
    if (!game?.turn_started_at) return
    if (timerRef.current) clearInterval(timerRef.current)
    const deadline = new Date(game.turn_started_at).getTime() + 90_000
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setTimeLeft(left)
    }, 500)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [game?.turn_started_at])

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return
    const channel = supabase
      .channel(`room:${code}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'cards',
      }, () => { fetchCards(sessionId) })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
      }, (payload) => {
        if (payload.new.status === 'lobby') {
          router.push(`/room/${code}`)
        } else {
          fetchCards(sessionId)
        }
      })
      .on('broadcast', { event: 'clue_given' }, ({ payload }) => {
        setClue(payload as Clue)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId, code, fetchCards])

  async function handleReveal(card: Card) {
    if (!sessionId || card.is_revealed || revealingId) return
    setRevealingId(card.id)
    setError('')
    const res = await fetch('/api/rooms/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_code: code, session_id: sessionId, card_id: card.id }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error)
    else fetchCards(sessionId)
    setRevealingId(null)
  }

  async function handleEndTurn() {
    if (!sessionId || !game) return
    // End turn by switching teams server-side via a mini update
    await fetch('/api/rooms/end-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_code: code, session_id: sessionId }),
    })
    setClue(null)
    fetchCards(sessionId)
  }

  async function handlePlayAgain() {
    if (!sessionId) return
    const res = await fetch('/api/rooms/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_code: code, session_id: sessionId }),
    })
    if (res.ok) router.push(`/room/${code}`)
  }

  async function handleGiveClue(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionId || !clueWord.trim()) return
    setSubmittingClue(true)
    const res = await fetch('/api/rooms/clue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_code: code, session_id: sessionId, word: clueWord, count: Number(clueCount) }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error)
    else { setClue({ word: clueWord.toUpperCase(), count: Number(clueCount), team: player!.team }); setClueWord(''); setClueCount('1') }
    setSubmittingClue(false)
  }

  if (!game || !player || cards.length === 0) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="font-mono text-zinc-500 animate-pulse">Loading board…</p>
      </main>
    )
  }

  const isMyTurn = player.team === game.current_team
  const isSpymaster = player.role === 'spymaster'
  const isOperative = player.role === 'operative'
  const gameOver = !!game.winner

  // Flash top bar on turn change
  const [flashTeam, setFlashTeam] = useState<string | null>(null)
  const prevTeamRef = useRef<string>(game.current_team)
  useEffect(() => {
    if (prevTeamRef.current !== game.current_team) {
      setFlashTeam(game.current_team)
      const t = setTimeout(() => setFlashTeam(null), 800)
      prevTeamRef.current = game.current_team
      return () => clearTimeout(t)
    }
  }, [game.current_team])

  const topBarFlash = flashTeam === 'red'
    ? 'animate-flash-red'
    : flashTeam === 'blue'
    ? 'animate-flash-blue'
    : ''

  return (
    <main className="h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-zinc-800 transition-colors ${topBarFlash}`}>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-zinc-500">{code}</span>
          <ScoreBar red={game.red_words_remaining} blue={game.blue_words_remaining} />
        </div>
        <div className="flex items-center gap-3">
          {timeLeft !== null && !gameOver && (
            <span className={`font-mono text-sm tabular-nums ${timeLeft <= 10 ? 'text-red-400' : 'text-zinc-400'}`}>
              {timeLeft}s
            </span>
          )}
          <TurnBadge team={game.current_team} isMyTurn={isMyTurn} gameOver={gameOver} winner={game.winner} />
        </div>
      </div>

      {/* Clue display */}
      {clue && (
        <div className={`text-center py-2 font-mono text-sm border-b border-zinc-800 ${clue.team === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
          Clue: <span className="font-bold">{clue.word}</span> &nbsp;·&nbsp; {clue.count}
        </div>
      )}

      {/* Game over banner */}
      {gameOver && (
        <div className={`text-center py-3 font-mono font-bold text-lg ${game.winner === 'red' ? 'bg-red-900/40 text-red-300' : 'bg-blue-900/40 text-blue-300'}`}>
          {game.winner?.toUpperCase()} TEAM WINS!
          <span className="ml-4 inline-flex gap-3 items-center">
            {player?.is_host && (
              <button
                onClick={handlePlayAgain}
                className="text-sm font-bold bg-white text-black px-3 py-1 rounded-lg hover:bg-zinc-200 transition-colors"
              >
                Play Again
              </button>
            )}
            <button onClick={() => router.push('/')} className="text-sm font-normal text-zinc-400 hover:text-white underline">
              home
            </button>
          </span>
        </div>
      )}

      {/* Board */}
      <div className="flex-1 p-2 sm:p-4 overflow-hidden min-h-0 flex flex-col justify-center">
        <div className="grid grid-cols-5 grid-rows-5 gap-1.5 sm:gap-2 w-full max-w-4xl mx-auto" style={{height: 'min(100%, 70vw * 5/3)'}}>
          {cards.map(card => (
            <CardTile
              key={card.id}
              card={card}
              isSpymaster={isSpymaster}
              canReveal={isOperative && isMyTurn && !gameOver && !card.is_revealed}
              isRevealing={revealingId === card.id}
              onClick={() => handleReveal(card)}
            />
          ))}
        </div>
      </div>

      {/* Action bar */}
      {!gameOver && (
        <div className="border-t border-zinc-800 px-4 py-3 pr-20 sm:pr-4">
          {error && <p className="font-mono text-xs text-red-400 mb-2 text-center">{error}</p>}

          {/* Spymaster clue input */}
          {isSpymaster && isMyTurn && (
            <form onSubmit={handleGiveClue} className="flex flex-wrap items-center gap-2 max-w-xl mx-auto">
              <input
                type="text"
                placeholder="Clue word"
                value={clueWord}
                onChange={e => setClueWord(e.target.value.replace(/\s/g, ''))}
                className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 uppercase"
                maxLength={30}
              />
              <select
                value={clueCount}
                onChange={e => setClueCount(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-sm text-white focus:outline-none"
              >
                {[0,1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n === 0 ? '∞' : n}</option>)}
              </select>
              <button
                type="submit"
                disabled={submittingClue || !clueWord.trim()}
                className="bg-white text-black font-mono text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-40"
              >
                Give Clue
              </button>
            </form>
          )}

          {/* Operative end turn — spymasters cannot end turn, only operatives */}
          {isOperative && isMyTurn && clue && (
            <div className="flex justify-center">
              <button
                onClick={handleEndTurn}
                className="font-mono text-sm text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 px-4 py-2 rounded-lg transition-colors"
              >
                End Turn
              </button>
            </div>
          )}

          {/* Waiting */}
          {!isMyTurn && (
            <p className="font-mono text-xs text-zinc-600 text-center">
              waiting for {game.current_team} team…
            </p>
          )}
          {isSpymaster && !isMyTurn && (
            <p className="font-mono text-xs text-zinc-700 text-center mt-1">
              you are the {player.team} spymaster
            </p>
          )}
        </div>
      )}
      <ChatSidebar roomCode={code} sessionId={sessionId} myTeam={player?.team ?? null} />
    </main>
  )
}

function CardTile({ card, isSpymaster, canReveal, isRevealing, onClick }: {
  card: Card
  isSpymaster: boolean
  canReveal: boolean
  isRevealing: boolean
  onClick: () => void
}) {
  const color = card.color
  const clickable = canReveal && !isRevealing

  // Front face — unrevealed appearance
  let frontBg = 'bg-zinc-800 border border-zinc-700'
  let frontText = 'text-zinc-200'
  if (isSpymaster && color) {
    if (color === 'red') { frontBg = 'bg-red-950 border border-red-800'; frontText = 'text-red-200' }
    else if (color === 'blue') { frontBg = 'bg-blue-950 border border-blue-800'; frontText = 'text-blue-200' }
    else if (color === 'assassin') { frontBg = 'bg-zinc-950 border border-red-900 shadow-[0_0_12px_2px_rgba(185,28,28,0.5)]'; frontText = 'text-red-400' }
    else { frontBg = 'bg-zinc-800 border border-zinc-600'; frontText = 'text-zinc-400' }
  }

  // Back face — revealed appearance
  let backBg = 'bg-zinc-600 border border-zinc-500'
  let backText = 'text-zinc-200'
  if (color === 'red') { backBg = 'bg-red-700 border border-red-600'; backText = 'text-white' }
  else if (color === 'blue') { backBg = 'bg-blue-700 border border-blue-600'; backText = 'text-white' }
  else if (color === 'assassin') { backBg = 'bg-black border border-zinc-600'; backText = 'text-zinc-400' }

  const sharedCard = `rounded-lg sm:rounded-xl font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wide sm:tracking-wider text-center leading-tight p-1.5 sm:p-3`

  return (
    <div
      className={`card-3d w-full h-full ${clickable ? 'cursor-pointer' : 'cursor-default'} ${isRevealing ? 'opacity-70' : 'opacity-100'}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className={`card-inner ${card.is_revealed ? 'flipped' : ''}`}>
        {/* Front */}
        <div className={`card-face ${frontBg} ${frontText} ${sharedCard} ${clickable ? 'hover:brightness-110' : ''}`}>
          {isSpymaster && color === 'assassin' ? (
            <span className="flex flex-col items-center gap-0.5">
              <span className="text-base sm:text-lg">💀</span>
              <span className="text-[8px] sm:text-[10px]">{card.word}</span>
            </span>
          ) : card.word}
        </div>
        {/* Back */}
        <div className={`card-face card-back ${backBg} ${backText} ${sharedCard}`}>
          {color === 'assassin' ? '💀' : card.word}
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ red, blue }: { red: number; blue: number }) {
  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      <span className="text-red-500 font-bold">{red}</span>
      <span className="text-zinc-600">·</span>
      <span className="text-blue-500 font-bold">{blue}</span>
    </div>
  )
}

function TurnBadge({ team, isMyTurn, gameOver, winner }: {
  team: string; isMyTurn: boolean; gameOver: boolean; winner: string | null
}) {
  if (gameOver) return null
  const color = team === 'red' ? 'bg-red-700' : 'bg-blue-700'
  return (
    <span className={`${color} font-mono text-xs font-bold px-2 py-1 rounded-full`}>
      {isMyTurn ? 'YOUR TURN' : `${team.toUpperCase()} TURN`}
    </span>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase-browser'

function getOrCreateSessionId(): string {
  let id = localStorage.getItem('session_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('session_id', id)
  }
  return id
}

export default function HomeClient() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<'create' | 'join' | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('display_name')
    if (saved) setDisplayName(saved)
    nameRef.current?.focus()

    // Check auth state
    const supabase = createBrowserSupabase()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email ?? null)
    })
  }, [])

  function saveName(name: string) {
    setDisplayName(name)
    localStorage.setItem('display_name', name)
  }

  async function handleCreate() {
    if (!displayName.trim()) { setError('Enter your name first.'); return }
    setError('')
    setLoading('create')
    try {
      const sessionId = getOrCreateSessionId()
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, display_name: displayName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create room')
      router.push(`/room/${data.room_code}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setLoading(null)
    }
  }

  async function handleJoin() {
    const code = roomCode.trim().toUpperCase()
    if (!displayName.trim()) { setError('Enter your name first.'); return }
    if (code.length !== 4) { setError('Room code must be 4 letters.'); return }
    setError('')
    setLoading('join')
    try {
      const sessionId = getOrCreateSessionId()
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, display_name: displayName.trim(), room_code: code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to join room')
      router.push(`/room/${code}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setLoading(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      {/* Title */}
      <div className="mb-12 text-center select-none">
        <h1 className="font-mono text-6xl sm:text-7xl font-bold tracking-tight">
          <span className="text-red-500">c</span>
          <span className="text-white">0</span>
          <span className="text-white">d</span>
          <span className="text-white">e</span>
          <span className="text-blue-500">n</span>
          <span className="text-white">4</span>
          <span className="text-white">m</span>
          <span className="text-white">e</span>
          <span className="text-white">s</span>
        </h1>
        <p className="mt-3 text-zinc-500 font-mono text-sm tracking-widest uppercase">
          real-time multiplayer codenames
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-6">

        {/* Name input */}
        <div className="space-y-1.5">
          <label className="block font-mono text-xs text-zinc-400 uppercase tracking-wider">
            Your name
          </label>
          <input
            ref={nameRef}
            type="text"
            placeholder="e.g. Agent X"
            value={displayName}
            onChange={e => saveName(e.target.value)}
            maxLength={20}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white font-mono placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>

        {/* Create room */}
        <button
          onClick={handleCreate}
          disabled={loading !== null}
          className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-semibold py-3 rounded-lg transition-colors"
        >
          {loading === 'create' ? 'Creating…' : 'Create Room'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="font-mono text-xs text-zinc-600">or join</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Join room */}
        <div className="space-y-1.5">
          <label className="block font-mono text-xs text-zinc-400 uppercase tracking-wider">
            Room code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="XKCD"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              maxLength={4}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white font-mono placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 uppercase tracking-widest text-center"
            />
            <button
              onClick={handleJoin}
              disabled={loading !== null}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-semibold px-5 rounded-lg transition-colors"
            >
              {loading === 'join' ? '…' : 'Join'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="font-mono text-xs text-red-400 text-center">{error}</p>
        )}
      </div>

      <div className="mt-8 font-mono text-xs text-zinc-600 flex items-center gap-3">
        {userEmail ? (
          <>
            <a href="/profile" className="hover:text-zinc-400 transition-colors underline">
              {userEmail}
            </a>
            <span>·</span>
            <a href="/profile" className="hover:text-zinc-400 transition-colors">
              stats & profile →
            </a>
          </>
        ) : (
          <>
            <span>no account needed · just play</span>
            <span>·</span>
            <a href="/auth/login" className="hover:text-zinc-400 transition-colors underline">
              sign in for stats
            </a>
          </>
        )}
      </div>
    </main>
  )
}

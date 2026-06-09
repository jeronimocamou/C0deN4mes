'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

type Props = {
  email: string
  displayName: string
  gamesPlayed: number
  gamesWon: number
}

export default function ProfileClient({ email, displayName, gamesPlayed, gamesWon }: Props) {
  const router = useRouter()
  const [name, setName] = useState(displayName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createBrowserSupabase()

  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0
  const gamesLost = gamesPlayed - gamesWon

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('user_stats').upsert({
        user_id: user.id,
        display_name: name.trim(),
      }, { onConflict: 'user_id' })
      // Also save to localStorage for game use
      localStorage.setItem('display_name', name.trim())
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 py-10 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <a href="/" className="font-mono text-xl font-bold">
          <span className="text-red-500">c</span>0den<span className="text-blue-500">4</span>mes
        </a>
        <button
          onClick={handleSignOut}
          className="font-mono text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Avatar / name */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-3 text-2xl font-mono font-bold text-zinc-300">
          {name.trim().charAt(0).toUpperCase() || '?'}
        </div>
        <p className="font-mono text-xs text-zinc-600">{email}</p>
      </div>

      {/* Display name */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <p className="font-mono text-xs text-zinc-500 uppercase tracking-wider mb-3">Display name</p>
        <form onSubmit={handleSaveName} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white font-mono text-xs px-4 py-2 rounded-lg transition-colors"
          >
            {saved ? '✓' : saving ? '…' : 'Save'}
          </button>
        </form>
        <p className="font-mono text-xs text-zinc-700 mt-2">this name is used in all your games</p>
      </div>

      {/* Stats */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="font-mono text-xs text-zinc-500 uppercase tracking-wider mb-4">Stats</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <Stat label="Played" value={gamesPlayed} />
          <Stat label="Won" value={gamesWon} color="text-green-400" />
          <Stat label="Lost" value={gamesLost} color="text-red-400" />
        </div>
        {gamesPlayed > 0 && (
          <div className="mt-4">
            <div className="flex justify-between font-mono text-xs text-zinc-500 mb-1">
              <span>Win rate</span>
              <span className="text-white">{winRate}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${winRate}%` }}
              />
            </div>
          </div>
        )}
        {gamesPlayed === 0 && (
          <p className="font-mono text-xs text-zinc-700 text-center mt-2">play a game to start tracking stats</p>
        )}
      </div>
    </main>
  )
}

function Stat({ label, value, color = 'text-white' }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p className={`font-mono text-2xl font-bold ${color}`}>{value}</p>
      <p className="font-mono text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createBrowserSupabase()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/profile')
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <a href="/" className="font-mono text-2xl font-bold tracking-tight">
          <span className="text-red-500">c</span>0den<span className="text-blue-500">4</span>mes
        </a>
        <p className="mt-2 font-mono text-xs text-zinc-500">set a new password</p>
      </div>

      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="new password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={6}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <input
            type="password"
            placeholder="confirm new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white font-mono text-sm font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? '…' : 'Update password'}
          </button>
        </form>
        {error && <p className="font-mono text-xs text-red-400 text-center">{error}</p>}
      </div>
    </main>
  )
}

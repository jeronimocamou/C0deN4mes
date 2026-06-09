'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Logo from '@/app/components/Logo'

type Mode = 'login' | 'signup' | 'forgot'

export default function LoginClient() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const supabase = createBrowserSupabase()
  const username = email.split('@')[0]

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setMessage('Password reset email sent — check your inbox.'); setLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
      if (error) { setError(error.message); setLoading(false); return }
      // Pre-populate display_name from email prefix
      if (data.user) {
        await supabase.from('user_stats').upsert({
          user_id: data.user.id,
          display_name: username,
        }, { onConflict: 'user_id' })
        localStorage.setItem('display_name', username)
      }
      router.push('/profile')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) { setError(error.message); setLoading(false) }
      else router.push('/profile')
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <a href="/"><Logo size="sm" /></a>
        <p className="mt-3 font-mono text-xs text-zinc-600">sign in with your email — not your display name</p>
      </div>

      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-5">
        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-zinc-700">
          <button
            onClick={() => { setMode('login'); setError(''); setMessage('') }}
            className={`flex-1 font-mono text-xs py-2 transition-colors ${mode === 'login' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Sign in
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); setMessage('') }}
            className={`flex-1 font-mono text-xs py-2 transition-colors ${mode === 'signup' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Create account
          </button>
        </div>

        {mode === 'forgot' ? (
          <form onSubmit={handleForgot} className="space-y-3">
            <p className="font-mono text-xs text-zinc-400 text-center">enter your email to reset your password</p>
            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white font-mono text-sm font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? '…' : 'Send reset email'}
            </button>
            <button type="button" onClick={() => { setMode('login'); setError(''); setMessage('') }} className="w-full font-mono text-xs text-zinc-600 hover:text-zinc-400">
              ← back to sign in
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="email"
                placeholder="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
              {mode === 'signup' && username && (
                <p className="font-mono text-xs text-zinc-500 mt-1.5 pl-1">
                  your username will be <span className="text-white">{username}</span>
                </p>
              )}
            </div>
            <div>
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
              {mode === 'login' && (
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setMessage('') }} className="font-mono text-xs text-zinc-600 hover:text-zinc-400 mt-1.5 pl-1">
                  forgot password?
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white font-mono text-sm font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        )}

        {error && <p className="font-mono text-xs text-red-400 text-center">{error}</p>}
        {message && <p className="font-mono text-xs text-green-400 text-center">{message}</p>}
      </div>

      <button onClick={() => router.push('/')} className="mt-6 font-mono text-xs text-zinc-700 hover:text-zinc-500">
        ← back to game
      </button>
    </main>
  )
}

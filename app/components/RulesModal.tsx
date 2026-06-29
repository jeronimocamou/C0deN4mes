'use client'

import { useEffect } from 'react'

export default function RulesModal({ onClose }: { onClose: () => void }) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-mono text-xl font-bold text-white tracking-wide">How to play</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white font-mono text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 font-mono text-sm text-zinc-300 leading-relaxed">
          {/* Object */}
          <Section title="The object">
            <p>
              Two teams — <Red>red</Red> and <Blue>blue</Blue> — race to find all of their
              own agents on a grid of 25 word cards. The first team to find all their words
              wins. Find the single <span className="text-white font-bold">assassin</span> card
              and your team loses instantly.
            </p>
          </Section>

          {/* Roles */}
          <Section title="The two roles">
            <ul className="space-y-2">
              <li>
                <span className="text-white font-bold">Spymaster</span> — sees the secret
                color of every card and gives one-word clues. One per team.
              </li>
              <li>
                <span className="text-white font-bold">Operative</span> — sees only the words
                and guesses which cards belong to their team. Each team needs at least one.
              </li>
            </ul>
          </Section>

          {/* How a turn works */}
          <Section title="How a turn works">
            <ol className="space-y-2 list-decimal list-inside">
              <li>
                Your spymaster gives a clue: <span className="text-white">one word</span> + a{' '}
                <span className="text-white">number</span>.
                <p className="text-zinc-400 mt-1 ml-5">
                  e.g. <span className="text-white">&quot;Ocean&nbsp;2&quot;</span> hints that 2
                  of your words relate to the ocean (say WAVE and SHELL).
                </p>
              </li>
              <li>Your operatives tap the cards they think are theirs.</li>
              <li>
                Each tap flips the card to its true color:
                <ul className="mt-1 ml-5 space-y-1 text-zinc-400">
                  <li><Red>Your color</Red> → correct, keep guessing.</li>
                  <li><Blue>Wrong color</Blue> or grey neutral → your turn ends immediately.</li>
                  <li>💀 Assassin → your team loses the game on the spot.</li>
                </ul>
              </li>
              <li>Hit a wrong card or press <span className="text-white">End Turn</span>, and play passes to the other team.</li>
            </ol>
          </Section>

          {/* The board */}
          <Section title="Getting around the site">
            <ul className="space-y-2">
              <li>
                <span className="text-white font-bold">Create Room</span> to host, or{' '}
                <span className="text-white font-bold">Join</span> with a 4-letter code a
                friend shares.
              </li>
              <li>
                In the <span className="text-white">lobby</span>, everyone picks a team and a
                role. The host starts once both teams have a spymaster and a player.
              </li>
              <li>
                The <span className="text-white">board</span> shows the score, whose turn it is,
                and the current clue up top. The 💬 chat lives in the bottom-right corner.
              </li>
              <li>
                Open a room link after a game has started and you&apos;ll{' '}
                <span className="text-white">spectate</span> — watch and chat, but no peeking at
                colors.
              </li>
              <li>
                <span className="text-white">Sign in</span> (optional) to track your wins,
                losses, and win rate on your profile.
              </li>
            </ul>
          </Section>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-mono text-sm py-3 rounded-xl transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs uppercase tracking-widest text-zinc-400 mb-2">{title}</h3>
      {children}
    </section>
  )
}

function Red({ children }: { children: React.ReactNode }) {
  return <span className="text-red-400 font-bold">{children}</span>
}
function Blue({ children }: { children: React.ReactNode }) {
  return <span className="text-blue-400 font-bold">{children}</span>
}

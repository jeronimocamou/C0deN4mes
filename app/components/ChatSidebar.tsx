'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type ChatMessage = {
  id: string
  sender: string
  team: string | null
  message: string
  ts: number
}

type Props = {
  roomCode: string
  sessionId: string | null
  myTeam: string | null
  onOpenChange?: (open: boolean) => void
}

export default function ChatSidebar({ roomCode, sessionId, myTeam, onOpenChange }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const openRef = useRef(false)

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev.slice(-199), msg])
    // Only count as unread when the sidebar is closed
    if (!openRef.current) setUnread(prev => prev + 1)
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${roomCode}`)
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        addMessage({
          id: `${payload.ts}-${payload.sender}`,
          sender: payload.sender,
          team: payload.team,
          message: payload.message,
          ts: payload.ts,
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomCode, addMessage])

  // Scroll to bottom on new messages when open
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Clear unread when opened, and let the parent shift its layout
  useEffect(() => {
    openRef.current = open
    if (open) setUnread(0)
    onOpenChange?.(open)
  }, [open, onOpenChange])

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const visibleMessages = messages

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !sessionId || sending) return
    setSending(true)
    await fetch('/api/rooms/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_code: roomCode,
        session_id: sessionId,
        message: input.trim(),
        scope: 'all',
      }),
    })
    setInput('')
    setSending(false)
    inputRef.current?.focus()
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-16 sm:bottom-8 right-4 z-40 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-mono text-xs px-3 py-2 rounded-full shadow-lg transition-colors flex items-center gap-2"
      >
        💬
        {!open && unread > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        {open ? 'Close' : 'Chat'}
      </button>

      {/* Sidebar */}
      {open && (
        <div className="fixed right-0 top-0 h-full w-full sm:w-72 bg-zinc-950 border-l border-zinc-800 z-30 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="font-mono text-sm font-bold text-white">Chat</span>
            <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white font-mono text-xs">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
            {visibleMessages.length === 0 && (
              <p className="font-mono text-xs text-zinc-700 text-center mt-4">
                No messages yet
              </p>
            )}
            {visibleMessages.map(m => (
              <MessageBubble key={m.id} msg={m} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex gap-2 px-3 py-3 border-t border-zinc-800">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Message everyone…"
              maxLength={300}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 text-white font-mono text-xs px-3 py-2 rounded-lg transition-colors"
            >
              ↑
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const teamDot =
    msg.team === 'red' ? 'bg-red-500' :
    msg.team === 'blue' ? 'bg-blue-500' :
    'bg-zinc-600'

  return (
    <div className="rounded-lg px-3 py-2 bg-zinc-900">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${teamDot}`} />
        <span className="font-mono text-[10px] font-bold text-zinc-400">{msg.sender}</span>
      </div>
      <p className="font-mono text-xs text-zinc-200 break-words">{msg.message}</p>
    </div>
  )
}

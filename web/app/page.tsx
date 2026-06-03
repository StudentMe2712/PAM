"use client"

import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import {
  getConversation,
  listConversations,
  streamChat,
  type ConversationSummary,
  type SourceRef
} from "../lib/api"

interface Msg {
  role: "user" | "assistant"
  content: string
}

export default function ChatPage() {
  const [chats, setChats] = useState<ConversationSummary[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [convId, setConvId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [sources, setSources] = useState<SourceRef[]>([])
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const loadChats = () =>
    listConversations({ source: "pam", limit: 50 })
      .then(setChats)
      .catch(() => {})

  useEffect(() => {
    loadChats()
  }, [])
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function openChat(id: string) {
    setError(null)
    setSources([])
    try {
      const c = await getConversation(id)
      setMessages(
        c.messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content
        }))
      )
      setConvId(id)
    } catch (e) {
      setError(String(e))
    }
  }

  function newChat() {
    setMessages([])
    setConvId(null)
    setSources([])
    setError(null)
  }

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    setInput("")
    setError(null)
    setSources([])
    setBusy(true)
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" }
    ])
    try {
      await streamChat(text, convId, {
        onSources: setSources,
        onToken: (t) =>
          setMessages((prev) => {
            const copy = prev.slice()
            const last = copy[copy.length - 1]
            copy[copy.length - 1] = { ...last, content: last.content + t }
            return copy
          }),
        onError: (e) => setError(e),
        onDone: (id) => {
          if (id) setConvId(id)
          loadChats()
        }
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-9rem)]">
      {/* sidebar */}
      <aside className="hidden sm:flex w-56 shrink-0 flex-col border-r border-neutral-800 pr-4">
        <button
          onClick={newChat}
          className="mb-3 text-xs uppercase tracking-widest border border-neutral-800 rounded-md px-3 py-2 text-neutral-300 hover:text-lime-400 hover:border-lime-400/40 transition-colors">
          + новый чат
        </button>
        <div className="text-[10px] uppercase tracking-widest text-neutral-600 mb-2">
          // чаты
        </div>
        <ul className="overflow-y-auto space-y-1 text-sm">
          {chats.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => openChat(c.id)}
                className={`block w-full text-left truncate px-2 py-1.5 rounded-sm transition-colors ${
                  c.id === convId
                    ? "bg-neutral-800 text-lime-400"
                    : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900"
                }`}>
                {c.title || "(без названия)"}
              </button>
            </li>
          ))}
          {chats.length === 0 && (
            <li className="text-neutral-600 text-xs px-2">пока пусто</li>
          )}
        </ul>
      </aside>

      {/* main chat column */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {messages.length === 0 ? (
            <div className="text-neutral-500 text-sm font-sans h-full flex items-center justify-center text-center px-6">
              Спроси что угодно — я помню твои прошлые разговоры и отвечаю с опорой
              на них.
            </div>
          ) : (
            messages.map((m, i) => (
              <article
                key={i}
                className="border-l-2 pl-4 py-1"
                style={{ borderColor: m.role === "user" ? "#5ee9d0" : "#a3e635" }}>
                <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                  {m.role === "user" ? "ты" : "pam"}
                </div>
                {m.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none font-sans">
                    {m.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    ) : (
                      <span className="text-neutral-600">// думаю…</span>
                    )}
                  </div>
                ) : (
                  <div className="text-sm font-sans whitespace-pre-wrap">
                    {m.content}
                  </div>
                )}
              </article>
            ))
          )}
          <div ref={endRef} />
        </div>

        {sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] uppercase tracking-widest text-neutral-600">
              // память:
            </span>
            {sources.map((s, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 border border-neutral-800 rounded text-neutral-500 truncate max-w-[200px]">
                {s.source}/{s.title || "—"}
              </span>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-3 text-red-400 text-sm font-sans">Ошибка: {error}</div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="mt-3 flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={2}
            placeholder="// напиши сообщение… (Enter — отправить, Shift+Enter — перенос)"
            className="flex-1 resize-none bg-neutral-900 border border-neutral-800 rounded-sm px-3 py-2 text-sm outline-none focus:border-lime-400 placeholder:text-neutral-600 font-sans"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="shrink-0 h-10 px-4 rounded-sm border border-neutral-800 text-neutral-300 hover:text-lime-400 hover:border-lime-400/40 transition-colors disabled:opacity-50">
            {busy ? "…" : "→"}
          </button>
        </form>
      </main>
    </div>
  )
}

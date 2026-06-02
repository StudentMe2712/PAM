"use client"

import { useEffect, useState, type ReactElement } from "react"
import Link from "next/link"

import {
  listConversations,
  search,
  type ConversationSummary,
  type SearchHit
} from "../lib/api"

type SourceFilter = "" | "chatgpt" | "claude" | "gemini"

export default function HomePage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [hits, setHits] = useState<SearchHit[]>([])
  const [query, setQuery] = useState("")
  const [source, setSource] = useState<SourceFilter>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // initial list
  useEffect(() => {
    setLoading(true)
    listConversations({ source: source || undefined })
      .then(setConversations)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [source])

  // search (debounced)
  useEffect(() => {
    if (!query.trim()) {
      setHits([])
      return
    }
    const t = setTimeout(() => {
      search(query.trim(), source || undefined)
        .then(setHits)
        .catch((e) => setError(String(e)))
    }, 300)
    return () => clearTimeout(t)
  }, [query, source])

  return (
    <main>
      <header className="border-b border-neutral-800 pb-6 mb-6">
        <div className="text-xs uppercase tracking-widest text-lime-400 mb-2">
          /// personal_ai_memory
        </div>
        <h1 className="text-3xl font-semibold">Твоя AI-история</h1>
        <p className="text-neutral-400 mt-2 text-sm font-sans">
          Все твои разговоры с ChatGPT, Claude и Gemini в одном месте.
        </p>
      </header>

      <div className="flex gap-3 items-center mb-4 flex-wrap">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="// поиск по сообщениям…"
          className="flex-1 min-w-[240px] bg-neutral-900 border border-neutral-800 rounded-sm px-3 py-2 text-sm outline-none focus:border-lime-400 placeholder:text-neutral-600"
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as SourceFilter)}
          className="bg-neutral-900 border border-neutral-800 rounded-sm px-3 py-2 text-sm">
          <option value="">все источники</option>
          <option value="chatgpt">ChatGPT</option>
          <option value="claude">Claude</option>
          <option value="gemini">Gemini</option>
        </select>
      </div>

      {error && (
        <div className="text-red-400 text-sm font-sans mb-4">
          Ошибка: {error}
        </div>
      )}

      {query.trim() ? (
        <SearchResults hits={hits} query={query} />
      ) : (
        <ConversationList items={conversations} loading={loading} />
      )}
    </main>
  )
}

function ConversationList({
  items,
  loading
}: {
  items: ConversationSummary[]
  loading: boolean
}) {
  if (loading) {
    return <div className="text-neutral-500 text-sm py-12">// загрузка…</div>
  }
  if (items.length === 0) {
    return (
      <div className="text-neutral-500 text-sm py-12 border border-dashed border-neutral-800 text-center">
        // пока пусто. Открой ChatGPT или Claude и начни разговор.
      </div>
    )
  }
  return (
    <ul className="divide-y divide-neutral-900">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={`/c/${c.id}`}
            className="block py-3 hover:bg-neutral-900/40 px-2 -mx-2 rounded-sm transition-colors">
            <div className="flex justify-between items-baseline gap-4">
              <div className="min-w-0">
                <div className="flex gap-2 items-baseline">
                  {sourceClass(c.source)}
                  <span className="text-sm font-semibold truncate font-sans">
                    {c.title || "(без названия)"}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {c.message_count} сообщ. · обновлён{" "}
                  {new Date(c.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function SearchResults({ hits, query }: { hits: SearchHit[]; query: string }) {
  if (hits.length === 0) {
    return (
      <div className="text-neutral-500 text-sm py-12 font-sans">
        Ничего не найдено по запросу «{query}».
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
        // найдено {hits.length}
      </div>
      {hits.map((h) => (
        <Link
          key={h.message_id}
          href={`/c/${h.conversation_id}#m-${h.message_id}`}
          className="block border border-neutral-800 p-3 hover:bg-neutral-900/40 transition-colors rounded-sm">
          <div className="flex gap-2 items-baseline mb-1">
            {sourceClass(h.source)}
            <span className="text-xs text-neutral-500">{h.role}</span>
            <span className="text-sm font-semibold truncate font-sans">
              {h.title || "(без названия)"}
            </span>
          </div>
          <div
            className="text-sm text-neutral-300 font-sans"
            dangerouslySetInnerHTML={{
              __html: highlightSnippet(h.snippet)
            }}
          />
        </Link>
      ))}
    </div>
  )
}

function sourceClass(source: string): ReactElement {
  const colors: Record<string, string> = {
    chatgpt: "text-green-400",
    claude: "text-orange-400",
    gemini: "text-blue-400"
  }
  return (
    <span
      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-neutral-700 rounded ${colors[source] || "text-neutral-400"}`}>
      {source}
    </span>
  )
}

function highlightSnippet(snippet: string): string {
  // ts_headline returns text wrapped with «…», make it visible
  return snippet
    .replace(/«/g, '<mark class="bg-lime-500/30 text-lime-200 px-0.5">')
    .replace(/»/g, "</mark>")
}

"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import {
  getConversation,
  type ConversationDetail
} from "../../../lib/api"

export default function ConversationPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [conv, setConv] = useState<ConversationDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getConversation(id)
      .then(setConv)
      .catch((e) => setError(String(e)))
  }, [id])

  if (error) {
    return (
      <div>
        <BackLink />
        <div className="text-red-400 text-sm mt-4 font-sans">{error}</div>
      </div>
    )
  }
  if (!conv) {
    return (
      <div>
        <BackLink />
        <div className="text-neutral-500 text-sm mt-4">// загрузка…</div>
      </div>
    )
  }

  return (
    <div>
      <BackLink />

      <header className="border-b border-neutral-800 pb-4 mt-4 mb-6">
        <div className="flex gap-2 items-baseline mb-1">
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-neutral-700 rounded text-neutral-300">
            {conv.source}
          </span>
          <span className="text-xs text-neutral-500">
            {conv.message_count} сообщ.
          </span>
        </div>
        <h1 className="text-xl font-semibold font-sans">
          {conv.title || "(без названия)"}
        </h1>
        <div className="text-xs text-neutral-500 mt-1">
          обновлён {new Date(conv.updated_at).toLocaleString()}
        </div>
      </header>

      <div className="space-y-6">
        {conv.messages.map((m) => (
          <article
            key={m.id}
            id={`m-${m.id}`}
            className="border-l-2 pl-4 py-1 target:bg-lime-500/5"
            style={{
              borderColor: m.role === "user" ? "#5ee9d0" : "#a3e635"
            }}>
            <div className="flex justify-between items-baseline mb-2">
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                {m.role}
              </div>
              {m.sent_at && (
                <div className="text-[10px] text-neutral-600">
                  {new Date(m.sent_at).toLocaleString()}
                </div>
              )}
            </div>
            <div className="prose prose-invert prose-sm max-w-none font-sans">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {m.content}
              </ReactMarkdown>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/"
      className="text-xs uppercase tracking-widest text-neutral-500 hover:text-lime-400">
      ← к списку
    </Link>
  )
}

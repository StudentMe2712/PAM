/**
 * Backend API client used by the Next.js UI.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export interface ConversationSummary {
  id: string
  source: "chatgpt" | "claude" | "gemini"
  external_id: string
  title: string | null
  started_at: string | null
  updated_at: string
  message_count: number
}

export interface MessageOut {
  id: string
  role: string
  content: string
  position: number
  sent_at: string | null
}

export interface ConversationDetail extends ConversationSummary {
  messages: MessageOut[]
}

export interface SearchHit {
  conversation_id: string
  message_id: string
  source: string
  title: string | null
  role: string
  snippet: string
  sent_at: string | null
  rank: number | null
}

export async function listConversations(opts?: {
  source?: string
  limit?: number
  offset?: number
}): Promise<ConversationSummary[]> {
  const params = new URLSearchParams()
  if (opts?.source) params.set("source", opts.source)
  if (opts?.limit) params.set("limit", String(opts.limit))
  if (opts?.offset) params.set("offset", String(opts.offset))
  const r = await fetch(`${BACKEND_URL}/conversations?${params}`, {
    cache: "no-store"
  })
  if (!r.ok) throw new Error(`list failed: ${r.status}`)
  return r.json()
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  const r = await fetch(`${BACKEND_URL}/conversations/${id}`, {
    cache: "no-store"
  })
  if (!r.ok) throw new Error(`detail failed: ${r.status}`)
  return r.json()
}

export async function search(
  q: string,
  source?: string
): Promise<SearchHit[]> {
  const params = new URLSearchParams({ q })
  if (source) params.set("source", source)
  const r = await fetch(`${BACKEND_URL}/search?${params}`, {
    cache: "no-store"
  })
  if (!r.ok) throw new Error(`search failed: ${r.status}`)
  return r.json()
}

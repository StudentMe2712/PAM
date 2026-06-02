# ROADMAP — PAM (стабильный план фаз)

> Источник визуального плана — `../implementation-plan.html` (открывать в браузере).
> Здесь — рабочая разбивка на шаги для GSD-процесса. Текущая позиция — в `STATE.md`.

## Принципы
- Каждая фаза шиппится самостоятельно. Не тянуть Phase N+1 в Phase N.
- Один branch на фазу: `phase-2-rag`, `phase-3-memory`, `phase-4-chat`.
- Мелкие шаги → atomic commits → обновление `handoff.md`.

---

## Phase 1 — Capture + Full-text search *(текущая)*
Внешние API: нет.

- [x] docker-compose (Postgres+pgvector, backend)
- [x] FastAPI скелет: модели, schemas, ingest/list/search, миграция `0001`
- [x] Extension: background worker, popup, content scripts Claude + ChatGPT
- [ ] **Runtime-верификация** (заблокировано Docker; план — через Neon dev)
- [x] Заскаффолдить web (`web/INSTALL.md`) — Next 16 + Tailwind v4, чистый Tailwind, build зелёный
- [x] Проверить связку web↔backend вживую (CORS + ingest/list/search)
- [x] Заскаффолдить extension (`extension/INSTALL.md`) — Plasmo build зелёный; добавлен `contents/relay.ts` (isolated-world bridge)
- [ ] Проверить extension↔backend вживую (нужен Chrome + логин на claude.ai/chatgpt — пользователь)
- [ ] `contents/gemini.ts` — реализовать после наблюдения реального стрима в DevTools (нужен пользователь)
- [ ] Baseline git-коммит (по просьбе пользователя)

## Phase 2 — RAG (hybrid search)
Внешние API: нет (локальный Ollama).

- [ ] Ollama локально + `ollama pull nomic-embed-text`
- [ ] Миграция: таблица `chunks` (message_id, content, `embedding vector(768)`) — НЕ пере-включать extension, она уже есть с `0001`
- [ ] Чанкование сообщений
- [ ] Background worker: эмбеддит новые chunks
- [ ] `POST /search/semantic` (pgvector `<->`) + гибрид через RRF
- [ ] UI: переключатель text / semantic / hybrid

## Phase 3 — Memory Layer
Внешние API: Gemini Free Tier (15 RPM, 1500 RPD).

- [ ] Подключить Gemini API, очередь с задержкой 4с (rate limit)
- [ ] Worker извлечения фактов: разговор → промпт → JSON по схеме
- [ ] **Prompt-injection guard:** user-content в чётких разделителях, не доверять вложенным инструкциям
- [ ] **Hallucination guard:** каждый факт хранит `source_message_id`
- [ ] Таблица `profile_facts` (category, content, source_message_id, confidence)
- [ ] UI `/me` — профиль, edit/delete фактов
- [ ] `/security-review` перед мержем

## Phase 4 — Chat with your AI
Внешние API: Groq (free) → Claude Haiku → Sonnet.

- [ ] `POST /chat` со streaming через SSE
- [ ] RAG pipeline: query → embed → retrieve chunks+facts → assemble context → LLM
- [ ] Prompt caching (claude-api skill)
- [ ] UI `/chat` с подсветкой использованных источников
- [ ] `/security-review` перед мержем

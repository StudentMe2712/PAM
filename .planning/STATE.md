# STATE — быстрый указатель текущей позиции

> Короткий «где мы сейчас». История — в `../handoff.md`. План — в `ROADMAP.md`.
> Обновлять при каждом значимом сдвиге.

- **🔀 РАЗВОРОТ ВИДЕНИЯ (2026-06-02):** главное в продукте — **чат с долгой памятью** (Phase 3+4, чат = главный экран) + **личный лектор** (новый Phase 5). Capture/поиск (Phase 1) переезжает во вспомогательный раздел «Импорт истории». Подробности — в `ROADMAP.md` → «Продуктовое видение».
- **★ Избранное ЗАШИПЖЕНО в `main`** (14/14 тестов: snapshot переживает ре-ингест, FK SET NULL, кириллица) + кнопка обновления на /history и /saved. Полнота перехвата подтверждена (24+24).
- **Ollama установлена и готова** (служба :11434, модель `nomic-embed-text`, 768-dim проверена). От пользователя для эмбеддингов больше ничего не нужно.
- **✅ Phase 2 (RAG) ЗАВЕРШЕНА** (ветка `phase-2-rag` → мерж в `main`): chunks+HNSW, чанкование при ingest, эмбеддинг-воркер (Ollama, фоновый + `/index/run`), `GET /search/semantic` и `GET /search/hybrid` (RRF), UI-переключатель режима. Семантика/гибрид проверены на реальных данных.
- **Фаза:** Phase 1 — capture ПОДТВЕРЖДЁН вживую (пользователь: «Сохранено:1»; мост MAIN→relay→background работает ✅). Открытые мелочи Phase 1: «Ошибок:2» (вероятно накопленные до сброса счётчиков) и «вытащило 86 сообщений — не вся переписка» (возможна пагинация/ленивая подгрузка на стороне сайта; разберём при доводке раздела «Импорт»).
- **Активный branch:** `main` — baseline-коммит `af61f83` запушен на GitHub (`https://github.com/StudentMe2712/PAM.git`). Фазовые ветки пока не созданы.
- **Последний шаг:** хардненинг манифеста extension перед браузерным тестом: убран неиспользуемый `webRequest` (код юзает только `runtime`+`storage`); `https://chat.openai.com/*` добавлен в `host_permissions` (его матчат `chatgpt.ts`/`relay.ts`, а dynamic `registerContentScripts` требует matches ⊆ host_permissions — иначе регистрация MAIN-скриптов падает). Поправлены README (Next 14→16, +relay.ts) и `.env.example` (Neon/asyncpg DSN + backend читает `backend/.env`). Prod build зелёный. Baseline + это — на GitHub.
- **До этого:** extension заскаффолжен (Plasmo 0.90 + React 19). Создан `tsconfig.json` + `assets/icon.png`. **Архитектурный фикс:** добавлен `contents/relay.ts` (isolated-world bridge), сломанные `chrome.runtime` слушатели убраны из MAIN-скриптов.
- **До этого:** связка web↔backend проверена вживую (CORS + ingest/list/search с `Origin: localhost:3000`, тестовая строка удалена). web на чистом Tailwind (Next 16 + Tailwind v4), 2 бага в `page.tsx` починены.

## 🔴 Блокеры / ограничения
- Docker на паузе (Windows). Backend гоняем локально: `backend/.venv` (Python 3.11) против Neon.
- **Neon — ТОЛЬКО dev/тесты, НЕ реальные разговоры** (local-first). Реальные данные — в локальный Postgres, когда вернётся Docker.

## ⏭️ Текущее — ветка `phase-4-chat` (чат с памятью = главный экран)
**Решение по LLM (на основе железа: нет GPU, ~2ГБ free RAM):** гибрид — **Groq** (бесплатный ключ, по умолчанию) + локальный **Ollama** опцией. Эмбеддинги остаются локально. **Gemini не используем** (на free-tier тренируется на данных). Извлечение фактов — тоже через Groq, отдельный Gemini не нужен.
Сделано на ветке (#7):
- [x] Config: `LLM_PROVIDER` (groq|ollama), `GROQ_API_KEY`, `GROQ_MODEL=llama-3.3-70b-versatile`, `OLLAMA_CHAT_MODEL=llama3.2:3b`.
- [x] `app/llm.py`: `stream_chat(messages)` — стриминг токенов через Groq (OpenAI-совместимый, SSE) или Ollama `/api/chat`. Импорт проверен.
Осталось (#8–#11): `POST /chat` (RAG+SSE) → хранить чаты как `source=pam` → чат-UI на главной → `/security-review`+тест+мерж.
**⛔ Блок:** нужен бесплатный **GROQ_API_KEY** от пользователя (console.groq.com → API Keys) в `backend/.env`. Без него чат на Groq не запустится (можно временно `LLM_PROVIDER=ollama`, но локальная чат-модель на этом ПК слабая/медленная).

---
### Phase 2 (RAG) — ЗАВЕРШЕНА, в `main`:
- [x] **Чанкование** (`indexing.py::chunk_text`, ~1000 симв по абзацам) — создаётся при ingest + backfill `create_missing_chunks`.
- [x] **Эмбеддинг-воркер**: `embed_text` → Ollama `/api/embeddings`; `embed_pending` пишет вектор. Фоновый цикл в `main.py` lifespan (каждые 15с, устойчив к падению Ollama) + ручной `POST /index/run`.
- [x] **`GET /search/semantic`**: эмбеддит запрос → `Chunk.embedding.cosine_distance` (`<=>`) → топ-N. **Проверено: запрос «рецепт домашнего хлеба» → топ «Хлеб» 0.81 (по смыслу).**
- [x] **Гибрид** (RRF, K=60) — `GET /search/hybrid` (фьюз полнотекста + семантики, деградирует в text-only если Ollama недоступна). Тест 4/4: «выпечка хлеба в духовке» → топ «Хлеб».
- [x] **UI** переключатель «по словам / по смыслу / гибрид» в `/history` (`lib/api.ts::search(q,source,mode)`). Web build зелёный.
- [x] Тесты пройдены. **Phase 2 смержена в `main`.** Реальные данные в Neon доэмбеддились (remaining 0).

**⚠️ Реальные данные в Neon:** пользователь уже накопил реальные разговоры (~467 chunks). Семантика на них работает. Бэклог эмбеддингов (~403 на момент теста) фоновый воркер дожуёт по 64/15с, когда поднимется backend с Phase 2 кодом. (Напоминание: Neon задумывался как dev; реальные данные → при возврате Docker в локальный Postgres; креды ротировать.)
Ollama готова (:11434, `nomic-embed-text` 768-dim). Фоновые: `contents/gemini.ts`; Docker — по слову пользователя.

## 🧭 Мультиагенты (GSD-style, через Agent-инструмент Claude Code)
- **Explore** — широкий поиск по коду перед планированием шага.
- **Plan** — проектирование плана шага/фазы (architecture trade-offs).
- **general-purpose / claude** — исполнение многошаговых задач.
- Ревью: `/code-review` между шагами, `/security-review` перед Phase 3 и 4.
- Принцип: каждый агент стартует со свежим контекстом и узкой задачей; результат фиксируется в `handoff.md`.

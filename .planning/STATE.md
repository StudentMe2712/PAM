# STATE — быстрый указатель текущей позиции

> Короткий «где мы сейчас». История — в `../handoff.md`. План — в `ROADMAP.md`.
> Обновлять при каждом значимом сдвиге.

- **🔀 РАЗВОРОТ ВИДЕНИЯ (2026-06-02):** главное в продукте — **чат с долгой памятью** (Phase 3+4, чат = главный экран) + **личный лектор** (новый Phase 5). Capture/поиск (Phase 1) переезжает во вспомогательный раздел «Импорт истории». Подробности — в `ROADMAP.md` → «Продуктовое видение».
- **★ Избранное ЗАШИПЖЕНО в `main`** (14/14 тестов: snapshot переживает ре-ингест, FK SET NULL, кириллица) + кнопка обновления на /history и /saved. Полнота перехвата подтверждена (24+24).
- **Ollama установлена и готова** (служба :11434, модель `nomic-embed-text`, 768-dim проверена). От пользователя для эмбеддингов больше ничего не нужно.
- **🚧 Phase 2 (RAG) начата** — ветка **`phase-2-rag`**: таблица `chunks` (`embedding vector(768)` + HNSW cosine index), миграция `2ec708645017` применена на Neon ✅. `pgvector` 0.4.2 в venv + pyproject.
- **Фаза:** Phase 1 — capture ПОДТВЕРЖДЁН вживую (пользователь: «Сохранено:1»; мост MAIN→relay→background работает ✅). Открытые мелочи Phase 1: «Ошибок:2» (вероятно накопленные до сброса счётчиков) и «вытащило 86 сообщений — не вся переписка» (возможна пагинация/ленивая подгрузка на стороне сайта; разберём при доводке раздела «Импорт»).
- **Активный branch:** `main` — baseline-коммит `af61f83` запушен на GitHub (`https://github.com/StudentMe2712/PAM.git`). Фазовые ветки пока не созданы.
- **Последний шаг:** хардненинг манифеста extension перед браузерным тестом: убран неиспользуемый `webRequest` (код юзает только `runtime`+`storage`); `https://chat.openai.com/*` добавлен в `host_permissions` (его матчат `chatgpt.ts`/`relay.ts`, а dynamic `registerContentScripts` требует matches ⊆ host_permissions — иначе регистрация MAIN-скриптов падает). Поправлены README (Next 14→16, +relay.ts) и `.env.example` (Neon/asyncpg DSN + backend читает `backend/.env`). Prod build зелёный. Baseline + это — на GitHub.
- **До этого:** extension заскаффолжен (Plasmo 0.90 + React 19). Создан `tsconfig.json` + `assets/icon.png`. **Архитектурный фикс:** добавлен `contents/relay.ts` (isolated-world bridge), сломанные `chrome.runtime` слушатели убраны из MAIN-скриптов.
- **До этого:** связка web↔backend проверена вживую (CORS + ingest/list/search с `Origin: localhost:3000`, тестовая строка удалена). web на чистом Tailwind (Next 16 + Tailwind v4), 2 бага в `page.tsx` починены.

## 🔴 Блокеры / ограничения
- Docker на паузе (Windows). Backend гоняем локально: `backend/.venv` (Python 3.11) против Neon.
- **Neon — ТОЛЬКО dev/тесты, НЕ реальные разговоры** (local-first). Реальные данные — в локальный Postgres, когда вернётся Docker.

## ⏭️ Следующий шаг — ветка `phase-2-rag` (RAG)
Сделано на ветке:
- [x] `pgvector` (python) в venv + pyproject. Модель `Chunk` (`message_id` FK CASCADE, content, position, `embedding vector(768)`, created_at).
- [x] Миграция `2ec708645017`: таблица `chunks` + индексы `ix_chunks_message` и HNSW `ix_chunks_embedding_hnsw` (`vector_cosine_ops`). Применена и проверена на Neon.

Осталось по Phase 2 (по порядку):
- [ ] **Чанкование**: функция нарезки `content` сообщения на куски (~512 симв / по абзацам), запись в `chunks`. Заполнять при ingest (и backfill для существующих).
- [ ] **Эмбеддинг-воркер**: берёт chunks с `embedding IS NULL`, зовёт Ollama `POST :11434/api/embeddings` (model `nomic-embed-text`), пишет вектор. (Локально, без внешних API.)
- [ ] **`POST /search/semantic`**: эмбеддит запрос → `ORDER BY embedding <=> $vec` (косинус) → топ-N. Затем **гибрид** (RRF: объединить ranks полнотекста и вектора).
- [ ] **UI**: переключатель text / semantic / hybrid в `/history` поиске.
- [ ] Тесты + мерж в `main`.

Ollama готова (служба :11434, `nomic-embed-text` 768-dim). Запрос эмбеддинга: `curl :11434/api/embeddings -d '{"model":"nomic-embed-text","prompt":"..."}'` → `{"embedding":[768]}`.
Фоновые: `contents/gemini.ts`; Docker — по слову пользователя; авто-«популярное»/mindmap v2 — поверх этих эмбеддингов.

## 🧭 Мультиагенты (GSD-style, через Agent-инструмент Claude Code)
- **Explore** — широкий поиск по коду перед планированием шага.
- **Plan** — проектирование плана шага/фазы (architecture trade-offs).
- **general-purpose / claude** — исполнение многошаговых задач.
- Ревью: `/code-review` между шагами, `/security-review` перед Phase 3 и 4.
- Принцип: каждый агент стартует со свежим контекстом и узкой задачей; результат фиксируется в `handoff.md`.

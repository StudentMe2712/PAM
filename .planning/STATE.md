# STATE — быстрый указатель текущей позиции

> Короткий «где мы сейчас». История — в `../handoff.md`. План — в `ROADMAP.md`.
> Обновлять при каждом значимом сдвиге.

- **🔀 РАЗВОРОТ ВИДЕНИЯ (2026-06-02):** главное в продукте — **чат с долгой памятью** (Phase 3+4, чат = главный экран) + **личный лектор** (новый Phase 5). Capture/поиск (Phase 1) переезжает во вспомогательный раздел «Импорт истории». Подробности — в `ROADMAP.md` → «Продуктовое видение».
- **Полнота перехвата ПОДТВЕРЖДЕНА:** пользователь дал `extracted 48 from 81 nodes {user:24, assistant:24}` — 24+24 = полная переписка, потерь нет (33 узла — служебные).
- **Текущая фича:** ручное ★ Избранное (ветка **`saved-messages`**). Дальше по выбору пользователя — Phase 2 RAG (auto-«популярное» = RAG-фича).
- `import-history-section` смержена в `main` (раздел /history, nav-бар, фоновый dev.bat, диагностика).
- **Фаза:** Phase 1 — capture ПОДТВЕРЖДЁН вживую (пользователь: «Сохранено:1»; мост MAIN→relay→background работает ✅). Открытые мелочи Phase 1: «Ошибок:2» (вероятно накопленные до сброса счётчиков) и «вытащило 86 сообщений — не вся переписка» (возможна пагинация/ленивая подгрузка на стороне сайта; разберём при доводке раздела «Импорт»).
- **Активный branch:** `main` — baseline-коммит `af61f83` запушен на GitHub (`https://github.com/StudentMe2712/PAM.git`). Фазовые ветки пока не созданы.
- **Последний шаг:** хардненинг манифеста extension перед браузерным тестом: убран неиспользуемый `webRequest` (код юзает только `runtime`+`storage`); `https://chat.openai.com/*` добавлен в `host_permissions` (его матчат `chatgpt.ts`/`relay.ts`, а dynamic `registerContentScripts` требует matches ⊆ host_permissions — иначе регистрация MAIN-скриптов падает). Поправлены README (Next 14→16, +relay.ts) и `.env.example` (Neon/asyncpg DSN + backend читает `backend/.env`). Prod build зелёный. Baseline + это — на GitHub.
- **До этого:** extension заскаффолжен (Plasmo 0.90 + React 19). Создан `tsconfig.json` + `assets/icon.png`. **Архитектурный фикс:** добавлен `contents/relay.ts` (isolated-world bridge), сломанные `chrome.runtime` слушатели убраны из MAIN-скриптов.
- **До этого:** связка web↔backend проверена вживую (CORS + ingest/list/search с `Origin: localhost:3000`, тестовая строка удалена). web на чистом Tailwind (Next 16 + Tailwind v4), 2 бага в `page.tsx` починены.

## 🔴 Блокеры / ограничения
- Docker на паузе (Windows). Backend гоняем локально: `backend/.venv` (Python 3.11) против Neon.
- **Neon — ТОЛЬКО dev/тесты, НЕ реальные разговоры** (local-first). Реальные данные — в локальный Postgres, когда вернётся Docker.

## ⏭️ Следующий шаг — ветка `saved-messages` (★ Избранное)
Сделано на ветке:
- [x] Backend: модель `SavedMessage` (снимок, FK SET NULL), схемы, роуты `POST/GET/DELETE /saved`, миграция `efc12b5654c3`. Применена на Neon, smoke-тест прошёл (POST 201 / GET / DELETE 204).
- [x] Web: API-клиент (`saveMessage/listSaved/deleteSaved`), кнопка ★ на сообщениях в `/c/[id]`, раздел `/saved`, вкладка в nav. Build зелёный.
- [x] **Пользователь подтвердил: Избранное работает.**
- [x] **Кнопка обновления** (`web/app/refresh-button.tsx`, SVG + спиннер) на `/history` и `/saved` (вместо перезагрузки браузера).
- [x] **Расширенные тесты 14/14** (urllib-скрипт): UPSERT, /saved CRUD, кириллица round-trip, ★ выживает при ре-захвате, FK SET NULL при удалении разговора, поиск. Neon очищен.
- [ ] Мерж `saved-messages` → main, затем Phase 2 RAG.

Дальше (по плану): **Phase 2 RAG** (ветка `phase-2-rag`) — нужна установка Ollama (`ollama pull nomic-embed-text`). Разблокирует авто-«популярное», поиск по смыслу, mindmap v2, чат-память.
Заметка: при ре-захвате `messages` вайпятся — поэтому избранное хранится снимком в `saved_messages`.

Будущее раздела (в ROADMAP): сохранять важные сообщения (pin), mindmap тем, аналитика. Mindmap v2 зависит от Phase 2.
Фоновые: `contents/gemini.ts`; Docker — по слову пользователя. UI: чистый Tailwind; shadcn — позже.

## 🧭 Мультиагенты (GSD-style, через Agent-инструмент Claude Code)
- **Explore** — широкий поиск по коду перед планированием шага.
- **Plan** — проектирование плана шага/фазы (architecture trade-offs).
- **general-purpose / claude** — исполнение многошаговых задач.
- Ревью: `/code-review` между шагами, `/security-review` перед Phase 3 и 4.
- Принцип: каждый агент стартует со свежим контекстом и узкой задачей; результат фиксируется в `handoff.md`.

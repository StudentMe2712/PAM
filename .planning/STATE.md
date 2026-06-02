# STATE — быстрый указатель текущей позиции

> Короткий «где мы сейчас». История — в `../handoff.md`. План — в `ROADMAP.md`.
> Обновлять при каждом значимом сдвиге.

- **Фаза:** Phase 1 (capture + full-text search) — backend ✅, web ✅ (связка проверена), extension собран ✅ (capture в браузере ещё не проверен)
- **Активный branch:** `main` — baseline-коммит `af61f83` запушен на GitHub (`https://github.com/StudentMe2712/PAM.git`). Фазовые ветки пока не созданы.
- **Последний шаг:** хардненинг манифеста extension перед браузерным тестом: убран неиспользуемый `webRequest` (код юзает только `runtime`+`storage`); `https://chat.openai.com/*` добавлен в `host_permissions` (его матчат `chatgpt.ts`/`relay.ts`, а dynamic `registerContentScripts` требует matches ⊆ host_permissions — иначе регистрация MAIN-скриптов падает). Поправлены README (Next 14→16, +relay.ts) и `.env.example` (Neon/asyncpg DSN + backend читает `backend/.env`). Prod build зелёный. Baseline + это — на GitHub.
- **До этого:** extension заскаффолжен (Plasmo 0.90 + React 19). Создан `tsconfig.json` + `assets/icon.png`. **Архитектурный фикс:** добавлен `contents/relay.ts` (isolated-world bridge), сломанные `chrome.runtime` слушатели убраны из MAIN-скриптов.
- **До этого:** связка web↔backend проверена вживую (CORS + ingest/list/search с `Origin: localhost:3000`, тестовая строка удалена). web на чистом Tailwind (Next 16 + Tailwind v4), 2 бага в `page.tsx` починены.

## 🔴 Блокеры / ограничения
- Docker на паузе (Windows). Backend гоняем локально: `backend/.venv` (Python 3.11) против Neon.
- **Neon — ТОЛЬКО dev/тесты, НЕ реальные разговоры** (local-first). Реальные данные — в локальный Postgres, когда вернётся Docker.

## ⏭️ Следующий шаг
- **Проверить extension↔backend вживую (нужен пользователь):** `cd extension && npm run dev` → Chrome `chrome://extensions` → Developer mode → Load unpacked → `extension/build/chrome-mv3-dev`. Поднять backend. Открыть claude.ai/chatgpt (залогиненным), открыть разговор → проверить, что popup-счётчик «Сохранено» растёт и разговор появляется в web UI. **Особое внимание:** работает ли мост MAIN→relay→background (это и был фикс).
- `contents/gemini.ts` — реализовать после наблюдения стрима в DevTools на gemini.google.com (нужен пользователь).
- (опц.) Первый baseline git-коммит — по явной просьбе пользователя. Сейчас хорошая точка: весь Phase 1 собирается, backend↔web проверены.
- **Решение по UI зафиксировано:** чистый Tailwind на Phase 1. shadcn/ui — на Phase 3/4.
- **Замечание:** Docker снят с повестки — пользователь сам сообщит, если понадобится.

## 🧭 Мультиагенты (GSD-style, через Agent-инструмент Claude Code)
- **Explore** — широкий поиск по коду перед планированием шага.
- **Plan** — проектирование плана шага/фазы (architecture trade-offs).
- **general-purpose / claude** — исполнение многошаговых задач.
- Ревью: `/code-review` между шагами, `/security-review` перед Phase 3 и 4.
- Принцип: каждый агент стартует со свежим контекстом и узкой задачей; результат фиксируется в `handoff.md`.

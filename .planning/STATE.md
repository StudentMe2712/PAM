# STATE — быстрый указатель текущей позиции

> Короткий «где мы сейчас». История — в `../handoff.md`. План — в `ROADMAP.md`.
> Обновлять при каждом значимом сдвиге.

- **🔀 РАЗВОРОТ ВИДЕНИЯ (2026-06-02):** главное в продукте — **чат с долгой памятью** (Phase 3+4, чат = главный экран) + **личный лектор** (новый Phase 5). Capture/поиск (Phase 1) переезжает во вспомогательный раздел «Импорт истории». Подробности — в `ROADMAP.md` → «Продуктовое видение».
- **Выбранный приоритет:** (C) Доводка «Импорт истории». Работа на ветке **`import-history-section`**.
- **Фаза:** Phase 1 — capture ПОДТВЕРЖДЁН вживую (пользователь: «Сохранено:1»; мост MAIN→relay→background работает ✅). Открытые мелочи Phase 1: «Ошибок:2» (вероятно накопленные до сброса счётчиков) и «вытащило 86 сообщений — не вся переписка» (возможна пагинация/ленивая подгрузка на стороне сайта; разберём при доводке раздела «Импорт»).
- **Активный branch:** `main` — baseline-коммит `af61f83` запушен на GitHub (`https://github.com/StudentMe2712/PAM.git`). Фазовые ветки пока не созданы.
- **Последний шаг:** хардненинг манифеста extension перед браузерным тестом: убран неиспользуемый `webRequest` (код юзает только `runtime`+`storage`); `https://chat.openai.com/*` добавлен в `host_permissions` (его матчат `chatgpt.ts`/`relay.ts`, а dynamic `registerContentScripts` требует matches ⊆ host_permissions — иначе регистрация MAIN-скриптов падает). Поправлены README (Next 14→16, +relay.ts) и `.env.example` (Neon/asyncpg DSN + backend читает `backend/.env`). Prod build зелёный. Baseline + это — на GitHub.
- **До этого:** extension заскаффолжен (Plasmo 0.90 + React 19). Создан `tsconfig.json` + `assets/icon.png`. **Архитектурный фикс:** добавлен `contents/relay.ts` (isolated-world bridge), сломанные `chrome.runtime` слушатели убраны из MAIN-скриптов.
- **До этого:** связка web↔backend проверена вживую (CORS + ingest/list/search с `Origin: localhost:3000`, тестовая строка удалена). web на чистом Tailwind (Next 16 + Tailwind v4), 2 бага в `page.tsx` починены.

## 🔴 Блокеры / ограничения
- Docker на паузе (Windows). Backend гоняем локально: `backend/.venv` (Python 3.11) против Neon.
- **Neon — ТОЛЬКО dev/тесты, НЕ реальные разговоры** (local-first). Реальные данные — в локальный Postgres, когда вернётся Docker.

## ⏭️ Следующий шаг — ветка `import-history-section`
Сделано на ветке:
- [x] Раздел «Импорт истории»: список+поиск → `/history`, главная `/` → лендинг, back-link → `/history`.
- [x] **Нормальный nav-бар** (`web/app/nav.tsx`, sticky + активное состояние) вместо «ссылок как на форуме».
- [x] `chatgpt.ts` извлекает object-парты; оба парсера логируют `extracted N of M` + разбивка по ролям.
- [x] **`dev.bat` фоновый:** backend+extension скрыто (логи в `*-dev*.log`), web — в окне. + `stop-dev.bat`.
- **Диагноз от пользователя:** ChatGPT `extracted 48 messages from 81 nodes`. 81 узел дерева → 48 сообщений; 33 — системные/пустые/tool-узлы. Похоже на ПОЛНУЮ нить (а не потерю). CSP-ошибка `ws://localhost:1815` в консоли — это Plasmo HMR-вебсокет (только dev, в prod-сборке его нет), на перехват НЕ влияет.
- [ ] Подтвердить полноту: следующий лог покажет разбивку по ролям (user≈число твоих промптов).

Будущее раздела (в ROADMAP): сохранять важные сообщения (pin), mindmap тем, аналитика. Mindmap v2 зависит от Phase 2.
Фоновые: `contents/gemini.ts`; Docker — по слову пользователя. UI: чистый Tailwind; shadcn — позже.

## 🧭 Мультиагенты (GSD-style, через Agent-инструмент Claude Code)
- **Explore** — широкий поиск по коду перед планированием шага.
- **Plan** — проектирование плана шага/фазы (architecture trade-offs).
- **general-purpose / claude** — исполнение многошаговых задач.
- Ревью: `/code-review` между шагами, `/security-review` перед Phase 3 и 4.
- Принцип: каждый агент стартует со свежим контекстом и узкой задачей; результат фиксируется в `handoff.md`.

# PAM — Handoff Log

> Живой журнал работы над **Personal AI Memory (PAM)** для передачи контекста между чатами.
> Каждый агент/сессия дописывает сюда **что сделано, какие решения приняты, что дальше**.
> Источник правды по архитектуре — `CLAUDE.md`; по плану фаз — `implementation-plan.html` (открывать в браузере) и `VIBE_PROMPT.md`.
> Формат вдохновлён GSD (Get Shit Done): мелкие верифицируемые шаги, фиксация решений, свежий контекст.

---

## 🔴 Активные ограничения (читать первым делом)

- **Docker на ПАУЗЕ** (с 2026-06-02) — у пользователя проблемы с Windows. НЕ запускать `docker compose ...` пока пользователь явно не разрешит. Это блокирует runtime-проверку backend+Postgres+pgvector.
- **Baseline-коммит есть.** `af61f83` на ветке `main`, запушен на GitHub `https://github.com/StudentMe2712/PAM.git`. 58 файлов, секреты/`node_modules`/билды отсечены `.gitignore` (проверено `git check-ignore`). Дальше коммитить по ходу работы; для фаз — отдельные ветки (`phase-2-rag` и т.д.).
- **web/ ✅** (Next 16, Tailwind v4, build зелёный, связка с backend проверена). **extension/ собран ✅** (Plasmo build зелёный) — но **capture в реальном браузере ещё НЕ проверен** (нужен Chrome + логин).

---

## 📍 Текущее состояние (Phase 1)

| Компонент | Статус | Заметки |
|---|---|---|
| `docker-compose.yml` | ✅ есть | запуск на паузе |
| Backend (FastAPI: модели, schemas, ingest/list/search, миграция 0001) | ✅ код есть | не запускался в этой сессии |
| Alembic миграция `0001_initial` | ✅ | включает `CREATE EXTENSION vector` |
| Extension: `background.ts`, `popup.tsx`, `contents/claude.ts`, `contents/chatgpt.ts` | ✅ код есть | не собиралось |
| Extension: `contents/gemini.ts` | ⚠️ заглушка | реализовать после наблюдения реального стрима в DevTools |
| Extension: `contents/relay.ts` | ✅ добавлен | isolated-world мост postMessage→runtime.sendMessage (фикс MAIN-world бага) |
| Extension: скаффолд (Plasmo, package.json, tsconfig, icon) | ✅ build зелёный | capture в браузере не проверен |
| Web UI: `app/page.tsx`, `app/c/[id]/page.tsx`, `lib/api.ts` | ✅ заскаффолжен | Next 16 + Tailwind v4, build OK, dev OK; связка с backend ещё не проверена вживую |

**Вывод по Phase 1:** backend runtime-проверен на живой БД (Neon dev): ingest/search/list/delete + русский полнотекст работают. Незакрытое: Gemini-парсер (нужен пользователь + DevTools), скаффолдинг web и extension, проверка связки extension↔backend и web↔backend.

---

## 🗺️ Roadmap (из плана, 4 фазы)

1. **Phase 1** *(текущая)* — capture + full-text search. Без внешних API.
2. **Phase 2** — Ollama (`nomic-embed-text`), таблица `chunks`, эмбеддинги, гибридный поиск (text+vector через RRF).
3. **Phase 3** — Gemini Free извлекает `profile_facts`, UI `/me`. Prompt-injection awareness + hallucination guard (`source_message_id`).
4. **Phase 4** — RAG chat (`POST /chat` SSE), Groq → Claude Haiku/Sonnet + prompt caching.

Правило: каждая фаза шиппится отдельно. Не тянуть работу Phase N+1 в Phase N.

---

## 🧭 Рабочий процесс (GSD-style)

- Один branch на фазу (`phase-2-rag`, `phase-3-memory`, `phase-4-chat`).
- Мелкие шаги → atomic commits → обновление этого файла после каждого значимого шага.
- Между фазами: `/code-review`, перед Phase 3/4: `/security-review`.
- Решение по самому GSD (полная установка `@opengsd/gsd-core` vs ручная адаптация) — см. лог ниже.

---

## ✅ Лог шагов

### 2026-06-02 — Сессия: старт процесса
- Перепроверён статус проекта против VIBE_PROMPT.md и implementation-plan.html.
- **Решение зафиксировано:** Docker на паузе до явного разрешения пользователя.
- **Уточнение:** shadcn/ui — только в плане, в реальном `web/INSTALL.md` его нет; web не заскаффолжен.
- Изучён GSD (`open-gsd/gsd-core`): workflow Initialize→Discuss→Plan→Execute→Verify→Ship; state-файлы; `npx @opengsd/gsd-core@latest`.
- Создан этот `handoff.md`.
- **Решение пользователя по GSD:** ручная адаптация в репо (без глобальной установки). → создан `.planning/STATE.md` и `.planning/ROADMAP.md`. Мультиагенты = subagents Claude Code (Explore/Plan/general-purpose).
- **Решение пользователя по БД:** использовать его **Neon** (cloud Postgres) как DEV-базу, пока Docker на паузе. Оговорка от меня: только синтетика/тесты, НЕ реальные разговоры (local-first). Ждём connection string в `.env` (отдельный Neon-проект под PAM, не QoldauFinance).
- **Neon подключён и Phase 1 runtime-проверена ✅** (см. отдельную запись ниже).

**Подготовка к Neon (проверен код, изменения делать при подключении + проверке):**
- `config.py` читает `DATABASE_URL` из `.env`, дефолт `postgresql+asyncpg://pam:pam@localhost:5432/pam`. `db.py` уже с `pool_pre_ping=True` (хорошо для serverless Neon, который засыпает). `alembic/env.py` берёт `DATABASE_URL` из env — миграции подхватят Neon автоматически.
- **SSL нюанс (важно):** у `asyncpg` НЕ `sslmode=require` (это libpq/psycopg), а `?ssl=require` в URL или `connect_args={"ssl": "require"}`. Neon строки обычно дают в формате psycopg (`sslmode=require`) — нужно конвертировать.
- **Pooler нюанс:** брать **direct (non-pooled) endpoint** Neon, иначе с pgbouncer + asyncpg ломаются prepared statements (или ставить `statement_cache_size=0`).
- План применения: получить URL → переписать под asyncpg-формат → положить в `.env` → `alembic upgrade head` (проверить, что `CREATE EXTENSION vector` проходит на Neon) → smoke-тест ingest+search.

### 2026-06-02 — Сессия: Neon подключён, Phase 1 verified
- Пользователь дал Neon connection string (pooled, psycopg-формат).
- Конвертировал под asyncpg: **direct endpoint** (убрал `-pooler`) + `?ssl=require` (вместо `sslmode`/`channel_binding`). Положил в `backend/.env` (gitignored). Предупреждение в файле: только тестовые данные.
- Локальное dev-окружение без Docker: `backend/.venv` на **Python 3.11.9** (`py -3.11 -m venv .venv`), зависимости поставлены (asyncpg 0.31, SQLAlchemy 2.0.50, alembic 1.18, fastapi, uvicorn).
- `alembic upgrade head` → миграция `0001` прошла на Neon, включая `CREATE EXTENSION vector`. ✅
- Smoke-тест endpoint'ов (backend на 127.0.0.1:8000):
  - `POST /conversations` → `created:true`, 2 msg. Повторный → `created:false` (UPSERT/wipe-reinsert работает).
  - `GET /search?q=pgvector` / `Postgres` / `семантического` → находит, сниппеты с подсветкой. **Русский полнотекст через `simple` работает.** ✅
  - `GET /conversations`, `DELETE /conversations/{id}` (204) → ок. Тестовая строка удалена с Neon.
- **Фикс кода:** в `routes/conversations.py` убран мёртвый `session.execute(func.to_tsvector(...))` (без фикса делал бесполезный `SELECT ... FROM messages` full-scan на каждом ingest); `update` поднят в импорты. После фикса smoke-тест повторён — всё ок.

### 2026-06-02 — Сессия: web заскаффолжен (Phase 1)
- **Решение по UI:** чистый Tailwind, НЕ shadcn/ui. Причины: исходники web уже написаны в цельной «терминальной» эстетике на чистом Tailwind; Phase 1 UI — 3 простые страницы без сложных примитивов (диалоги/комбобоксы/тосты), ради которых берут shadcn; shadcn требует `@/`-алиас, а наш скаффолд намеренно `--no-import-alias`. shadcn отложен до Phase 3/4 (UI `/me` и `/chat`). Зафиксировано в Decision Log.
- `create-next-app@latest` → **Next.js 16.2.7 + React 19.2.4 + Tailwind v4** (не 14/15, как писал старый INSTALL.md). Tailwind v4 = нет `tailwind.config.js`, всё через `@import "tailwindcss"` / `@plugin` в `app/globals.css`.
- Процедура: бэкап наших `app/`+`lib/`+`INSTALL.md` → скаффолд в пустую `web/` → возврат наших исходников поверх сгенерированных → удалил мусор скаффолдера (`web/CLAUDE.md`, `web/AGENTS.md`) → бэкап удалён.
- Доставлены зависимости: `react-markdown`, `remark-gfm`, `-D @tailwindcss/typography` (последний — для `prose`, старый INSTALL.md его НЕ ставил → классы `prose` не работали бы). `globals.css` урезан до `@import "tailwindcss"; @plugin "@tailwindcss/typography";`.
- **Починены 2 бага в `web/app/page.tsx`** (всплыли на typecheck):
  1. `sourceClass(): JSX.Element` → `ReactElement` (в React 19 глобального namespace `JSX` нет).
  2. `sourceClass()` возвращает готовый `<span>`-бейдж, но вызывался как `className={sourceClass(...)}` (под `as any`) — JSX-элемент в строковом `className`. Заменил на рендер элемента `{sourceClass(...)}` в 2 местах. Раньше бейджи рендерились бы без стилей.
- **Верификация web:** `npm run build` зелёный (typecheck + SSG `/` и `/c/[id]`). Dev-сервер поднимается, `GET /` → 200, `<title>Personal AI Memory</title>`.
- `web/INSTALL.md` обновлён под Next 16 / Tailwind v4 / typography / async-params.
- **Верификация связки web↔backend ✅:** backend (uvicorn против Neon) + curl с `Origin: http://localhost:3000` (эмуляция браузера, без реального браузера). `POST /conversations` → 200 `created:true` 2 msg; `GET /conversations?source=claude` → наш item; `GET /search?q=pgvector` → сниппет с подсветкой «pgvector» (русский контент). Во всех ответах `access-control-allow-origin: http://localhost:3000` (CORS пускает web-origin → клиентские fetch из `lib/api.ts` пройдут). Тестовая строка удалена (DELETE 204). CORS-дефолт в `config.py`: `chrome-extension://*,http://localhost:3000`.
- **Phase 1 вертикальный срез (backend↔БД↔web) подтверждён.** Осталось по Phase 1: extension (скаффолд + проверка перехвата), `contents/gemini.ts` (нужен пользователь), baseline-коммит.

### 2026-06-02 — Сессия: extension заскаффолжен + фикс MAIN-world моста (Phase 1)
- **Связка web↔backend проверена** (см. правку записи web выше): backend uvicorn против Neon, curl с `Origin: http://localhost:3000`, все ответы с `access-control-allow-origin`, тестовая строка удалена.
- **Extension собран:** Plasmo 0.90.5 + React 19 + TS 6. `package.json` с manifest-блоком (`host_permissions` на 3 AI-сайта + `localhost:8000`, permissions `storage`/`webRequest`). `plasmo build` → `build/chrome-mv3-prod` зелёный.
- **Два недостающих файла, без которых Plasmo не собирается** (в старом INSTALL.md их не было): `tsconfig.json` (Plasmo 0.90 НЕ генерит сам — падал с ENOENT) и `assets/icon.png` (без иконки манифест ссылается на несуществующие `gen-assets/icon16.png` → ERROR). Иконку сгенерил через System.Drawing (тёмный фон + лаймовая рамка + «PAM», 512×512).
- **Как Plasmo цепляет content-скрипты:** MAIN-world (`claude/chatgpt/gemini`) регистрируются динамически через `chrome.scripting.registerContentScripts` (Plasmo внедряет регистратор в background bundle → авто-permission `scripting`); в статическом манифесте их нет. Isolated-world `relay.ts` — обычный `content_scripts` entry.
- **Архитектурный фикс (баг в исходниках):** `claude.ts` и `chatgpt.ts` объявлены `world: "MAIN"`, но содержали `window.addEventListener("message", … chrome.runtime.sendMessage …)`. В MAIN-мире `chrome.runtime` недоступен → мост был бы сломан (capture не доходил бы до background). Это противоречило архитектуре в CLAUDE.md («слушатель в isolated-мире»). Решение: создан `contents/relay.ts` (без `world` → isolated, матчит все 4 паттерна), слушатели убраны из MAIN-скриптов. Обновлён CLAUDE.md (абзац про page/isolated world + file map) и `extension/INSTALL.md`.
- **НЕ проверено вживую:** реальный перехват на claude.ai/chatgpt (нужен Chrome + залогиненный пользователь). Это «самая хрупкая часть Phase 1» по CLAUDE.md — URL_RE/парсеры могли устареть. Фикс моста тоже финально проверяется только в браузере.

### 2026-06-02 — Сессия: хардненинг манифеста extension (перед браузерным тестом)
- Пользователь запустил `npm run dev` (Plasmo dev собрался успешно). Перед загрузкой в Chrome прошёлся по оставшимся техническим моментам:
- **Убран `webRequest`** из `permissions` — grep подтвердил, что код использует только `chrome.runtime` + `chrome.storage`, а capture идёт через патч `window.fetch`, не через `chrome.webRequest`. Неиспользуемое разрешение = лишняя поверхность атаки + пугающий промпт (а проект privacy-first).
- **Добавлен `https://chat.openai.com/*` в `host_permissions`** — его матчат `chatgpt.ts` и `relay.ts`, но в host_permissions его не было. MAIN-world скрипты Plasmo регистрирует динамически через `chrome.scripting.registerContentScripts`, который требует matches ⊆ host_permissions; рассинхрон мог уронить регистрацию ВСЕХ MAIN-скриптов → capture не работал бы даже на chatgpt.com.
- **Док-фиксы:** README (`Next.js 14`→`16`, добавлен `relay.ts` в дерево); `.env.example` (заметка про Neon/asyncpg DSN — direct endpoint + `?ssl=require` + префикс `postgresql+asyncpg://`; и что backend читает `backend/.env`, т.к. `env_file=".env"` CWD-relative).
- **Важно для теста:** Plasmo dev НЕ хот-релоадит изменения `manifest` в `package.json` → пользователю надо перезапустить `npm run dev` (Ctrl+C + заново) и перезагрузить extension в `chrome://extensions`, иначе будет старый манифест (с webRequest, без chat.openai.com). Prod build уже пересобран и валиден.

**Как поднять backend локально (без Docker):**
```bash
cd backend
./.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
# миграции: DATABASE_URL берётся из backend/.env приложением; для alembic — задать env var:
#   DATABASE_URL='postgresql+asyncpg://...?ssl=require' ./.venv/Scripts/python.exe -m alembic upgrade head
```

---

## 📝 Журнал решений (Decision Log)

| Дата | Решение | Почему |
|---|---|---|
| 2026-06-02 | Docker-запуск на паузе | проблемы с Windows у пользователя |
| 2026-06-02 | Применяем GSD-подход к процессу | мультиагентный вайбкодинг, борьба с context rot |
| 2026-06-02 | GSD — ручная адаптация в репо, без глобальной установки | обратимость, local-first, нет влияния на другие проекты |
| 2026-06-02 | Neon как DEV-БД пока Docker на паузе | pgvector «из коробки», нет боли с установкой на Windows |
| 2026-06-02 | Neon — только тестовые данные, НЕ реальные разговоры | сохранить local-first/приватность PAM |
| 2026-06-02 | Web UI — чистый Tailwind, НЕ shadcn/ui (отложен до Phase 3/4) | исходники уже на Tailwind; Phase 1 UI прост; shadcn требует `@/`-алиас (у нас `--no-import-alias`) |
| 2026-06-02 | Добавлен `contents/relay.ts` (isolated-world bridge), `chrome.runtime` убран из MAIN-скриптов | `chrome.runtime` недоступен в `world:"MAIN"`; так требует архитектура CLAUDE.md; иначе capture не доходит до background |

---

## ⏭️ Следующие действия (кандидаты)

- [x] Выбрать способ внедрения GSD → ручная адаптация.
- [x] Выбрать путь прогресса без Docker → Neon dev + локальный venv.
- [x] Поднять backend, прогнать миграцию, проверить `POST /conversations` и `/search`.
- [x] Заскаффолдить web по `web/INSTALL.md` → чистый Tailwind, Next 16, build зелёный.
- [x] Проверить связку web↔backend вживую (CORS + ingest/list/search).
- [x] Заскаффолдить extension (Plasmo build зелёный) + фикс MAIN-world моста (`relay.ts`).
- [ ] Проверить extension↔backend вживую в Chrome (нужен пользователь: Load unpacked + логин на claude.ai/chatgpt).
- [ ] Заскаффолдить extension по `extension/INSTALL.md`, проверить перехват на claude.ai/chatgpt → backend.
- [ ] Реализовать `contents/gemini.ts` (нужен пользователь + DevTools на gemini.google.com).
- [ ] Сделать первый baseline git-коммит (по просьбе пользователя).
- [ ] (опц.) Решить, нужен ли `alembic/env.py` авто-load `.env`, чтобы не задавать `DATABASE_URL` вручную для миграций.

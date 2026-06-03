# PAM — Handoff Log

> Живой журнал работы над **Personal AI Memory (PAM)** для передачи контекста между чатами.
> Каждый агент/сессия дописывает сюда **что сделано, какие решения приняты, что дальше**.
> Источник правды по архитектуре — `CLAUDE.md`; по плану фаз — `implementation-plan.html` (открывать в браузере) и `VIBE_PROMPT.md`.
> Формат вдохновлён GSD (Get Shit Done): мелкие верифицируемые шаги, фиксация решений, свежий контекст.

---

## 🔴 Активные ограничения (читать первым делом)

- **Docker на ПАУЗЕ** — НЕ запускать `docker compose ...` пока пользователь явно не разрешит. Backend гоняем локально: `backend/.venv` (Python 3.11) против Neon.
- **Neon — ТОЛЬКО dev/тесты, НЕ реальные разговоры** (local-first). Реальные данные — в локальный Postgres, когда вернётся Docker. (Кредиты Neon были в чате — при экспорте чата стоит ротировать.)
- **Git:** ветка `main` на GitHub `https://github.com/StudentMe2712/PAM.git`. Правило пользователя: значимые фичи → **отдельная ветка с понятным именем + понятные коммиты**; мелочь → в `main`. Перед коммитом — preflight `git check-ignore` (секреты/`node_modules`/билды уже в `.gitignore`).
- **Запуск:** `dev.bat` (backend+extension скрыто в фоне, web — в окне) + `stop-dev.bat`. Миграции alembic: `DATABASE_URL="$(grep ^DATABASE_URL= backend/.env|cut -d= -f2-)" backend/.venv/Scripts/python.exe -m alembic ...`.

---

## 📍 Текущее состояние (на 2026-06-03)

**🔀 Видение (уточнено):** PAM = личный AI с долгой памятью. ОСНОВНОЕ: (1) **чат с памятью** (Phase 3+4, чат = главный экран), (2) **личный лектор** (Phase 5: PDF/YouTube/статья → курс+тесты). ДОПОЛНИТЕЛЬНОЕ: раздел **«Импорт истории»** (бывш. Phase 1: extension тянет разговоры). Детали — `ROADMAP.md` → «Продуктовое видение».

| Компонент | Статус |
|---|---|
| Backend (FastAPI, Neon, миграции 0001 + `efc12b5654c3` saved_messages) | ✅ проверен вживую (14/14 тестов) |
| Web (Next 16 + Tailwind v4): лендинг `/`, `/history` (список+поиск+refresh), `/c/[id]` (★), `/saved`, nav-бар | ✅ build зелёный, связка с backend проверена |
| Extension (Plasmo): `background`, `popup`, MAIN-world `claude/chatgpt`, isolated `relay`, `gemini`=заглушка | ✅ capture подтверждён в браузере (user 24+24); мост MAIN→relay→background работает |
| Фича ★ Избранное (snapshot, переживает ре-ингест; FK SET NULL) | ✅ зашипжена в `main` |

**Phase 1 закрыта** (как «Импорт истории»). Открытые мелочи: `gemini.ts` (нужен DevTools пользователя), полнота очень длинных чатов ChatGPT (BFS vs current_node — пока полнота подтверждена 24+24).

**▶ СЛЕДУЮЩИЙ ШАГ: Phase 2 (RAG).** Ждём выбор пользователя A/B (см. низ лога) и установку **Ollama** (`ollama pull nomic-embed-text`) — единственное, что нужно от пользователя.

---

## 🗺️ Roadmap (уточнённый — детали в `.planning/ROADMAP.md`)

1. **Phase 1** ✅ *(закрыта)* — capture + full-text search → раздел «Импорт истории». + ★ Избранное.
2. **Phase 2** *(следующая)* — Ollama (`nomic-embed-text`), таблица `chunks`, эмбеддинги, гибридный поиск (text+vector, RRF). Разблокирует авто-«популярное», mindmap v2, память чата.
3. **Phase 3** — память: извлечение `profile_facts` (prompt-injection + hallucination guard `source_message_id`), UI `/me`.
4. **Phase 4** — **чат с памятью = ГЛАВНЫЙ экран** (`POST /chat` SSE, RAG, Groq→Claude). Прошлый список/поиск уже в разделе «Импорт».
5. **Phase 5** — **Личный лектор**: ингест PDF/YouTube/статья → персональный мини-курс + тесты под уровень из памяти.

Правило: фаза шиппится отдельно, на своей ветке (`phase-2-rag` и т.д.). Не тянуть Phase N+1 в Phase N.

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

### 2026-06-02 — Сессия: dev.bat + подтверждение работы capture-моста
- **`dev.bat`** в корне: запускает backend (venv+uvicorn --reload), web (`npm run dev`), extension (`plasmo dev`) в 3 отдельных окнах через `start /D`. Локальный Postgres не стартует (Neon + Docker на паузе). Когда вернётся Docker — backend-окно меняется на `docker compose up`.
- **🎉 Capture-пайплайн ПОДТВЕРЖДЁН в браузере.** Пользователь загрузил extension (backend был выключен). Popup: `Сохранено:0, В очереди:1, Ошибок:1`. Это доказывает, что вся цепочка работает: патч `window.fetch` (MAIN) → `postMessage` → `relay.ts` (isolated) → `chrome.runtime.sendMessage` → очередь в `background.ts`. Единственный сбой — финальный `POST localhost:8000` (backend не запущен → 5 ретраев → `failed++`). **Мост MAIN→relay→background (мой фикс) работает.** Осталось: поднять backend, сбросить счётчики, переоткрыть разговор → должно уйти в «Сохранено».
- Возможный остаточный риск: если backend поднят, но прилетит 422 — значит парсер отдаёт payload не по схеме (тогда смотреть claude.ts/chatgpt.ts). Но структурно payload собрался (иначе не дошёл бы до очереди).

### 2026-06-02 — Сессия: разворот видения + ветка import-history-section
- **Разворот продукта** (по уточнению пользователя): главное — чат с долгой памятью (Phase 3+4, чат = главный экран) + личный лектор (новый Phase 5, PDF/YouTube/статья → курс+тесты). Capture/поиск (Phase 1) → вспомогательный раздел «Импорт истории». ROADMAP обновлён (раздел «Продуктовое видение»), коммит на `main` `36a5a52`. Ответы пользователю: чат-с-памятью = это и был финал плана; парсер разговоров нужен только для импорта (опционально), главному чату — нет; лектору нужны парсеры PDF/транскрипт/статья.
- **Капча состояния:** пользователь подтвердил перехват вживую («Сохранено:1»), но заметил «Ошибок:2» (вероятно накопленные до сброса) и «86 сообщений — не вся переписка».
- **Выбор приоритета:** (C) доводка «Импорт истории». Ветка **`import-history-section`**.
- **Сделано на ветке:**
  - web: список+поиск перенесён в `/history`; главная `/` стала лендингом с карточками разделов (Чат/Лектор — «скоро», История — «открыть»); навигация в `layout.tsx`; back-link детальной → `/history`. Импорт в `history/page.tsx` поправлен на `../../lib/api`. Build зелёный (роуты `/`, `/history`, `/c/[id]`).
  - extension: вероятная причина «не вся переписка» — `chatgpt.ts` отбрасывал object-парты (мультимодальный/структурный контент); теперь извлекает `p.text||p.content`. Оба парсера логируют «extracted N of M» для диагностики. Build зелёный.
- **Открыто (нужен пользователь):** прогнать перехват, снять из DevTools console числа `[PAM/...] extracted N of M`. Разрыв N<M → теряем парты (точечный фикс парсера); M уже меньше реального → сайт отдаёт частично (пагинация, надо дотягивать).

### 2026-06-02 — Сессия: фоновый dev.bat, nav-бар, диагностика полноты
- **`dev.bat` переписан на фоновый запуск:** backend и extension стартуют скрыто через `powershell Start-Process -WindowStyle Hidden` с редиректом в логи (`backend\dev-backend.log`, `extension\dev-extension.log` — оба под `*.log` в .gitignore). web — в видимом окне. Проверил, что `Hidden + RedirectStandardOutput` работает на PS 5.1. Добавлен **`stop-dev.bat`** (через `Get-CimInstance` матчит `uvicorn app.main`/`plasmo` и `Stop-Process`). Оба .bat — чистый ASCII.
- **Nav-бар** (`web/app/nav.tsx`, клиентский, `usePathname`): sticky-бар с backdrop-blur, бренд PAM, табы с активным состоянием, «скоро»-чипы для Чат/Лектор. Заменил прежние «ссылки как на форуме». web build зелёный.
- **Диагностика перехвата:** пользователь дал `[PAM/chatgpt] extracted 48 messages from 81 nodes`. Вывод: 33 узла — системные/пустые/tool, 48 — вероятно полная нить (не потеря). Усилил лог разбивкой по ролям (user/assistant/...), чтобы подтвердить. CSP-ошибка `ws://localhost:1815` = Plasmo HMR-вебсокет, только в dev, на capture не влияет.
- **Запланированы фичи раздела «Импорт»** (ROADMAP): pin важных сообщений, mindmap тем «что чаще спрашиваешь» (v1 частотность / v2 эмбеддинги Phase 2), аналитика. Заметка про ChatGPT: захват по JSON из fetch, не по скроллу — порядок «старое вверху» на полноту не влияет.
- Всё на ветке `import-history-section`.

### 2026-06-02 — Сессия: ★ Избранное (ветка saved-messages)
- **Полнота перехвата закрыта:** пользователь дал `extracted 48 from 81 {user:24, assistant:24}` → 24+24 полная переписка, потерь нет (33 узла служебные). CSP `ws://localhost:1815` = Plasmo HMR (dev-only), безвреден.
- **Выбор пользователя:** сначала ручное ★ Избранное, потом RAG (auto-«популярное» — это RAG-фича, нужны эмбеддинги).
- `import-history-section` смержена в `main` (ff). Заведена ветка `saved-messages`.
- **Backend ★ Избранное:** модель `SavedMessage` (снимок content; FK conversation_id → SET NULL; НЕ флаг на messages, т.к. их вайпают при ре-ингесте), схемы `SavedMessageIn/Out`, роуты `POST/GET/DELETE /saved` (`routes/saved.py`, зарегистрирован в main.py). Миграция autogenerate `efc12b5654c3` (down_revision 0001), применена на Neon. Smoke-тест свежим backend: openapi содержит /saved, POST→201, GET→1, DELETE→204, итог 0. (Прежний 404 — отвечал старый процесс на :8000; убил, поднял свежий. Прежний 400 на POST — кириллица в curl на Windows билась, ASCII-тело прошло; реальный браузер шлёт корректный UTF-8.)
- **Web ★ Избранное:** `lib/api.ts` (+saveMessage/listSaved/deleteSaved+типы), кнопка ☆/★ на каждом сообщении в `/c/[id]` (состояние savedIds), новый раздел `/saved` (markdown, удаление, ссылка на разговор), вкладка «Избранное» в nav. Web build зелёный (роуты /, /history, /saved, /c/[id]).
- **Открыто:** браузерная проверка (нужен backend с НОВЫМ кодом — перезапусти dev.bat); затем мерж в main. Дальше — Phase 2 RAG (нужен Ollama).

### 2026-06-03 — Сессия: кнопка обновления + расширенные тесты Избранного
- Пользователь подтвердил: ★ Избранное работает. Попросил красивую кнопку обновления в «Истории» (вместо перезагрузки браузера) + доп. тесты.
- **Кнопка обновления:** `web/app/refresh-button.tsx` (SVG refresh-иконка + `animate-spin` при загрузке). Подключена на `/history` и `/saved` через `tick`-стейт (эффект списка зависит от `[source, tick]` / `[tick]`). Web build зелёный.
- **Расширенные тесты (14/14):** stdlib-`urllib` скрипт (UTF-8), backend на порту **8001** (8000 был занят фантомным сокетом/рабочим backend пользователя — не трогал). Проверено: POST/UPSERT, `/saved` 201/Cyrillic round-trip/link, **★ выживает при ре-захвате разговора** (ключевое), detail после ре-ингеста, поиск кириллицы, DELETE conversation→204, **★ остаётся + conversation_id→NULL (FK SET NULL)**, DELETE saved→204, cleanup. Тестовые данные с Neon удалены (0 остатков).
- Замечание по портам: `--reload` backend плодит дочерний процесс, чья cmdline НЕ матчит `*uvicorn*app.main*` → `stop-dev.bat`/kill по имени может не добить его; надёжнее kill по владельцу порта. (На будущее.)
- Всё на ветке `saved-messages`. Дальше: мерж в main + Phase 2 RAG (нужен Ollama).

### 2026-06-03 — Сессия: Ollama настроена + старт Phase 2 (таблица chunks)
- Пользователь установил Ollama. Пояснил: GUI-чат не нужен (закрыть); важна служба на :11434 (работает, `HTTP 200`). `ollama` НЕ в PATH git-bash → работаю через HTTP API.
- **Модель скачал сам через API**: `POST :11434/api/pull {"model":"nomic-embed-text"}` → success. Проверил `POST :11434/api/embeddings` → **dim=768**, кириллица ок. Под `vector(768)` в плане.
- **Старт Phase 2** (путь A — Ollama готова). Ветка **`phase-2-rag`**.
  - `pgvector` 0.4.2 в venv + добавлен в `backend/pyproject.toml`.
  - Модель `Chunk` (`backend/app/models.py`): message_id FK CASCADE, content, position, `embedding Vector(768)`, created_at.
  - Миграция `2ec708645017` (autogenerate + ручная правка): **добавил `from pgvector.sqlalchemy import Vector`** (autogen забыл импорт, упало бы NameError) и **HNSW-индекс** `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)`. Применена на Neon, проверено: таблица + 3 индекса (pkey, ix_chunks_message, ix_chunks_embedding_hnsw).
- **Дальше по Phase 2** (см. STATE): чанкование → эмбеддинг-воркер (Ollama) → `/search/semantic` + гибрид (RRF) → UI-переключатель → тесты → мерж.
- Запрос эмбеддинга для воркера: `POST http://localhost:11434/api/embeddings` body `{"model":"nomic-embed-text","prompt":"<text>"}` → `{"embedding":[...768...]}`.

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

# Phase 2 (v2) — remove the in-app gallery + build the static HTML gallery

**Part of:** [plan.md](plan.md) · **Status:** 🔨 (v2 — replaces the dead in-app approach)

## Why v2
Phase 1 built an in-app `/gallery` (rail icon + edit-mode top bar mounting the real modules).
Carl's call 18 Jul, after most screens rendered empty from a near-empty dev DB: **scrap the
in-app machinery — it feels stuck inside the system and messy — and replace it with raw HTML
files in a folder he opens directly** (double-click, no server, no login). Data = **baked-in
sample data** (one fictional company), **sample-only**.

The honest trade Carl accepted: the HTML files are **snapshots** — editing a snapshot does NOT
change the real site. Loop: open a snapshot → "Copy design prompt" → paste into a chat → the
chat edits the REAL screen code → the chat re-runs the export so snapshots match again. Every
page carries its generation date, so staleness is visible at a glance.

## Part A — REMOVE the in-app gallery — ❌ CANCELLED (Carl's call, 18 Jul)
Carl looked at the live in-app `/gallery` (e.g. `/gallery/run_debrief`) and decided to **keep
both**: the in-app live gallery AND the static HTML snapshot folder — they do different jobs
(live, real-data, mounts real modules · vs · no-server, sample-data, opens from disk). So the
in-app gallery **stays**; nothing in `admin/src/` is removed. Verified rendering on main
(build 07b784bd). This phase is now **Parts B + C only**.

## Part B — the static gallery: `docs/screen-gallery/`
Self-contained HTML files opened via `file://`:
- `index.html` — grouped tree of every screen (from the GROUPS/labels metadata, copied into the script).
- one page per screen — a slim soft-yellow top strip (screen name · source file · **Copy design
  prompt** with a select-all textarea fallback · "Snapshot · <date> · sample data") above the
  screen exactly as rendered, CSS inlined, scripts stripped.

## Part C — the generator: `scripts/gallery-export.mjs` (+ `scripts/gallery/fixtures/`)
Free, local Playwright script; regenerates the whole folder in one run.
1. Needs the **Vite dev server** running (`npm run dev`). Backend NOT required — every `/api/**`
   GET is answered from fixtures via `page.route`, so `/auth/me` (superadmin) and every list are
   controlled. Non-GETs are stubbed. A no-op EventSource is injected. **Builder's call:** route
   interception supersedes the plan's DEV_AUTOLOGIN note — no app code is involved, app stays clean.
2. Flow screens: inject `localStorage.seroSessionId` + serve `GET /sessions/:id` from the
   snapshot fixture so the app's own boot (`rehydrateById`) fills the store. The snapshot's
   `stage` is overridden per flow route so ONE session drives Briefing, Interview, Preparation…
3. Per screen: navigate the real route → wait settled → freeze animations → capture
   `documentElement.outerHTML` → inline same-origin stylesheets → strip `<script>`s → wrap with
   the header strip → write the file. `index.html` built from the metadata.
4. Console OK/MISS table; exits non-zero if any expected fixture missed (stale fixture = loud).

### Fixtures (`scripts/gallery/fixtures/`)
- Shapes from `shared/api.js` call-site comments + backend types, not guessed.
- `session.json` = a real completed local run (`session-state.json` → `snapshot()` shape), names
  swapped to the fictional team (Amira Khan / Jonas Okafor / Lena Sørensen). **$0 — no OpenAI.**

### The refresh ritual
"Refresh the gallery" → `node scripts/gallery-export.mjs` with the dev server up (chats do this;
Carl can too). Re-export is the ONLY sync mechanism; the date stamp shows staleness.

## Done when
- [x] Part B/C: export runs, every screen page + index.html written; flow screens (Briefing full
      of sample content — the previously-empty case) render filled. **42/45 captured, 0 fail**
      (the 3 customer-only screens need the :3002 server).
- [x] `docs/screen-gallery/index.html` opens via `file://`; screenshots proved the tree + Briefing
      / Team / Pulse full of sample data (18 Jul).
- [x] ~~Part A~~ — **cancelled, keep both** (above).
- [ ] Carl has walked it and said go.

## Test scenarios — for the product owner
1. **Double-click it** — open `docs/screen-gallery/index.html` from the folder (no server). You
   see the grouped tree of every screen. Click Briefing → it opens full of a real-looking recap
   for the fictional team, with the soft-yellow strip on top. ❌ Not OK if blank.
2. **Copy a prompt** — on any screen page, click "Copy design prompt" — it copies (or selects the
   textarea to copy manually). That's what you paste into a chat to restyle that screen.
3. **Freshness** — every page shows "Snapshot · <date> · sample data". After any design work
   lands, a chat re-runs the export and the date moves on.

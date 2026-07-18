# Screen Gallery — every page in one tree, prefilled, editable for real

**Goal:** One internal page (`/gallery`) that lists every screen in the app as a tree; Carl clicks (or names) a screen, sees it rendered with realistic data, and any design edit made to it lands on the real site because the gallery renders the real screen code.
**Driver:** Carl
**Created:** Fri 18 Jul 2026
**Mockup:** https://claude.ai/code/artifact/b83fd600-547e-470e-8122-a758cbedfdb2 — approved Fri 18 Jul 2026 (design evolved live: drawer → soft-yellow dropdown → edit-mode top bar, all Carl-picked)
**Board:** https://claude.ai/code/artifact/d15c2842-9726-4d89-a53f-60eff888d205

## Done means
- Carl opens `/gallery`, sees a grouped tree of ALL screens (~44), with a filter box.
- Clicking any list/dashboard/content screen shows it filled with real local data.
- Clicking any 1:1 flow screen (Intake → Debrief) shows it prefilled from a demo session.
- A deep link like `/gallery/briefing` survives reload — so a Claude session can screenshot exactly that screen while restyling it.
- The gallery is invisible to managers and blocked on the live site.

## Resolved before we start
- Screen registry = the `loaders` map in `admin/src/main.js` (~44 stages) — gets extracted to `admin/src/stage-loaders.js` so the gallery iterates it and new screens appear automatically.
- Frontend-app screens mount fine inside the admin app (they already import admin's `state.js`); the three frontend-only ones (welcome, join, members) get gallery-local loaders.
- Prefill is hybrid: most screens fetch their own data from the local dev API (free realism); flow screens get seeded via `getSession(DEMO_SESSION_ID)` (a pinned real local run) with a static fixture fallback.
- Gating mirrors `/test`: `INTERNAL_ONLY` + `LIVE_HIDDEN` in `admin/src/router.js`.
- Full approved plan: `C:\Users\User\.claude\plans\id-like-to-look-golden-zephyr.md`.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Gallery shell (in-app) | Tree + host + deep links; all API-backed screens render live | ✅ superseded by v2 |
| 2 | **v2: static HTML gallery** | Remove the in-app gallery; raw HTML snapshots in `docs/screen-gallery/` + export script + sample-data fixtures | 🔨 |
| 3 | Design-loop polish (optional) | "Open real route" links, width toggle, empty/error-state stubs — only if wanted | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ happened, now superseded by v2.** The in-app `/gallery` (rail icon + edit-mode top
bar mounting the real modules) was green-lit 18 Jul — but on his own near-empty dev DB most
screens rendered empty. Carl's final call: **scrap the in-app machinery** (feels stuck inside the
system) and replace it with **raw HTML snapshots in a folder he opens directly**. Full v2 design
in [phase-2.md](phase-2.md) and the approved plan `id-like-to-look-golden-zephyr.md`.

**Now:** Phase 2 v2 — (A) remove the in-app gallery, (B+C) static HTML gallery at
`docs/screen-gallery/` + `scripts/gallery-export.mjs` + sample-data fixtures. Part A's two
files (main.js, app-nav.js) are held behind another chat's lane; B+C are independent and built first.

## Parked
- Fetch-stub layer for designing empty/error states (only if Carl asks — Phase 3 candidate).
- Intercepting in-screen navigation so child screens can't route away from the gallery (v1 accepts browser Back).
- Voice control ("say a name") — the filter box covers type-to-find; true voice is out of scope.

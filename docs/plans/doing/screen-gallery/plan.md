# Screen Gallery — every page in one tree, prefilled, editable for real

**Goal:** One internal page (`/gallery`) that lists every screen in the app as a tree; Carl clicks (or names) a screen, sees it rendered with realistic data, and any design edit made to it lands on the real site because the gallery renders the real screen code.
**Driver:** Carl
**Created:** Fri 18 Jul 2026
**Mockup:** https://claude.ai/code/artifact/b83fd600-547e-470e-8122-a758cbedfdb2 — shared Fri 18 Jul 2026, awaiting Carl's approval
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
| 1 | Gallery shell | Tree + host + deep links; all API-backed screens render live | ⬜ |
| 2 | Flow-screen prefill | Demo session seeds Intake → Debrief + parameterised screens | ⬜ |
| 3 | Design-loop polish (optional) | "Open real route" links, width toggle, empty/error-state stubs — only if wanted | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Folder set up Fri 18 Jul 2026. Mockup artifact shared — waiting on Carl's approval of the picture before Phase 1 starts. Baseline to be run at Phase 1 start.

## Parked
- Fetch-stub layer for designing empty/error states (only if Carl asks — Phase 3 candidate).
- Intercepting in-screen navigation so child screens can't route away from the gallery (v1 accepts browser Back).
- Voice control ("say a name") — the filter box covers type-to-find; true voice is out of scope.

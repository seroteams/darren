# Phase 1 — Gallery shell

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built — awaiting Carl's QA walk

## Built (18 Jul 2026)
- New registry `admin/src/stage-loaders.js` (loaders moved verbatim from main.js + GALLERY entry); main.js imports it.
- `admin/src/state.js` — `STAGES.GALLERY` + `galleryScreen` state.
- `admin/src/router.js` — `/gallery` + `/gallery/:screenId` routes, parse regex, gated `INTERNAL_ONLY` + `LIVE_HIDDEN`.
- `admin/src/main.js` — boot + popstate branches carry `galleryScreen`.
- `admin/src/stages/gallery/gallery.js` — tree (groups + filter) + host pane + child mount/unmount + URL sync + live-buttons banner + **Copy design prompt** button.
- `admin/src/stages/gallery/screens.js` — labels/groups overlay, frontend-only loaders (welcome/join/members), prompt template, DEMO_SESSION_ID placeholder (Phase 2).
- Copy-prompt file path derived from the Vite-resolved specifier — handles both admin-local and `/@fs/` cross-package screens (verified: `admin/src/stages/briefing.js`, `frontend/src/stages/team.ts`).
- Verified on screen (Playwright, animations frozen): tree renders all groups + `needs data` tags, About/Team/Briefing/Library mount live, filter narrows ("brief" → Briefing + Debrief), deep link `/gallery/about` + `/gallery/briefing` survive reload.
- Offline proof: `npm run typecheck` clean · `npm test` 156/156.
- Known edge (accepted v1): the Design component-sheet screen renders live demo nav that can self-navigate — browser Back returns.

## Goal
The `/gallery` page exists: a grouped tree of every screen on the left, the real screen rendered on the right, deep links that survive reload — with every self-fetching screen already showing real local data.

## Changes
- `admin/src/stage-loaders.js` (NEW) — the screen registry, moved verbatim out of `main.js`, plus the GALLERY entry and loaders for the three frontend-only screens (welcome, join, members).
- `admin/src/main.js` — import the registry; handle `/gallery/:screenId` on boot and back/forward (mirrors the person-detail pattern).
- `admin/src/state.js` — add `STAGES.GALLERY` + `galleryScreen` to state.
- `admin/src/router.js` — routes for `/gallery` and `/gallery/:screenId`; gate as `INTERNAL_ONLY` + `LIVE_HIDDEN`.
- `admin/src/stages/gallery/gallery.js` (NEW) — the page: tree with groups + filter box, host pane that mounts/unmounts the chosen screen with the real app dependencies, URL sync, and a banner ("Preview of real screens — buttons are live against your local data").
- `admin/src/stages/gallery/screens.js` (NEW) — per-screen labels + groups; unlisted screens fall into "New / unsorted" instead of vanishing.

## Not in this phase
- Demo-session prefill for the flow screens (Phase 2) — they'll show their empty states, tagged "needs demo data" in the tree.
- Any polish from Phase 3.

## Done when
- [ ] `/gallery` renders the tree with all ~44 screens grouped.
- [ ] Clicking Team / Runs / Library / Pulse shows them populated with real local data — verified by screenshot of the actual rendered page, not the code.
- [ ] Reload on `/gallery/team` lands back on Team inside the gallery.
- [ ] A manager-role login hitting `/gallery` bounces home (internal-only gate works).
- [ ] Every existing route still works after the registry move (smoke the app's main screens).
- [ ] `npm run typecheck` + `npm test` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself (dev app running, logged in as you). Next phase waits for your green light.
1. **The tree** — open `localhost:3000/admin/gallery`. You should see a left-hand list of every screen in the app, grouped (Auth, Manager home, 1:1 flow, Member, Content, Superadmin, Internal tools), with a search box at the top. ❌ Not OK if any screen you know of is missing.
2. **Jump to a screen** — click "Team". The real Team page should appear on the right, showing your actual team members. Click "Runs" — your real runs list. ❌ Not OK if they're empty or broken.
3. **Find by name** — type "brief" in the filter box. The list should narrow to Briefing. 
4. **The link sticks** — while on Team, copy the browser address, open a new tab, paste it. You should land straight back on Team inside the gallery. ❌ Not OK if you end up on the normal home page.
5. **Nothing else broke** — leave the gallery, walk your normal app (home, a run, the library). Everything should look and work exactly as before.

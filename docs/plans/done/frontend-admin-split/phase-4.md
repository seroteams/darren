# Phase 4 — Serve + fence the two apps

**Part of:** [PLAN.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-08
Carl ran the proof test and green-lit ("a"). This closed the phase AND the track (4/4 + 2b).

## The shape Carl picked (option A, 2026-07-08)
**The public deploy serves the customer app only; the admin app never ships.** Admin tools stay a
local tool on Carl's machine (:3000 dev). Strongest possible fence — no login wall to trust, the
admin code simply isn't on the internet. (Option B — admin at an internal path behind login — parked
as a later upgrade if admin-on-the-go is ever needed.)

## 🔨 BUILT 2026-07-08 ($0, test-first)
- **Test first (red → green):** new [scripts/test-customer-serving.js](../../../scripts/test-customer-serving.js),
  auto-discovered by `npm test`. It (1) **builds** the customer app fresh (so the fence can't go stale),
  (2) **greps the bundle** for internal-tool markers + key patterns (bench, superadmin API paths,
  `sk-proj-`/`sk-ant-`/`OPENAI_API_KEY` — zero hits across 39 files), (3) **boots a real
  production-mode server** on a scratch port and proves `GET /` serves the *customer* index (hashed
  entry-script match — verify the destination, not the code), deep links fall back to it, and unknown
  `/api/*` still answers the JSON error shape. Ran RED against the old wiring (admin/dist served),
  GREEN after the flip.
- **The flip:** [server.ts](../../../backend/api/server.ts) `CLIENT_DIST` → `frontend/dist` (prod only;
  dev ports unchanged — :3000 admin vite, :3002 customer vite, :3001 API).
- **Render blueprint updated:** [render.yaml](../../../render.yaml) `buildCommand` →
  `npm run build:customer` (was `npm run build`, which built the admin app — the live deploy would have
  served the wrong app or nothing). Comment in the file records why. Coordinated with the render-deploy
  track: nothing pushed yet, so no live blueprint drift.

## Proof (all free, $0)
`npm test` **98/98** (new serving test included) · 3 typechecks clean · red→green shown on the real
wiring. Bundle fence now runs on every `npm test` forever.

## Done when
- [x] The public URL (a production boot) serves the customer app; no admin tool reachable.
- [x] `frontend/dist` greps clean: no admin-tool modules, no key patterns.
- [x] Both apps build; dev workflow unchanged.
- [x] Product owner has tested the scenarios below and said go. (Green-lit 2026-07-08.)

## Test scenarios — for the product owner (~3 min, all free)
1. **The proof test** — run `node scripts/test-customer-serving.js` and watch the 8 `ok` lines
   (builds the customer app, greps the bundle, boots a real prod server, checks what it serves).
   ❌ Not OK if any line says NOT OK.
2. **See it yourself (optional)** — `npm start` then open http://localhost:3000 — you get the
   customer welcome screen, not the admin console; `/universe` lands you back on the customer app.
   Ctrl-C when done. ❌ Not OK if any internal tool renders.
3. **Dev unchanged** — your normal `npm run dev` on :3000 still shows the full admin app.
   ❌ Not OK if your workshop changed.

## After green light
This closes the track (4/4 + 2b). Close-out: move the folder to done/, changelog entry (the split is
customer-visible now), and the render-deploy track continues with the corrected blueprint.

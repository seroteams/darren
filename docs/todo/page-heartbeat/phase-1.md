# Phase 1 — Heartbeat endpoint + Guide goes live

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ done — walked + green-lit by Carl 2026-07-05 ("ALL GOOD")

## Goal
The Guide page's UPDATE button really re-reads the codebase (via a new server endpoint), redraws the stale-prone sections from it, and reports what changed in plain words.

## Changes
- **Backend (new service, TDD, TypeScript):** `backend/api/services/heartbeat/` — repo (fs boundary) + service (pure) + controller + test. `GET /api/v1/heartbeat` returns, read from disk at request time:
  - `screens` — every real stage file in `admin/src/stages/` with its own header-comment first line as the description
  - `commands` — the npm script names from `package.json`
  - `axes` — ids + labels from `content/axes.json`
  - `questionCount` — from `content/questions/_index.json`
  - `build` — git SHA (existing build-info)
- **Frontend (`admin/src/stages/guide.js` + `shared/api.js`):**
  - `getHeartbeat()` API helper
  - The Screens and Commands sections render from the heartbeat (live list; hand notes kept as a lookup, new items flagged "new — not described yet", unknown screens land in a "New screens" bucket)
  - "Check for changes" becomes the full UPDATE: fetch heartbeat (+ meeting types + arcs as today), diff against the last snapshot, redraw the sections, show the changelog ("2 screens added: …, 1 command removed: …, questions 4 234 → 4 260, build moved")

## Not in this phase
- Universe and Tasks (phases 2–3)
- Live API-route list, ENV list, prose sections (parked)

## Done when
- [x] `npm test` green with the new service tests · `npm run typecheck` no new errors (65/65 · clean, 2026-07-05)
- [x] /guide screens + commands sections match the repo (dummy-file add/remove verified in the browser 2026-07-05)
- [x] Product owner has tested the scenarios below and said go ("ALL GOOD", 2026-07-05)

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **First check** — open /guide, click **Check for changes**. You should see "First check — saved a snapshot…" and the Screens + Commands lists filled in from the real code. ❌ Not OK if the lists are empty or the button errors with the app running.
2. **Nothing changed** — click it again straight away. You should see "No changes since your last check."
3. **It really watches the code** — ask me (or do it yourself) to add a dummy file `admin/src/stages/test-page.js` with a one-line `// comment` at top, then click UPDATE. You should see "Screens added: test-page.js" and the file listed under "New screens". Delete the file, click again — "Screens removed: test-page.js". ❌ Not OK if nothing is reported.
4. **Honest when the API is down** — stop the API, click UPDATE. You should see a plain "couldn't reach the API" note, not a silent nothing.

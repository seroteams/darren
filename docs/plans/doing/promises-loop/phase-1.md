# Phase 1 — Promise contract + wrap-up confirm

**Part of:** [plan.md](plan.md) · **Status:** ✅ done (green-lit)

## ✅ GREEN-LIT 2026-07-12 — Carl's green light + agent-driven live walk on his "go" (commit 47c0024b)
Carl green-lit ("i love it push green light"); the artifact check caught that his walk had hit the
mock/stale server, so on his "go" the agent drove the real flow end-to-end at localhost:3097
(1 paid run ~$0.35): Q9 fork ✓ · confirm card seeded from real typed notes ✓ · wording edit +
owner flip ✓ · "Locked in ✓". Dev-lane caveat: the PG mirror write fails for the synthetic
dev identity (known non-uuid limit, pre-existing) — field-level PG persistence proved by the
roundtrip test; skip-path covered by unit tests only.

## Built (2026-07-12)
What landed (test-first: every backend piece had a failing test before its code):
- `backend/shared/session.types.ts` — `SessionPromise` type + `Session.promises?`; `outcomeCheck` comment now points at its consumer.
- `backend/api/session-persistence.ts` — `promises` in the serialize whitelist.
- `backend/tests/sessions/test-pg-roundtrip.js` — promises survive the Postgres roundtrip (red → green against the real DB).
- `backend/api/services/sessions/sessions.service.ts` — `promises(id, body)`: validates (owner enum, non-empty action, max 10, empty list = "confirmed none"), stamps id/at, persists. 4 new tests in the mirrored test file (85/85).
- `backend/api/services/sessions/sessions.controller.ts` + `backend/api/server.ts` — `POST /api/v1/sessions/:id/promises` (origin-guarded, owner-fenced like its verdict/agenda siblings).
- `shared/api.js` — `savePromises(sessionId, promises)` client.
- `admin/src/ui/promise-confirm.ts` (+ mirrored test) — the confirm card: You/them owner toggle, editable text, remove, lock-in; soft failure ("couldn't save — retry or just finish").
- `admin/src/styles/design/promise-confirm.css` (+ barrel import) — feature CSS in its own file, 14px floor.
- `admin/src/stages/briefing.js` — on a live logged-in non-scripted run, "What to do next" becomes "Lock in what you two agreed" (the confirm card); guests/scripted/read-only keep today's list.
- `admin/src/stages/questioning.js` — final question fork: primary **"Agree next actions →"**, ghost **"Finish — skip agreeing"** (both submit the typed notes; only the confirm-card flag differs; flag reset per run; scripted lane untouched).

Offline proof: `npm test` **124/124** · `npm run typecheck` clean · baseline before work was 123/123 + clean (nothing pre-existing broke). No paid runs used.

## Goal
A finished 1:1 can end with the manager confirming "here's what we agreed, and who owns what" — and those promises are genuinely saved.

## Changes
- **Type** — `Session.promises[]` in `backend/shared/session.types.ts` (shape per plan.md "Resolved" #1), TSDoc noting the no-inference rule: manager-confirmed only.
- **Persistence** — add `promises` to the serialize whitelist in `backend/api/session-persistence.ts`; extend the PG roundtrip test (`backend/tests/sessions/test-pg-roundtrip.js`) to prove it survives.
- **API** — endpoint to save confirmed promises on the current session (slim controller → service, `/api/v1/` house style; test-first).
- **Briefing confirm card** — the briefing screen (`admin/src/stages/briefing.js` + `admin/src/ui/briefing-view.ts`) opens with a "Lock in what you two agreed" card seeded from `briefing.next_actions`: each row gets an owner toggle (You / them), editable text, remove; "Lock these in" saves via the endpoint, "skip" dismisses (nothing stored).
- **Q9 doorway** — in `admin/src/stages/questioning.js`, the final-turn submit becomes the fork from the mock: primary **"Agree next actions →"** (normal submit → synthesis → briefing lands on the confirm card) and ghost **"Finish"** (same flow, confirm card starts collapsed/skipped). Cosmetic relabel — the pipeline is unchanged.

## Not in this phase
- No resurfacing, no card zero, no outcome taps (phase 2).
- No engine/prompt changes at all (phase 3).
- No freeform "add a brand-new promise" (parked).

## Done when
- [ ] `npm test` + `npm run typecheck` green; new tests mirror the house layout.
- [ ] Verify the DESTINATION: after confirming promises in the UI, the run's stored state (DB row / session-state.json) actually contains `promises[]` with owners — checked by reading the stored record, not the network tab.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **The fork** — run a 1:1 to the last question. You should see the primary button say "Agree next actions →" with a quiet "Finish" beside it. ❌ Not OK if the primary is still "Submit answer" on the final turn.
2. **Confirm the promises** — take the primary path. After synthesis, the briefing should open on a "Lock in what you two agreed" card listing what the engine heard, each row with a You/them owner toggle and editable text. Fix one row's wording, flip one owner, lock them in. You should get a clear "saved" state.
3. **It really saved** — reopen that run from Past 1:1s. The promises you confirmed (with your edits and owners) should show on the read-only briefing. ❌ Not OK if what you see differs from what you edited.
4. **The skip path** — run another 1:1, choose "Finish" instead. The briefing should read exactly as it does today, no confirm pressure, and no promises stored on the run.

# Phase 1 — Carry-forward on prep ("Since last time" flows into the new 1:1)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ DONE — walked + green-lit by Carl 2026-07-06 ("A done"), committed · **Cost:** $0 (no engine or prompt change)

## Goal
Starting a 1:1 with a person you've met before seeds the intake notes with a visible, editable
"Since last time" block — their last briefing's agreed actions and watch-fors — so it flows into
the run as ordinary manager notes you approved.

## Changes (as built)
- New `admin/src/ui/carry-forward.ts` — `buildCarryForward(briefing)` turns the last 1:1's
  `next_actions` + `watch_for` into a plain, labelled, editable notes block ("Since last time
  (edit or clear this before you run):"), or "" when there's nothing to carry. Mirrored test
  `carry-forward.test.ts` (6 cases, TDD, written first).
- `admin/src/stages/person-detail.ts` — the **"Prep your next 1:1 with X"** button now seeds that
  carry-forward into the intake notes (both `freeNotes` and `notes`, clearing stale issue pills),
  reusing the briefing the page **already fetches** for its "Since last time" panel. No new fetch.
- Attached deliberately to the explicit **"Prep your next 1:1"** action (a clear "continue last
  time" intent), not to every New-1:1 person-pick — so nothing is injected the manager didn't ask
  to continue. This path is already fenced by org **and** manager (`/runs/mine`), so the
  same-manager-only rule holds for free with no new backend service.

## Not in this phase
- No prompt or engine change — the seeded text rides the existing notes path.
- No outcome taps (Phase 2), no dedicated engine input (Phase 3), no admin console (Phase 5).
- No seeding from the **New 1:1 → roster picker** path (moved to Parked in PLAN.md — it's a less
  explicit "continue" intent and needs a mid-intake fetch; revisit if the walk wants it).
- No dedicated backend continuity read service — unnecessary here because the person page already
  holds the fenced briefing. Phase 3 introduces the engine-side prior-context input.

## Done when
- [x] Known person → intake arrives pre-filled with last time's agreed actions + watch-fors, editable.
- [x] No prior finished 1:1 (or empty briefing) → nothing seeded, no scaffolding text.
- [x] Another manager's person can never seed your intake (fence test).
- [x] `npm test` + both typechecks green; baseline noted in PLAN.md before work starts.
- [x] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light. All free.
1. **The return visit** — pick a person who has a finished 1:1 (e.g. from your Team page) and start
   a new one. The notes box should open with a "Since last time" block listing what was agreed and
   what to watch, in plain words. ❌ Not OK if it's hidden, uneditable, or in engine-speak.
2. **Edit it** — change a line, delete a line, then continue to the prep. What you kept is what the
   run uses (check the prep brief mentions your edited version, not the deleted line).
3. **Clear it** — delete the whole block and run. The 1:1 behaves exactly like today's cold start.
4. **First-timer** — start a 1:1 with a brand-new person. Notes box is empty as always.
   ❌ Not OK if any placeholder or "no previous session" scaffolding appears.
5. **Not your person** — log in as a different manager (or the QA account) and start a 1:1 with a
   same-named person. Nothing from the other manager's history appears.

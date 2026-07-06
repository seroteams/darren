# Phase 1 — Carry-forward on prep ("Since last time" flows into the new 1:1)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜ · **Cost:** $0 (no engine or prompt change)

## Goal
Starting a 1:1 with a person you've met before seeds the intake notes with a visible, editable
"Since last time" block — their last briefing's agreed actions and watch-fors — so it flows into
the run as ordinary manager notes you approved.

## Changes
- A small continuity read service (backend): given the caller + personId, return the last
  **finished** run's `next_actions` + `watch_for` (+ run date/type). Same org + same manager only.
  Built on the existing person stamp (people-roster) and run history.
- Intake + "Prep your next 1:1": when the picked person has a prior finished 1:1, pre-fill a
  plainly-labelled "Since last time (edit or clear this)" block at the top of the notes box.
- Nothing hidden: what's in the box is the whole carry-forward. Clearing it = clean slate.
- Tests first (house rule): service fencing + seed/no-seed cases.

## Not in this phase
- No prompt or engine change — the seeded text rides the existing notes path.
- No outcome taps (Phase 2), no dedicated engine input (Phase 3), no admin console (Phase 5).

## Done when
- [ ] Known person → intake arrives pre-filled with last time's agreed actions + watch-fors, editable.
- [ ] No prior finished 1:1 (or empty briefing) → nothing seeded, no scaffolding text.
- [ ] Another manager's person can never seed your intake (fence test).
- [ ] `npm test` + both typechecks green; baseline noted in PLAN.md before work starts.
- [ ] Product owner has tested the scenarios below and said go.

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

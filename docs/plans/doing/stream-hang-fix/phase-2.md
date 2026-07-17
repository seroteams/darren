# Phase 2 — The server always tells every waiting screen what happened

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Nobody waiting on a brief is ever left un-told. Every screen ends with either the brief or an honest error — never silence.

## Why this follows Phase 1 closely
Phase 1's Retry uses the "attach" path — which is the very path that's broken. The watchdog degrades a hang into error+Retry; Phase 2 makes sure that Retry lands somewhere sound.

## Changes
- `backend/api/handlers/stream-helper.ts`
  - **Terminal guarantee:** in a `finally`, any waiting screen that was never told anything gets an error. No silent exits.
  - **Per-screen isolation** (84-86): tell each screen inside its own try/catch, so one dead screen can't starve everyone behind it. *(This is a confirmed real trigger — today one throwing socket escapes the catch, throws again on the same socket, and every later screen gets nothing.)*
  - **`abortStage(session, stageKey, reason)`** — a helper that notifies waiting screens *before* dropping the work.
  - **Log the subscriber count** at send time. Without it, a recurrence is as unprovable as this one was.
- `backend/api/services/sessions/session-streams.ts` (47-52) — the regenerate path currently deletes the work and aborts **without telling anyone waiting**. Becomes a one-line call to `abortStage`.

## Not in this phase
- Auto-reconnect (parked — the `?regenerate=1` replay trap would cause looping **paid** runs).
- The render-crash case — Phase 3.

## Done when
- [ ] Tests (all free, no OpenAI — `produce` is injected): attach-mid-flight gets the result; a throwing screen can't starve the next (**red today**); every subscriber ends with result or error; `abortStage` notifies before dropping (**red today** — this is the guaranteed-hang bug).
- [ ] Seen on the real screen: the two-tab scenario below, screenshotted.
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for Carl
**Costs £0** — the stall switch replaces the AI call.

1. **Two tabs, "Suggest different topics" — nobody gets stranded.**
   Put `SERO_STALL_STAGE=focus-points` in `.env`, restart. In **Tab A**, start a 1:1 and reach Focus areas, hit **"Suggest different topics"** — it will hang on purpose. Open **Tab B** on the same 1:1 — it will also hang. Now in **Tab A**, hit **"Suggest different topics"** again.
   You should see: **Tab B shows the error card straight away.**
   ❌ Not OK if: Tab B keeps spinning. *(That's exactly what happens today — this is the bug.)*

2. **Normal focus areas still work.**
   Remove the switch, restart, run a fresh 1:1 to Focus areas.
   You should see: your topics arrive normally, and "Suggest different topics" gives you a fresh set.
   ❌ Not OK if: anything errors or hangs.

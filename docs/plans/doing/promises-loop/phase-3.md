# Phase 3 — Q1 feed, review feed + closed-loop surfacing

**Part of:** [plan.md](plan.md) · **Status:** 🟡 SPLIT — safe half (read-only surfacing) ✅ GREEN-LIT 2026-07-18 (Carl walked the seeded Priya data via `scripts/seed-promises.ts`). Engine feed (turn-1 planner + reviewer) NOT started — was lane-blocked, now unblocked.

## Split note (2026-07-18)
The engine-feed half (turn-1 planner injection + reviewer context/next_actions roll-forward)
touches `session-streams.ts` and `reviewer.ts`, which were held by another live chat's lane when
this started — so it was deferred on Carl's "build safe" call. **Built here (the read-only surfacing):**
- `backend/engine/run-history.ts` — new `promiseHistoryOf()` projects a run's confirmed promises +
  their check-in outcomes into the member view (`memberRunView`); mirrored in the PG store
  (`runs-store.ts toMemberView`) for parity.
- `admin/src/ui/briefing-view.ts` — `renderPromiseList()` + a "Promises & follow-through" card,
  outcomes as house `.chip`s (mint/gold/coral/plain + status dot). Wired into run-detail Recap.
- `frontend/src/stages/person-detail.ts` — "Since last time" now shows the last run's promises with
  their follow-through chip (legacy runs without promises keep the plain agreed list).
- Tests: `run-history.test.ts` (+3), `briefing-view.test.ts` (new, +5). Typecheck clean, `npm test` 156/156.
- ⚠️ **Not visually screenshot-verified** — the Browser pane hung this session; needs Carl's on-screen walk.

**Engine feed — progress (2026-07-18):**
- ✅ **Scorer-trust fix** (was item #2 in the sweep, folded in here): the live briefing now hears
  degraded scoring like the CLI does (`scoringFromTranscript` → reviewer's low-confidence guard).
- ✅ **Reviewer feed** — `formatPromiseCheckin` + `<promise_checkin_rule>` + `{{PROMISE_CHECKIN}}`
  in final-evaluation.md; `session.priorCheckin` threaded through `evaluate()` on live + CLI. The
  briefing now acknowledges follow-through and rolls every unfinished promise into `next_actions`
  (rule-enforced — scenario 5's review half). Unit-tested, typecheck clean, replay 7/7 ($0).
- ⬜ **Turn-1 planner nudge** — inject the check-in into the first planner turn so a not-done promise
  can shape an early question (scenario 1). NON-deterministic; needs a paid run to observe. NOT built.
- ⬜ **Honesty-gate run-log flag** (if turn-1 ignores a not-done promise, flag not rewrite). NOT built.
- ✅ **Paid proof (reviewer feed)** — one evaluation call (2026-07-18, ~few pence) with a check-in of
  {workload=NO, Q3 goals=PARTLY, deck=YES}. Result: both the NOT-done and PARTLY items appeared in
  `next_actions` ("Revisit … workload before the next sprint"; "close the loop on the partly done Q3
  goals document"), and a summary_bullet acknowledged "the follow-through picture is unfinished: two of
  three prior items were not done." The all-done item was not pushed as its own action. Behaviour confirmed.
- ⬜ **Turn-1 planner nudge** + honesty flag — still to build (needs its own paid, non-deterministic proof).

## Goal
The check-in isn't a dead tap: an unfinished promise can shape the session's first question, the end-of-session review acknowledges the follow-through, and the person page shows the loop closing over time.

## Changes
- **Engine feed (turn 1)** — inject the check-in into turn-1 planning: a tiny block (2–4 lines, e.g. `Prior promise check-in: "revisit workload" (report-owned) — partly done.`) into the planner context, alongside the existing agenda/focus-history inputs. Keep it under the cost radar (plan-turn cache regression — plan.md "Resolved" #5). All-yes check-ins inject nothing.
- **Engine feed (the review)** — the same tiny check-in block goes into the reviewer's evaluation context (`backend/engine/reviewer.ts`), so the briefing can acknowledge follow-through, and **unfinished promises (no / partly / changed) surface again in the suggested `next_actions`** — they roll forward into the wrap-up confirm card instead of dying quietly. The manager still confirms at capture (no-inference safe: suggestion, not stored fact).
- **Honesty gate, not a rewrite** — if the model's turn-1 question ignores a not-done promise, we do NOT hardcode a rewritten question. Surface what the model produced; add a detector-style flag in the run log (house rule: detect and flag, never mask).
- **Person page** — `frontend/src/stages/person-detail.ts` "Since last time": promises render with their outcome chips (done / partly / not done / changed) instead of a plain list — the manager sees follow-through history at a glance.
- **Read-only briefing** — past runs show promises + outcomes (small addition to `admin/src/ui/briefing-view.ts`).

## Not in this phase
- No rolled-over-3× counting or routing (parked).
- No new prompts elsewhere in the pipeline — turn 1 only.

## Done when
- [ ] `npm test` + `npm run typecheck` green; prompt change covered by the free replay path first (`node scripts/replay-scenario.js <id> --fixtures-only`).
- [ ] ONE paid single-case run (~$0.35 — state before running) proving a "no"-tapped promise is reflected in question 1's text. More paid runs need Carl's yes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **The payoff** — check in with a promise tapped "No", start the questions. Question 1 (or an early question) should visibly connect to that promise — its topic, not necessarily its wording. ❌ Not OK if the session reads as if the check-in never happened.
2. **All-clear stays clean** — check in with everything "Yes". Questions should open normally, with no forced promise talk.
3. **Follow-through at a glance** — open the person's page. "Since last time" should show each promise with its outcome chip. ❌ Not OK if outcomes are missing or wrong-person.
4. **History honest** — open the older run's briefing: promises + outcomes match what you tapped, nothing rewritten.
5. **The roll-over** — check in with a promise tapped "No", finish the whole 1:1, take "Agree next actions". The confirm card should offer that unfinished promise again (rolled forward), and the briefing should acknowledge the follow-through picture. ❌ Not OK if a not-done promise vanishes from the review as if it never existed.

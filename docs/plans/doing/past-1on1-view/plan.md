# Improve the "Past 1:1" manager view

**Goal:** When a manager re-opens a past 1:1, they instantly see who it was with and when, can read the briefing, and can switch to the raw questions-and-answers behind it.
**Driver:** Carl
**Created:** 2026-07-12

## Done means
- A person-profile header: initials avatar + name (display size) + role · seniority + meeting-type badge.
- A rich "when it happened" row: date completed + how long ago + questions-answered count.
- Inner nav with **3 tabs** — Overview / Briefing / Answers.
- The **Answers** tab shows the real questions and how they were answered (empty state when a run has none).

## Resolved before we start
- **One shared file** renders this view: `admin/src/stages/run-detail.ts`. The customer app imports it directly (`frontend/src/main.js:38`), so the redesign lands in **both** apps at once — intended, no second copy.
- The member endpoint `GET /api/v1/runs/mine/:id` already returns `ctx`, `briefing`, `completedAt`, `lastSeenAt`, `rating` — but **not** the transcript.
- The transcript **is** stored and is already projected on the admin compare route as `turns[]` (`compareRun` `run-history.ts:566`, `pgCompareRun` `runs-store.ts:545`). Phase 1 mirrors that projection onto the member route, minus the internal `note` field.
- File and PG member views are held byte-identical by the parity test `backend/tests/runs/test-pg-runs-parity.js:95` — both must gain `turns` identically.
- Privacy: `/runs/mine/:id` is fenced by org **and** user — it only ever returns the caller's own runs (the manager's own session data). Showing the answers back is not a new disclosure.
- Decisions locked with Carl: **3 tabs** (not 2 + fixed header); **rich when-row** (date + ago + count).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Backend: expose the answers | `turns[]` added to the member run view (file + PG), mirrored test | ✅ |
| 2 | Frontend: 3-tab redesign | `run-detail.ts` rebuilt as Overview / Briefing / Answers with profile header + when-row | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ green-lit 2026-07-12 (Carl: "a") + committed.** The member route now returns `turns[]`
(question · answer · skipped, internal note stripped); 124/124 + typecheck clean; file↔PG parity held.
**Phase 2 🔨 building now** — the 3-tab frontend redesign of `run-detail.ts`.

**Baseline (2026-07-12, free checks only — this is a projection/UI change, the paid gate is not relevant so it was not run):**
- `npm test`: **124/124 passed** (incl. `test-pg-runs-parity` — DB present, so file↔PG parity must hold).
- `npm run typecheck`: **clean**.

## Parked
- Exposing answers on the superadmin drilldown (`superadminRunView`) — not needed; that view uses a different stage. Left untouched.
- Showing duration (created → completed) in the when-row — Carl chose date + ago + count; createdAt stays out of the member projection for now.

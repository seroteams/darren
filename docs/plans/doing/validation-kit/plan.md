# Validation Kit — the build that proves managers come back

**Goal:** Everything needed to run the corridor test cleanly is built: Carl can see who came back (unprompted), testers can succeed without Carl in the room (first-run, phone-friendly, consistent copy), and every briefing captures a one-tap verdict at the moment of value.
**Driver:** Carl
**Created:** 2026-07-10

## Done means
- The to-do page shows this track as a live checklist — phases tick off as they're green-lit, nothing stale or done clutters the board.
- A return-signal view answers "which manager came back, when, unprompted?" at a glance.
- Every live briefing asks one question ("Would you run this 1:1 differently now?") and the answers are stored and visible.
- A brand-new manager account gets first-run guidance and can complete a first prep with zero help.
- The whole customer flow works comfortably on a phone, and the copy uses the same words everywhere.

## Resolved before we start
*(dependency-verified against the code, 2026-07-10 — file:line evidence in the phase files)*
- The /tasks board auto-reads `docs/plans/doing` + `done` via the heartbeat API — this folder appears on it automatically. But the heartbeat only carries phase **counts** today (`heartbeat.service.ts:14-27`), so Phase 1's backend change (per-phase rows) is **required**, not optional.
- There is **no `runs` table** — `sessions` is the run index (`schema.ts:92-142`) with `userId/createdAt/lastSeenAt/finished`, all indexed. Return-signal is read-only; and the superadmin **User-management endpoint already computes runCount/lastActive** (`superadmin.service.ts:136-173`) — Phase 2 extends it, no new page.
- The customer app cross-imports the live stages from `admin/src/stages` (`frontend/src/main.js:23-51`): editing `briefing.js`/`intake.js`/`start-core.js` changes the deployed app directly. The feedback tap goes on the **live** briefing; re-read surfaces stay out of scope.
- The existing `feedback_notes` table has **no run reference and no verdict field** (`schema.ts:321-336`) — Phase 3 needs new columns or a small new table + migration.
- A zero-run manager boots straight into **intake**, never Home (`main.js:307-318`) — Phase 4's guidance is hosted on intake, not Home.
- **Collision check:** the live thread-follow session edits only `backend/engine/*` + `content/questions/*` — no overlap with any phase. Phases 2 & 3 both touch `server.ts`/`shared/api.js`, so they run **sequentially** (and on a worktree if the tree gets busy).
- **No reminder/nudge features anywhere in this track.** The pass bar is an *unprompted* return; a nudge contaminates the metric (validation-stage rule, 2026-07-10).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | To-do page as live checklist | This track's phases visible + checkable on /tasks; done/stale swept | ✅ |
| 2 | Return-signal tracking | User management gains first-run, gap days + came-back badge per manager | ✅ |
| 3 | Briefing feedback tap | One-question tap on the live briefing, stored + viewable | ⬜ |
| 4 | New-client first-run | Guided first prep for a fresh manager account | ⬜ |
| 5 | Phone + copy pass | Customer flow comfortable on mobile; one consistent vocabulary | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phases 1 + 2 ✅ green-lit by Carl 2026-07-10** (each walked on localhost on a verified-fresh API). P1: /tasks renders every active plan as a live ⬜/🔨/✅ checklist from the heartbeat. P2: User management answers the validation question per manager — first run, gap days, "came back" badge (2nd prep ≤ 14 days), internal accounts labelled; DESTINATION-checked against a direct Neon query. All free: 111/111 tests + typecheck clean, $0. **Phase 3 (briefing feedback tap) is next** — it touches `server.ts`/`shared/api.js` and needs a new table/columns + migration (`feedback_notes` has no run link — schema.ts:321-336).
Baseline for this track = **free checks only** (`npm test` + `npm run typecheck`): no phase touches the engine or prompts, so no paid gate run is needed as baseline — don't spend one. (Two known environmental test fails in fresh worktrees: test-customer-serving, test-persona-bench.)

## Carl's own moves (not code, not mine)
- Name the 3 corridor-test managers when ready (gtm-validation-plan.md name slots).
- Flip Render to the paid tier so the app doesn't cold-start on a tester's first click (Carl said he'll do the paid one).

## Parked
- "What happened?" post-meeting follow-up question (seed of the outcome moat) — after Gate 1.
- Reminder emails / return nudges — **banned** until Gate 1 passes (contaminates the unprompted-return metric).
- Unifying the three briefing renderers — Horizon 2.
- Billing, email invites, custom domain — Horizon 2.
- Thread-follow fix — separate live track (`docs/plans/doing/thread-follow`), not part of this one.

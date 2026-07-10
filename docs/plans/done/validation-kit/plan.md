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
| 3 | Briefing feedback tap | One-question tap on the live briefing, stored + viewable | ✅ |
| 3b | Finish modal + typed inbox | Both feedback asks fold into one Finish modal; inbox rows typed by kind | ✅ |
| 4 | New-client first-run | Guided first prep for a fresh manager account | ✅ |
| 5 | Phone + copy pass | Customer flow comfortable on mobile; one consistent vocabulary | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**🎉 TRACK COMPLETE — all 6 phases ✅, closed 2026-07-11.** The corridor-test kit is fully built: Carl can see who came back unprompted (P2 return-signal), every live briefing captures a one-tap verdict (P3/P3b), a brand-new manager gets guided to a finished first prep (P4), and the whole customer flow speaks one vocabulary and fits a phone (P5). All $0 across the track. **P5 ✅ closed 2026-07-11 (Carl: "keep going if confident — good night"; sign-off delegated).** Copy sweep to one vocabulary (1:1 / prep brief / briefing / notes, see [copy-glossary.md](copy-glossary.md)): welcome, login (hype hero → calm voice), briefing empty-state (jargon → plain, exclamation marks gone), focus-points (UK spelling + "Your notes"), runs, preparation — plus two phone-fit fixes (session-menu 40px tap target; badge font-floor). 116/116, typecheck clean; every change verified live in the running bundle. ⚠️ Honest residuals left for Carl (can't be machine-done): the real-phone ~380px walk (preview pane renders at a fixed wide viewport) and the live mid-flow screens (need a paid run — copy verified in source, phone fit cleared by audit). **Folder moved to `docs/plans/done/validation-kit/`.**

**Phase 4 ✅ closed 2026-07-11 (Carl green-lit "A").** First-run guidance now lives on intake (where a zero-run manager actually lands): an orientation card on step 1 ("Here's how your first prep works" + who it's with → your notes → your briefing), an honest notes example on the notes step, and the Home empty-state upgraded to match — all gated on `listRecentRuns(1)` being empty, so a manager with ≥1 run sees none of it. New pure copy module `intake-firstrun.ts` + contract test (mirrors welcome.ts). All $0: 116/116 tests, root typecheck clean; live-verified both gate branches on the isolated pair + the per-step show/hide. **Phase 5 (phone + copy pass) is next.** Left for Carl's own walk: the subjective stranger read + the two-real-accounts comparison.

**Phases 1–3b ✅ closed 2026-07-10.** P3b (from Carl's real P3 walk): both feedback asks now fold into ONE Finish modal (stars + verdict, skippable every way), the inline cards are gone for logged-in users (guests keep theirs), and the Feedback inbox types every card (💬 Note / 📋 1:1 verdict). Agent-verified E2E pre-quota (modal → DB row → Escape writes nothing); Carl's own 3b walk overlapped the Neon quota outage, so his tap couldn't be row-verified — noted, not hidden. ⚠️ Same evening the local Neon hit its data-transfer quota mid-walk; **Carl upgraded the plan** — dev DB healthy again. **Phase 4 (new-client first-run guidance) is next.** P1 + P2 walked by Carl on a verified-fresh API. **P3 closed with Carl's walk WAIVED** (his repeated go-ahead; artifact checks showed no tap row — the verification on record is the agent's real-guest browser walk + a DESTINATION SQL check: one row per run, upsert proven, inbox rendering confirmed). P1: /tasks live checklist · P2: return-signal view (came-back badge) · P3: one-tap briefing verdict → `feedback_notes` (migration 0013), visible in the Feedback inbox with a run reference. All $0, 113/113 tests + both typechecks clean. ⚠️ Honest residual: no real manager tap exists yet — the first live prep that taps the card is the true end-to-end proof. **Phase 4 (new-client first-run guidance) is next** — hosted on intake (zero-run managers never see Home, `main.js:307-318`).
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

# STATUS — where we are

Your at-a-glance tracker. Big picture: [SERO_BOARD.md](SERO_BOARD.md). Finished work: [docs/plans/done/](docs/plans/done/).

📍 **2026-07-20 — EVERYTHING WENT LIVE.** Your "go live" pushed the whole backlog (head `3c12e884`,
two deploys): coach panel, promises step, hardening fixes, repeat-question fix, arc gates, better-reads
P1+P2, boot-splash, admin lockdown, plus a cloud chat's run-memory P1 (merged — two small overlaps
reconciled, 163/163 tests). Confirmed on sero-obwq: new bundle signature, `/health/deep` 200, `/admin`
logged-out now bounces (302). ⚠️ The hashed-token fix logged everyone out once — sign in again once.

📍 **2026-07-20 — the arcs are now evidence-backed, and approvals got lighter.** An external
evidence review of all five 1:1 types came back (4/5 well-aligned); its "ship now" list is built and
green-lit: banned-question gates on every type (no diagnosis language, no trait attacks, no promotion
promises, no week-one assessment) + the Performance tone relabelled task-directed. Same day you
switched QA to **evidence-first**: engine changes get approved from proof in chat; click-walks only
for user-facing screens, screenshots first.

📍 **2026-07-20 — the engine's scoring bias is now measured, and you approved the fix.** A deep
stage-by-stage audit found scores fall 2× as often and 3× as hard as they rise (24 down/−34 vs
11 up/+11 across 8 runs). better-reads Phase 1 (detect-only instrumentation) green-lit on that
evidence; Phase 2 (let honest up-moves survive, still capped) building now.

📍 **2026-07-19 — the meeting picker got honest.** Onboarding check-in is off the picker
(old runs still open fine), and Monthly Check-in now shows for real managers in BOTH apps —
it was built but hidden behind the internal-admin wall. **LIVE 2026-07-19** (pushed 65109d0e;
confirmed on sero-obwq — anon meeting-types dropped to 4 cards, no Onboarding).

📍 **2026-07-19 — promises got their moment.** The promises step is now its own full-screen
"lock in what you two agreed" page BEFORE the recap (two lists: you / them), guests included;
the recap and the PDF now show who promised what instead of Sero's raw suggestions. All four
phases green-lit same day (your consolidated walk). Committed locally — ships on next push.

📍 **2026-07-18 — the board is CLEAR.** Your full-system walk signed off every built pass, the
promises card zero shipped and was green-lit the same day, and on your "finish all, moving on"
every unbuilt tail was parked (nothing deleted — one sentence un-parks any of them). Everything
green-lit is pushed live — **except** the repeat-question fix green-lit later today, which is committed and ships on the next push.

## ▶ Your move
1. **Start the corridor test** — name the 3 managers on the [GTM one-pager](docs/reference/gtm-validation-plan.md), flip Render to paid. This is the whole stage — and the app is now fully live for it.
2. **Screen-gallery Phase 2** — seeds demo data so the 12 empty/needs-id screens fill in. Not started.
3. Or just start something new — nothing here is waiting on a build.

## 🔨 Building now
| Build | State |
|---|---|
| [screen-gallery](docs/plans/doing/screen-gallery/plan.md) | Phase 1 ✅ green-lit 2026-07-18 (gallery + edit-mode bar, usable now). Phase 2 (demo data) not started. |
| [promises-loop](docs/plans/doing/promises-loop/plan.md) | P1–P2 live. P3 SPLIT: surfacing half ✅ green-lit 2026-07-18 (person page + Recap show promises + outcome chips; walkable via `scripts/seed-promises.ts`). Engine feed (turn-1 + reviewer) still to build. |
| [arc-evidence-fixes](docs/plans/doing/arc-evidence-fixes/plan.md) | P1 ✅ green-lit 2026-07-20 (evidence-first): per-type banned-question gates (all 5 types) + Performance tone relabel. Committed local, ships next push. P2 (question-count trims) + P3 (reframes) parked for your call. |

## ✅ Closed 2026-07-20
[better-reads](docs/plans/done/better-reads/plan.md) — all 3 phases green-lit in one day, from your "can we improve our engine?" A three-lens audit measured the scoring bias (falls 2× as often, 3× as hard as it rises); now every held-back score is recorded (P1), short-but-real answers keep the up-score the engine already wanted to give (P2, LIVE), and repeat 1:1s open new ground instead of rewriting last time's brief — proven by feeding the engine its own prior brief (8% opener overlap, theme named as continuing; ~$0.13 paid total) (P3, committed, ships next push). Parked follow-ups in the plan: reviewer recalibration, run-health scoring block, the cost quick-wins.
[admin-lockdown](docs/plans/done/admin-lockdown/plan.md) — `/admin` is now a true internal-only console. All 3 phases green-lit: (P1) the console bundle is served only to internal admins/superadmins server-side — managers, members and logged-out visitors 302 to the normal app, closing an audit hole where the shell was handed to anyone (P1 **LIVE** on sero-obwq); (P2) internal engine tools (arcs, lexicons, library…) refuse managers on every environment, not just live; (P3) signpost sweep confirmed all emails already point at the normal app, plus a login/register eject so the admin bundle never seats a manager. P2+P3 committed local, ship next push. From a Carl bug report → full-system URL/RBAC audit.

## ✅ Closed 2026-07-19
[coach-panel](docs/plans/done/coach-panel/plan.md) — all 3 phases green-lit in one day. The questioning screen is now the full-screen 50/50 coach panel: live scores as gradient meters carrying the engine's real per-answer "why", a Support/Live-scores toggle + the manager-only hints contract, and a detect-only gate keeping performance-review language out of check-in "why" text (86 real runs, 0 false alarms). Admin app only. Two prompt lines parked behind another chat's lane (real generated hints + a P3 nudge). Local commits, ships next push.
[promises-before-recap](docs/plans/done/promises-before-recap/plan.md) — the agreement step as its own screen between the last question and the recap (You promise / {Name} promises, edit + move + lock, guests too); recap "What you agreed" grouped by owner; PDF carries the same blocks; suggestions now honestly labelled "Sero's suggestions" when nothing was locked; cross-run state leak fixed. Your green light after the consolidated walk.

## ✅ Closed 2026-07-18
[agency-engagement](docs/plans/done/agency-engagement/plan.md) (full code audit → 16/17 hardening fixes committed: live-boot DB guard, login rate-limit, session revocation + hashed tokens, cost-race fix, backups, deep health probe, more — [audit report](docs/reports/2026-07-18-agency-audit.md); one cosmetic F16 follow-up parked) · [repeat-question-fix](docs/plans/done/repeat-question-fix/plan.md) (resolved-cause gate — engine stops re-asking an answered snag in new words; from a tester flag) · [members-page](docs/plans/done/members-page/plan.md) · [team-page-redesign](docs/plans/done/team-page-redesign/plan.md) · [wrap-up-exit](docs/plans/done/wrap-up-exit/plan.md) · promises card zero (P2, in [future/promises-loop](docs/plans/future/promises-loop/plan.md) with P3 parked) — all your green lights.

✅ **Live 2026-07-20:** the hardening fixes (and everything above) deployed with the go-live push — the one-off everyone-logged-out event has happened.

## Parked (12, in docs/plans/future/ — each carries a banner saying exactly where it stopped)
Newly parked 2026-07-18: [ui-look-and-feel](docs/plans/future/ui-look-and-feel/plan.md) (P4–P6) · [admin-live-deploy](docs/plans/future/admin-live-deploy/plan.md) (P4–P6) · [personal-data-security](docs/plans/future/personal-data-security/plan.md) (P3 history-scrub — needs an all-chats-closed night). *(promises-loop un-parked 2026-07-18 — now in doing/, P3 surfacing half green-lit.)*
Earlier: [design-stage-native](docs/plans/future/design-stage-native/plan.md) · [run-qa-fixes-jul04](docs/plans/future/run-qa-fixes-jul04/plan.md) · [planner-grounding](docs/plans/future/planner-grounding/plan.md) · [briefing-readability-p0](docs/plans/future/briefing-readability-p0/plan.md) · [adaptive-early-close](docs/plans/future/adaptive-early-close/plan.md) · [code-health-refactors](docs/plans/future/code-health-refactors/plan.md) · [design-cleanups](docs/plans/future/design-cleanups/plan.md) · [questions-outcome-moat](docs/plans/future/questions-outcome-moat/plan.md) · [shared-shell-layer](docs/plans/future/shared-shell-layer/plan.md)

---
`⬜ not started` · `🔨 in progress` · `✅ done + you green-lit it` — I never sign off my own work.
Last updated: 2026-07-20 — admin-lockdown DONE (all 3 phases green-lit; P1 live, P2+P3 ship next push). (Earlier today: GO-LIVE full backlog deployed, head 3c12e884.)

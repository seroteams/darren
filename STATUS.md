# STATUS — where we are

Your at-a-glance tracker. Big picture: [SERO_BOARD.md](SERO_BOARD.md). Finished work: [docs/plans/done/](docs/plans/done/).

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
1. **Coach panel Phase 3 — Rationale arc gate** — Phases 1 + 2 green-lit. Phase 3 stops score "why" text carrying performance-review tone into check-in meetings. Partly lane-blocked (one prompt line); the gate + tests are free to build. Say go.
2. **Start the corridor test** — name the 3 managers on the [GTM one-pager](docs/reference/gtm-validation-plan.md), flip Render to paid. This is the whole stage.
3. **Screen-gallery Phase 2** — seeds demo data so the 12 empty/needs-id screens fill in. Not started.
4. Or just start something new — nothing here is waiting on a build.

## 🔨 Building now
| Build | State |
|---|---|
| [coach-panel](docs/plans/doing/coach-panel/plan.md) | Phases 1 + 2 ✅ green-lit 2026-07-19 (full-screen 50/50; live scores with the engine's real "why"; Support/Live-scores toggle + hints contract). Two Phase-2 bits parked (prompt edit behind another lane, YAML codec). Phase 3 (rationale arc gate) not started. |
| [screen-gallery](docs/plans/doing/screen-gallery/plan.md) | Phase 1 ✅ green-lit 2026-07-18 (gallery + edit-mode bar, usable now). Phase 2 (demo data) not started. |
| [promises-loop](docs/plans/doing/promises-loop/plan.md) | P1–P2 live. P3 SPLIT: surfacing half ✅ green-lit 2026-07-18 (person page + Recap show promises + outcome chips; walkable via `scripts/seed-promises.ts`). Engine feed (turn-1 + reviewer) still to build. |

## ✅ Closed 2026-07-19
[promises-before-recap](docs/plans/done/promises-before-recap/plan.md) — the agreement step as its own screen between the last question and the recap (You promise / {Name} promises, edit + move + lock, guests too); recap "What you agreed" grouped by owner; PDF carries the same blocks; suggestions now honestly labelled "Sero's suggestions" when nothing was locked; cross-run state leak fixed. Your green light after the consolidated walk.

## ✅ Closed 2026-07-18
[agency-engagement](docs/plans/done/agency-engagement/plan.md) (full code audit → 16/17 hardening fixes committed: live-boot DB guard, login rate-limit, session revocation + hashed tokens, cost-race fix, backups, deep health probe, more — [audit report](docs/reports/2026-07-18-agency-audit.md); one cosmetic F16 follow-up parked) · [repeat-question-fix](docs/plans/done/repeat-question-fix/plan.md) (resolved-cause gate — engine stops re-asking an answered snag in new words; from a tester flag) · [members-page](docs/plans/done/members-page/plan.md) · [team-page-redesign](docs/plans/done/team-page-redesign/plan.md) · [wrap-up-exit](docs/plans/done/wrap-up-exit/plan.md) · promises card zero (P2, in [future/promises-loop](docs/plans/future/promises-loop/plan.md) with P3 parked) — all your green lights.

⚠️ **Not yet live:** the hardening fixes are committed locally, NOT pushed. They deploy on the next "go live" — and the hashed-token fix logs everyone out once when it ships.

## Parked (12, in docs/plans/future/ — each carries a banner saying exactly where it stopped)
Newly parked 2026-07-18: [ui-look-and-feel](docs/plans/future/ui-look-and-feel/plan.md) (P4–P6) · [admin-live-deploy](docs/plans/future/admin-live-deploy/plan.md) (P4–P6) · [personal-data-security](docs/plans/future/personal-data-security/plan.md) (P3 history-scrub — needs an all-chats-closed night). *(promises-loop un-parked 2026-07-18 — now in doing/, P3 surfacing half green-lit.)*
Earlier: [design-stage-native](docs/plans/future/design-stage-native/plan.md) · [run-qa-fixes-jul04](docs/plans/future/run-qa-fixes-jul04/plan.md) · [planner-grounding](docs/plans/future/planner-grounding/plan.md) · [briefing-readability-p0](docs/plans/future/briefing-readability-p0/plan.md) · [adaptive-early-close](docs/plans/future/adaptive-early-close/plan.md) · [code-health-refactors](docs/plans/future/code-health-refactors/plan.md) · [design-cleanups](docs/plans/future/design-cleanups/plan.md) · [questions-outcome-moat](docs/plans/future/questions-outcome-moat/plan.md) · [shared-shell-layer](docs/plans/future/shared-shell-layer/plan.md)

---
`⬜ not started` · `🔨 in progress` · `✅ done + you green-lit it` — I never sign off my own work.
Last updated: 2026-07-19 — coach-panel Phase 2 green-lit (support-hints contract + toggle; two bits parked; committed local, ships next push).

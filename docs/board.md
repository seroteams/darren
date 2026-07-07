# docs board — plans at a glance

Every `docs/workstreams/` and archived plan folded into one card. This is the **plan/workstream
index**, not a rival status tracker — the canonical two remain [`STATUS.md`](../STATUS.md) (tactical,
per-phase) and [`SERO_BOARD.md`](../SERO_BOARD.md) (strategic). See [reference/trackers.md](reference/trackers.md).

Legend: `⬜ not started` · `🔨 built, awaiting walk` · `✅ done (green-lit)` · `🅿️ parked`

---

## Now — active workstreams

| Workstream | State |
|---|---|
| [pre-go-live](workstreams/pre-go-live/overview.md) | **The active line.** PG1–PG8 ✅ closed; **PG9** (roster tidy-up: merge + rename) 🔨 built, awaiting walk — the last open pre-go-live phase. |
| [cto-check-july](workstreams/cto-check-july/) | 🆕 Free CTO quality read: does *thin* manager input give a good brief, questions & summary? 4 steps, judged on existing run logs. ⬜ not started. *(untracked / local-only working folder)* |
| [plan-turn-runner-gates](workstreams/plan-turn-runner-gates/plan.md) | Promote mechanical prompt rules to code gates. P1 ✅ green-lit · P2/P3 🔨 built, awaiting walk. |
| [guest-run](workstreams/guest-run/plan.md) | No-account guest try-out. P1 ✅ · P2 🔨 built, awaiting walk · P3–4 ⬜. |
| [feedback-inbox](workstreams/feedback-inbox/plan.md) | Superadmin page for in-app feedback notes (own Neon table). 🔨 built, awaiting walk. |
| [manager-ready](workstreams/manager-ready/plan.md) | Manager rail + design polish (Bricolage, 4px, one date format). P1 ✅ · P2 🔨 built, awaiting walk. |
| [frontend-admin-split](workstreams/frontend-admin-split/plan.md) | Split the customer app out from admin. P1 ✅ · P2 🔨 built, awaiting walk · P3–4 ⬜. |
| [page-heartbeat](workstreams/page-heartbeat/plan.md) | Real "Update" buttons that re-read the repo. P1 ✅ · P3 🔨 built · P2 ⬜. |
| [hide-ai-words](workstreams/hide-ai-words/plan.md) | Manager can hide AI role-words (reversible), never in real 1:1s. P1 ✅ · P2 🔨 built, awaiting walk. |
| [user-management](workstreams/user-management/plan.md) | Superadmin user table. P1–2 ✅ · P3 🔨 (deactivate/reactivate) · P0, P4–5 ⬜. |
| [run-qa-fixes-jul04](workstreams/run-qa-fixes-jul04/plan.md) | Fix four engine defects. P1 ✅ (committed) · P2–4 ⬜ (prompt changes — need paid runs). |

## Next — queued (after Now is green)

| Item | Scope |
|---|---|
| SSO auth (Google/Microsoft) | Don't roll our own passwords — revisit near release (Darren coaching). |
| Guest save-at-end + Guest-runs screen | guest-run phases 3–4. |

## Parked — deliberately on hold

| Plan | Why |
|---|---|
| [planner-grounding](archive/plans/planner-grounding/plan.md) | Diagnosis + scope locked; awaiting a test-strategy pick. |
| [briefing-readability-p0](archive/plans/briefing-readability-p0/phase-1.md) | Scaffolded, parked. |
| [design-cleanups](archive/plans/design-cleanups/plan.md) | Blocked on parallel tracks (admin-registered, universe). |
| questions-outcome-moat | 🅿️ Outcome-capture "moat" — parked until real alpha usage (local-only working folder). |

## Cut — removed, stays cut

| What | When |
|---|---|
| Continuity / "moat" track (carry-forward pre-fill + outcome taps + 8-phase plan) | Ripped out 2026-07-06 (Carl: "rip it all out"); people-roster refactor kept. |
| see-before-sent (standalone) | Folded into sent-preview, 2026-07-04. |
| Phase 2 — hosting | Parked (009); picks up when a shareable URL is wanted. |
| Phase 8 — continuity | Deferred/folded, then removed with the moat track. |

## Done — closed, archived

All in [archive/done/](archive/done/) (33 workstreams). Recent closes:
people-roster · member-invites · start-screen · design-system · error-log · live-data-cleanup ·
mobile-responsive · test-engine-hub · no-inference-ruling · roles-admin-manager-member · cleanup-audit.
Earlier: the Prototype→Production line (monorepo-reorg → security), auth-front-door, postgres-foundation,
backend-api-v1, login-screen, people-roster and the engine/runner tracks. Full list:
[archive/done/](archive/done/).

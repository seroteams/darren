# STATUS — where we are right now

**The live tactical tracker: only what's in-flight or awaiting your walk.**
One place, always current — you never have to ask. Big-picture map → [SERO_BOARD.md](SERO_BOARD.md).
Closed tracks live in [docs/plans/done/](docs/plans/done/); parked ideas in [docs/plans/future/](docs/plans/future/).
Not sure which file is which? [docs/reference/trackers.md](docs/reference/trackers.md).

**Stage: VALIDATION.** Pass bar is behavioural — 2 of 3 corridor managers prep a 2nd 1:1 **unprompted** within ~2 weeks. No nudge features until that gate passes.

---

## ▶ Your move

> **🔴 The one thing only you can do — start the corridor test.**
> The whole validation kit is built and live. To actually run the experiment: **name the 3 corridor managers** ([gtm-validation-plan.md](docs/reference/gtm-validation-plan.md) has the blank table) **and flip Render to the paid tier.** Until then the Gate-1 metric can't move.

> **🆕 [ux-audit-fixes](docs/plans/doing/ux-audit-fixes/plan.md) — folder created 2026-07-15, awaiting your read-through before Phase 1.**
> The full UX audit (22 findings + 4-agency panel) became a 5-phase fix plan across two interview rounds — all recommendations accepted. Phases: 1 return path · 2 right doors/right roles · 3 one language · 4 history compounds + return metrics · 5 craft batch. Feature-shaped ideas parked until Gate 1.
> **Read the 5 phase files, then green-light ("looks good, start phase 1").**

---

## 🔨 In flight — the 4 live tracks

Each is a real Darren-Method track, one phase at a time, your green light before the next. (manager-workspace-prototype closed 2026-07-15 — both phases green-lit, moved to `done/`.)

| Track | Where it's at | Next |
|---|---|---|
| **[monthly-checkin](docs/plans/doing/monthly-one-on-one/plan.md)** *(the main line)* | **P1 ✅ green-lit 2026-07-13** — internal-only card + the 7-stage guided runner + auto-save/reload-resume, live on `work/monthly-checkin` (131/131, $0). | **P2: real per-person promises/requests/goals + the right-hand side panels** ($0). Say "go". |
| **[promises-loop](docs/plans/doing/promises-loop/plan.md)** | **P1 ✅ green-lit 2026-07-12** — wrap-up confirm card + Q9 "Agree next actions →", promises stored (`47c0024b`). | **P2: card zero** — resurface last time's promises with yes/partly/no/changed taps. P3 ⬜. |
| **[admin-live-deploy](docs/plans/doing/admin-live-deploy/plan.md)** | **P1 ✅ green-lit 2026-07-12** (live fence). **P2 + P3 built on branch, awaiting your walk** (admin served at `/admin`; Pulse dashboard). | Walk P2+P3 on the live site. P4–P6 ⬜. |
| **[ux-audit-fixes](docs/plans/doing/ux-audit-fixes/plan.md)** | 🆕 folder created 2026-07-15. Phases scoped, not started. | See ▶ Your move above — read + green-light. |

---

## 🅿️ Parked / backlog (NOT in-flight)

Scaffolded ideas waiting for a scope pick or Gate 1. Nothing below is being worked.

| Plan | State |
|---|---|
| [design-stage-native](docs/plans/future/design-stage-native/plan.md) | Parked 2026-07-12 — **P1 built but never QA-walked; not archive-safe.** Un-park to finish. |
| [run-qa-fixes-jul04](docs/plans/future/run-qa-fixes-jul04/plan.md) | P1 ✅ done 2026-07-04; P2–4 parked (each needs a ~$0.35 paid walk). |
| [planner-grounding](docs/plans/future/planner-grounding/plan.md) | Scope A likely shipped by **thread-follow** (closed 2026-07-11) — re-scope to B/C before starting. |
| [briefing-readability-p0](docs/plans/future/briefing-readability-p0/plan.md) | Scaffolded, parked. |
| [design-cleanups](docs/plans/future/design-cleanups/plan.md) | Investigation done; build waits on the hot files going quiet. |
| [questions-outcome-moat](docs/plans/future/questions-outcome-moat/plan.md) | Parked until alpha produces real signals (Gate 1). |
| [shared-shell-layer](docs/plans/future/shared-shell-layer/plan.md) | Proposal; overlaps the board's `shared-folder-split` code-health track. |

**Code-health tracks** (from the 2026-07-09 CTO audit — run one at a time *after* testers are on live): `shared-folder-split`, `admin-typescript`, `split-giant-files`. Detail in [SERO_BOARD.md](SERO_BOARD.md) §2.

**Pending, yours to run:** the `darren` → `serolocal` folder rename ([docs/rename-serolocal-handover.md](docs/rename-serolocal-handover.md)) — prep committed, needs a manual run with all sessions closed.

---

## How to read
`⬜ not started` · `🔨 in progress` · `✅ done (tested + green-lit)`. A pass isn't ✅ until its QA is walked and you green-light it — I never self-certify. Closed tracks move to [docs/plans/done/](docs/plans/done/).

- Last updated: **2026-07-15** — **manager-workspace-prototype closed** (both phases green-lit, moved `doing→done/`): a `/test` "Manager Loop" walkable concept (5 connected manager screens) plus a red/amber "no-data" feasibility overlay. In-flight now 4 tracks.

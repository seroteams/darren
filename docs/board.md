# 📋 The board — kanban of every plan

One glance = where everything is. Cards move left→right as work lands:
**🅿️ Parked → ⬜ Queued → 🔨 Building (me) → 🚶 Your move → ✅ Done.**

This is the **plan index**, not a rival status file. For detail: [`STATUS.md`](../STATUS.md)
(what's happening right now) · [`SERO_BOARD.md`](../SERO_BOARD.md) (the strategic map).

---

## 🚶 YOUR MOVE — waiting on you (walk or decide)

*The important lane. Each of these is built + checked on my side; it just needs your walk or a call.*

| Track | Your move |
|---|---|
| [pre-go-live](workstreams/pre-go-live/overview.md) | Walk **PG9** (Team → Tidy up: merge + rename) — or say **"close pg9"**. It's the *last* open phase; green light archives the whole track. |
| [render-deploy](workstreams/render-deploy/plan.md) | Walk **P1** — open `localhost:3001/api/v1/health` → `{"ok":true}`. You need this for tonight's Render setup. |
| [postgres-runtime-data](workstreams/postgres-runtime-data/plan.md) | Walk **P2** — run a real 1:1; looks identical, I show you the rows in Neon. (P1 ✅) |
| [manager-ready](workstreams/manager-ready/plan.md) | Walk **P2** — open any page, do the headings feel like your Figma? (P1 ✅) |
| [guest-run](workstreams/guest-run/plan.md) | Walk **P2** — browse as a guest (4 scenarios). (P1 ✅) |
| [feedback-inbox](workstreams/feedback-inbox/plan.md) | Walk **P1** — send a note → see it in the inbox. |
| [frontend-admin-split](workstreams/frontend-admin-split/plan.md) | Walk **P2** — customer app on :3002, no internal tools. (P1 ✅) |
| [plan-turn-runner-gates](workstreams/plan-turn-runner-gates/plan.md) | Walk **P2 + P3** — free (`npm test` + fixtures replay). (P1 ✅) |
| [hide-ai-words](workstreams/hide-ai-words/plan.md) | Walk **P2** — the hide / restore UI. (P1 ✅) |
| [page-heartbeat](workstreams/page-heartbeat/plan.md) | Walk **P3** — Tasks-board "Update from docs". (P1 ✅, P2 still ⬜) |
| [engine-improvements](workstreams/engine-improvements/plan.md) | **Decide** the stonewall policy → [01-stonewall-exit.md](workstreams/engine-improvements/01-stonewall-exit.md) (my rec: 3 strikes → offer reschedule → close). |
| [run-qa-fixes-jul04](workstreams/run-qa-fixes-jul04/plan.md) | **Give the go** on P2–4 (prompt fixes — each needs a paid run). P1 ✅ committed. |

## 🔨 BUILDING — mine, in progress

| Track | State |
|---|---|
| [user-management](workstreams/user-management/plan.md) | **P3** deactivate / reactivate a user. P1–2 ✅ · P0, P4–5 ⬜. |

## ⬜ QUEUED — next, after the "Now" lane is green

| Item | Scope |
|---|---|
| SSO auth (Google/Microsoft) | Don't roll our own passwords — revisit near release (Darren coaching). |
| Guest save-at-end + Guest-runs screen | guest-run phases 3–4. |
| postgres P3–P7 | Read cutover → questions → small stores → import ~250 runs → retire files. |
| render-deploy P2–P4 | Blueprint → go live → /commit + /release skills. |

## 🅿️ PARKED — deliberately on hold

| Plan | Why |
|---|---|
| [planner-grounding](archive/plans/planner-grounding/plan.md) | Diagnosis + scope locked; awaiting a test-strategy pick. |
| [briefing-readability-p0](archive/plans/briefing-readability-p0/phase-1.md) | Scaffolded, parked. |
| [design-cleanups](archive/plans/design-cleanups/plan.md) | Blocked on parallel tracks (admin-registered, universe). |
| [questions-outcome-moat](archive/plans/questions-outcome-moat/PLAN.md) | Outcome-capture "moat" — parked until real alpha usage. |

## ✅ DONE — closed + archived

All 33 in [archive/done/](archive/done/). Recent: people-roster · member-invites · start-screen ·
design-system · error-log · live-data-cleanup · mobile-responsive · test-engine-hub ·
no-inference-ruling · roles-admin-manager-member · cleanup-audit · cto-check-july.

## ✂️ CUT — removed, stays cut

| What | When |
|---|---|
| Continuity / "moat" track (carry-forward pre-fill + outcome taps + 8-phase plan) | Ripped out 2026-07-06 ("rip it all out"); people-roster refactor kept. |
| see-before-sent (standalone) | Folded into sent-preview, 2026-07-04. |
| Phase 2 — hosting (009) | Superseded by the render-deploy track. |

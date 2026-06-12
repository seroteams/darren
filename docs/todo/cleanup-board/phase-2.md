# Phase 2 — SERO_BOARD.md (single source of truth)

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 built, awaiting owner QA. Note: engine-trust-gates rows reflect tonight's reality (Phases 1–3 committed + validated by the green 19:08 gate; 4–6 remaining), and gate status is recorded as "code green, later run errored on credit" per the Phase 1 diagnosis.

## Goal
One board file at repo root that holds every open item exactly once, in five sections: Now / Next / Parked / Cut / Done.

## Changes
- New file `SERO_BOARD.md` at repo root with:
  - **Now** — fix the red gate (cheapest re-check: `gate --only <case>` ≈ $0.35 when credit allows); engine-trust-gates Phases 1–2 QA walkthrough (Carl) then Phases 3–6; role-profiles Phases 2–4 QA walkthrough (Carl); jun11-demo-fixes Phase 4 (back navigation).
  - **Next** — next-stage build order (Phase 4's spec); verdicts-june-07 (3 phases).
  - **Parked** — person-profiles feature; inbox-review-june-10; executive dashboards; benchmarking; relationship visualisations; sentiment trend graphs.
  - **Cut** — product persona work (beyond role-profiles); historical analytics → replaced by **session continuity** (session-level history only, no dashboards/trends/HR analytics); generic coaching toolbox.
  - **Done** — root PLAN.md's rows, jun11-demo-fixes 1–3, role-profiles Phase 1, log-fix-audit (93/100, 0 open), pointers to docs/todo/done + plans/done.
  - **Trust boundary rules** — what `evals/trust-checks.js` already enforces, plus: private manager notes never reach shared/email/admin surfaces when those exist.
  - **Engine quality checklist** — gate / smoke / schema validation / fallbacks, one line each; gate status recorded honestly as **red** with the Phase 1 diagnosis.
  - The Phase 1 audit note (git state explained).

## Not in this phase
- No edits to any other file (banners are Phase 3).

## Done when
- [ ] `SERO_BOARD.md` exists with all sections above.
- [ ] Product owner has tested the scenarios below and said go.
- [ ] Green light → docs-only commit: `git add SERO_BOARD.md docs/todo/cleanup-board/`

## Test scenarios — for the product owner
1. **Once and only once** — think of any open item you remember from any plan file. Search the board for it. It appears exactly once, in the column you'd expect. ❌ Not OK if missing or duplicated.
2. **Scope creep gone** — search the board for "person-profiles", "dashboard", "benchmark", "trend". Hits only in Parked/Cut (role-profiles in Now is expected and fine).
3. **Session continuity scoped** — the board says session-level history only; no dashboards, trends, or HR analytics anywhere in active scope.
4. **Now matches the decision** — the Now column is finishing in-flight work; no new build appears in Now.

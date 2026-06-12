# Cleanup + Single Board + Next-Stage Spec

**Goal:** One board file (`SERO_BOARD.md`) holds everything — Now / Next / Parked / Cut / Done — every other plan points at it, and a next-stage spec is ready to hand to a coding session.
**Driver:** Carl
**Created:** 2026-06-12

## Done means
- Nothing in `git status` is mysterious — every changed file is mapped to its workstream.
- Every open item from every plan file appears on the board exactly once.
- No active task mentions product person-profiles/persona pages (role-profiles stays active — it's role context, not a persona feature).
- "Historical data" is renamed to **session continuity** with a tight scope: session-level history only, no dashboards/trends/HR analytics.
- A short next-stage implementation spec exists, ready to paste into a fresh coding session.

## Hard constraints (all phases)
- **$0 API tonight.** No gate / smoke / eval / pipeline runs (~$4 OpenAI credit left; a $2.80 gate run already errored tonight).
- **Never touch the engine/questions working-tree churn** — it's the active engine-trust-gates session's in-flight work. Docs-only commits, explicit-path `git add` only (never `-A` / `.`).
- Never bulk-delete untracked files in `questions/`. Don't pop the two old stashes. No push/PR.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Git audit + gate diagnosis | Written audit note: every change-group → workstream; gate-error root cause (read-only, commits nothing) | ✅ |
| 2 | SERO_BOARD.md | The single board: Now / Next / Parked / Cut / Done + trust rules + engine checklist | 🔨 |
| 3 | Repoint old plans | One-line banners on PLAN.md, plans/AUDIT-FEATURES-log-fix-audit, parked markers on person-profiles + inbox-review | ⬜ |
| 4 | Next-stage spec | `docs/todo/next-stage/PLAN.md` — 8 build phases corrected against what exists | ⬜ |
| 5 | Close out | Done-when walkthrough, folder moved to done/ | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 1 ✅ (Carl green-lit 2026-06-12 — "go"; audit in [audit-note.md](audit-note.md): tree clean, gate failure = API credit exhaustion, code gate green at 19:08). Phase 2 built: `SERO_BOARD.md` created at repo root with Now / Next / Parked / Cut / Done, trust rules, engine checklist, repo+gate state. Engine-trust-gates rows updated to reality (Phases 1–3 committed, 4–6 remaining). Awaiting Carl's Phase 2 walkthrough; green light = docs-only commit, then Phase 3 (banners).

## Parked
- Fixing the red gate (needs API spend + belongs to engine-trust-gates) — tonight we only diagnose from logs.
- Updating `docs/todo/engine-trust-gates/PLAN.md` current-state — belongs to the active session working that track.

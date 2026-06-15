# Phase 3 — Intake wiring + live runs

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 built — awaiting owner QA

## Goal
The profile is created/loaded automatically the moment setup details are entered — CLI and web — and a full live run reads role-grounded.

## Changes
- `cli.js`: kick off `ensureRoleProfile` right after seniority is typed (runs while you pick meeting type / type notes); await with fallback before focus points; print dim status `role profile: generated|cached|unavailable (<key>)`.
- `frontend/server/handlers/start.js`: chain `ensureRoleProfile(ctx)` into the existing focus-points pre-warm.

## Not in this phase
- No gates / smoke scenario / eval rules (Phase 4).

## Done when
- [ ] A fresh CLI run with a new title generates the profile once (`00b-role-profile/` logged) and all 5 stage prompts carry it.
- [ ] A second run, same role + seniority, different name → status says `cached`, zero role-profile cost in `cost.json`.
- [ ] One web run confirms the pre-warm works the same way.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **First run** — start a CLI run for a made-up person with a distinctive title (e.g. "Head of Payroll Compliance", Senior, Growth). During setup you should see `role profile: generated (...)`. The prep brief and the questions should clearly fit that job — its vocabulary, its typical pressures. ❌ Not OK if the brief could be about any office worker.
2. **Second run, different person, same job** — run again with a different name, same title + seniority. You should see `role profile: cached (...)` and no extra AI cost for the profile in that run's `cost.json`.
3. **Web run** — do one full run in the browser app with the same title. Same role-grounded feel; check the run's log folder shows the block in each stage's `prompt.md`.
4. **Cost sanity** — compare the run's `cost.json` to a recent pre-feature run; the per-turn planner growth should be small (a few hundred tokens per turn at most).

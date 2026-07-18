# Phase 4 — Drill-ins: manager → team + runs, run → answers + feedback

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
From Pulse, Carl clicks a manager and sees their team and every run with its type; clicks a run and sees the answers the manager typed plus the feedback left on that run — like the walked mock.

## Changes
- Reuse the existing superadmin endpoints: `GET /admin/users/:id/runs` (their runs — `ctx.meetingType` + `rating` already there) and `GET /admin/runs/:id` (run detail — briefing + rating already there). Extend where thin, all in `superadmin.service.ts`/`repo` (+ mirrored tests):
  - runs list: include UNFINISHED runs too (today it's finished-only) with their stopped-at stage, and join each run's `feedback_notes.verdict` for the verdict chip.
  - run detail: add the manager's typed ANSWERS (extracted from the session `state` jsonb / `run_artifacts`) and the run's feedback note/verdict.
- Team view: the manager's people from the `people` table (name, role, per-person run count) — new superadmin read.
- `admin/src/stages/`: manager-detail and run-detail views for Pulse (or extend `admin-user-detail.ts` if it fits) with the mock's layout: team table, runs table (type chips), Q&A list, feedback card.
- Feedback items on Pulse deep-link to their run.

## Not in this phase
- Editing anything — all read-only.
- Guest run drill-in beyond what `/admin/runs/:id` already shows.

## Done when
- [ ] Service tests cover: runs list carries type/rating/verdict; run detail carries answers + feedback; fenced to superadmin.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Manager drill-in** — on Pulse, tap a manager. You see their team (people + roles) and all their runs, each with a type chip. ❌ Not OK if runs show without types.
2. **Run drill-in** — tap a run. You read the manager's actual answers and the feedback (stars/verdict/note) on that run. ❌ Not OK if answers are missing on a finished run.
3. **Feedback deep-link** — on Pulse, tap a feedback note. You land on that exact run's detail.
4. **A stopped run** — open an unfinished run: it says where it stopped and shows whatever answers exist, no error.

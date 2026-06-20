# Phase 002 — Conventions & Skills

## Goal (plain)
Write down our "house rules" so the AI builds everything our way every time, and install the skills
that keep quality high. From this phase on, **all code is TypeScript** and **all work is test-first
(red → green)**. Carl shouldn't have to explain the structure — the AI reads it from the skills.

## What you'll have when it's done
- A **`backend-conventions`** skill and a **`frontend-conventions`** skill (file naming, inheritance,
  TypeScript with tight contracts, RESTful API rules, error handling, folder layout).
- The **Test-Driven Development skill installed** and made law:
  [obra/superpowers/test-driven-development](https://www.skills.sh/obra/superpowers/test-driven-development) —
  every change is **red (failing test) → green (make it pass) → refactor**.
- **Security skills installed** (chosen from skills.sh) ready for the later phases.
- **TypeScript tooling** set up: strict `tsconfig`, build, and lint.
- The **test layout convention**: never one flat folder — unit tests sit beside their code; integration/e2e
  live in a `tests/` tree that mirrors the system's domains.
- `CLAUDE.md` updated so the AI auto-reads the right skill for the right kind of work.

## The conventions we're locking in (the core rules)
- **Language:** TypeScript everywhere, `strict` on, explicit types/interfaces — **no loose `any`** (tight contracts).
- **File names:** kebab-case with a role suffix — `sessions.controller.ts`, `sessions.service.ts`,
  `sessions.repo.ts`, `sessions.types.ts`; tests `sessions.service.test.ts`.
- **Inheritance:** contracts first — define an **interface** per service/repo; classes *implement* the
  interface. Prefer **composition**; allow only a thin shared base where it truly earns its place. No deep class trees.
- **Tests:** co-located unit tests (`*.test.ts` beside the source) + a mirrored `tests/` tree for
  integration/e2e (e.g. `tests/integration/sessions/…`). **Never a single flat dump.**
- **TDD rhythm:** write the failing test first, then the smallest code to pass it, then refactor.

## A grounding example (before → after)
- **Before:** Carl says "add an endpoint to delete a run" and the AI guesses where files go and skips tests.
- **After:** the AI writes `runs.service.test.ts` (red) → `runs.service.ts` (green) → a slim
  `runs.controller.ts`, all named and placed per the convention. Same request, every time.

## The steps (to be detailed when this phase starts)
1. Review popular convention/TDD/security skills on skills.sh; decide borrow vs. write-our-own.
2. Install the TDD skill and the chosen security skills; confirm they load.
3. Write `backend-conventions` and `frontend-conventions`.
4. Set up TypeScript tooling, the test runner, and the mirrored test directory layout.
5. Wire `CLAUDE.md` to reference each skill for the matching work.

## How we'll know it's done (full list in `99-qa-signoff.md`)
- Both convention skills + the TDD skill + security skills load without error.
- A tiny sample change follows red → green and lands in correctly-named files in the right places.
- `CLAUDE.md` links resolve to the new skills.

> **Status:** overview only. Detailed step files get written when we start this phase.

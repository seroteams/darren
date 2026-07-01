# Phase 6 — Finish repo-tidy

**Part of:** [PLAN.md](PLAN.md) · **Track:** B (repo-ready) · **Status:** ⬜

## Goal
The code reads cleanly to a newcomer — finish the started tidy so no oversized files or scattered
duplicates remain.

## Changes
- Complete [repo-tidy](../../repo-tidy/PLAN.md) Phase 3 (split `sessions.controller` into thin controller +
  service) and Phase 4 (admin TypeScript pilot — prove the toolchain on 2–3 stages).
- Clear the parked items that matter for cleanliness: naming normalisation as touched, and make `npm test`
  hermetic (stop it dirtying `content/questions/` on every run).

## Not in this phase
- Converting *all* admin stages to TS — Phase 4 only pilots it; the full sweep stays its own plan.
- Retiring legacy `/api/*` route aliases (parked until the customer app drops them).

## Done when
- [ ] `sessions.controller` is a thin controller over a service; `npm test` green, app behaviour unchanged.
- [ ] The admin TS pilot compiles and runs; the repeatable path is written down.
- [ ] `npm test` no longer leaves the working tree dirty.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Still works** — Run one full 1:1 end to end after the changes. It behaves exactly as before. ❌ Not OK if anything changed for the user.
2. **Clean after tests** — I run `npm test`, then show you `git status`. It should be clean (no stray changed files). ❌ Not OK if questions files show as modified.
3. **Reads clean** — Open the two files we split. Each is focused and readable, not a 1000-line pile. ❌ Not OK if it's still one giant file.

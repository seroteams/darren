# Phase 7: Re-audit + close

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal

Prove the audit is green: re-run the audit lens over every screen, tick or park every acceptance box, publish the numbers, and reset the baseline.

## Changes

- Re-audit: fresh page-by-page pass with the same method as audits/design-audit-2026-07 (verdict per screen; target 0 CUSTOM outside declared exemptions), written to audits/design-audit-2026-07/reaudit.md.
- acceptance.md: every box ticked or moved to "Parked by Carl" with his reason.
- CSS trend report: line counts vs the 9,600 baseline; namespaces deleted vs remaining.
- Fresh gallery export committed as the new baseline; stragglers fixed or logged as follow-ups.
- Plan folder moved to docs/plans/done/ via the phase-close ritual; design-cleanups (future/) marked absorbed.

## Not in this phase

New scope. Anything found here that isn't an audit item becomes a future plan, not a Phase 7 fix.

## Done when

- [ ] reaudit.md shows 0 CUSTOM outside exemptions
- [ ] acceptance.md fully resolved (ticked or parked)
- [ ] CSS trend published; new baseline committed; all free checks green

## Test scenarios — for the product owner

1. **The walk** — 15 minutes: open Home, Team, a full 1:1 run, member home, and two admin tables. Everything should feel like one product you already know how to use. ❌ Not OK if any screen still feels like a stranger.
2. **The scoreboard** — open reaudit.md. The verdict table should be green (Standard/Hybrid only, no Custom outside the exempt list). ❌ Not OK if any live screen is still Custom.

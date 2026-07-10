# Phase 3 — Positive validation checks

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Add positive assertions to the briefing gate — not just banned-phrase detection — mirroring old Sero's "names the person / cites real data" scoring. Surfaces a weak briefing; never masks it.

## Changes
- [golden-checks.ts](../../../../backend/engine/golden-checks.ts): add `runManagerBriefingGroundingChecks(briefing, ctx)` returning a `failures[]` array (same shape as `runManagerBriefingBans`) — e.g. briefing references the person's first name; at least one axis read cites a real signal rather than `no_history`.
- **Conservative:** starts as a warn-level report, promoted to a hard gate only once it's quiet against existing fixtures.

## Not in this phase
- Making it a blocking gate in the live pipeline (warn-level first; promotion is Parked in plan.md).
- Any numeric 0–100 score (old Sero's rubric) — pass/fail failures[] only, matching the house pattern.

## Design note (propose before coding)
Before writing code I'll list the exact checks + thresholds in this file for Carl to eyeball — this phase has the real judgment (which signals count, what counts as a false fail).

## Done when
- [ ] Exact checks agreed with Carl (listed here) before implementation.
- [ ] A grounded fixture briefing passes; a name-less / data-less one produces failures (unit test).
- [ ] Runs quiet (no failures) against existing golden fixtures — no false alarms.
- [ ] `npm test` green, `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Catches a weak briefing** — I run `npm test`; a fixture briefing with no person's name and all `no_history` axes produces the expected failures. ❌ Not OK if it passes silently.
2. **Passes a good briefing** — a grounded fixture (names the person, cites a real score) produces zero failures. ❌ Not OK if a good briefing gets flagged.
3. **No false alarms on real fixtures** — the check runs clean against the existing golden fixtures. ❌ Not OK if it lights up on briefings we already accept.

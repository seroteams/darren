# Phase 7: Re-audit + close

## ✅ GREEN-LIT 2026-07-25

Carl: "a" (ship as-is) "and then double check and tidy up and push live and tidy up git also".
Both open calls parked under his name (flow widths kept; Prepare variant-lab CSS kept, fenced).
Free suite re-run green at close; shipped to main same day; plan folder moved to done/.

## Built (2026-07-24)

Awaiting Carl's final walk. The re-audit ran page by page with the original method
([reaudit.md](../../../../audits/design-audit-2026-07/reaudit.md)): the app moved from
12 Standard / 19 Hybrid / 14 Custom to **35 Standard / 9 Hybrid / 1 Custom**, and the one
Custom left (Screen gallery) is a declared DESIGN.md exemption. The re-audit's eight stragglers
were triaged the same day; the six that were audit items got fixed (Guest runs on um-table +
toolbar, `.stage-inner` fully retired, the four page-scoped style blocks moved to real CSS,
review-run shortcut legend + Answers count badge confirmed/added, auth labels sentence-cased).
All 43 acceptance boxes ticked. CSS: 9,874 baseline lines -> 9,680, now with ZERO inline style
blocks (several hundred lines used to hide in JS) and the whole shared kit added; nine parallel
namespaces deleted. Fresh gallery baseline: 42/45, 0 failed (3 = the exporter's known
customer-app skips). Checks: 184/184, typecheck, lint:tokens, lint:copy.
Open for Carl at the walk: (a) unify the run flow's two widths or keep them; (b) delete or keep
the ~600-line Prepare variant-lab CSS (the standing P4 fork).

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting QA

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

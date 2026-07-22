# Design consolidation

**Goal:** Every finding in the 2026-07 design audit resolved. The app stops fighting known SaaS patterns: one page width per page type, one header, one table, one auth shell, one flow spine, a labelled sidebar. Subtraction, not redesign.
**Driver:** Carl, 2026-07-22: "I want that report to become the acceptance criteria for how we move forward... at the very end everything you've raised in that report is green."
**Created:** 2026-07-22
**Mockup:** https://claude.ai/code/artifact/668a90b6-cff1-4fea-8e68-b8238f78a2ee (built 2026-07-22, awaiting Carl's approval)

Audit = acceptance criteria: [audits/design-audit-2026-07/](../../../../audits/design-audit-2026-07/README.md), tracked item-by-item in [acceptance.md](acceptance.md).
Committee session: logs/committee/2026-07-22-design-consolidation.html (local only).
Supersedes the parked `docs/plans/future/design-cleanups/` plan (its scoped duplications are folded into acceptance.md).

## Done means

- Every acceptance.md box ticked or explicitly parked by Carl.
- 0 CUSTOM-verdict screens outside declared exemptions (design sheet, universe, dev chrome, gallery toolbar).
- Free checks green (test, typecheck, lint, lint:tokens, lint:copy); fresh gallery export as the new baseline.
- CSS trend visibly down from the ~9,600-line baseline (per-screen namespaces deleted as screens migrate).

## Resolved before we start

- Rename darren → SeroEngine: standalone job inside Phase 0, needs Carl's confirm (seroengine was the retired original name).
- Go-live cadence: one green-lit phase at a time; push/merge to main = deploy; rollback = revert one commit. Never a big-bang.
- First visible slice: manager lists (Phase 1).
- No paid runs anywhere in this plan. Verification = free checks + gallery re-export + Carl's QA walk.

## Phases

| # | Phase | What it lands | Status |
|---|-------|---------------|--------|
| 0 | Foundations | Rename decision, before-baseline export, acceptance.md, mockup approved, shared kit (list toolbar, header contract, breadcrumb rollout) | 🔨 |
| 1 | Manager lists | Team, Members, Home, Past 1:1s on the shared table + toolbar, avatars, accent actions, medium width | ⬜ |
| 2 | Auth + member | Shared auth shell on Register/Join, Join identity hero, member home recomposition, Welcome fixes | ⬜ |
| 3 | Flow spine A | Stepper visible Setup→Recap, one wizard footer, one interstitial | ⬜ |
| 4 | Flow spine B | Interview calm-down, instant briefing, one Prepare layout (11 fenced to admin lab) | ⬜ |
| 5 | Shell | Pinned labelled sidebar, fixed account entry, help entry, nav links, breadcrumb sweep, Guided rebased on app shell | ⬜ |
| 6 | Admin sweep | um-table rollout to internal + superadmin lists, Pulse time-range, error grouping, kill parallel button systems | ⬜ |
| 7 | Re-audit + close | acceptance.md all green, CSS trend report, new baseline, move to done/ | ⬜ |

## Current state

Phase 0 in progress (2026-07-22): plan folder + acceptance list created, committee logged, baseline export running. Awaiting Carl: mockup approval + rename confirm.

## Parked

- Dark mode (explicitly out of scope).
- Pixel-diff automation on top of the gallery export (manual eyeball-diff is the rail for now; automate only if misses happen).

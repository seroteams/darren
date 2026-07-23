# Detail: superadmin screens (9 pages)

Full agent findings, 2026-07-22. Evidence cited as file:line.

## Verdicts

| Page | Verdict | Closest pattern | Biggest familiarity break |
|---|---|---|---|
| ADMIN_PULSE (/pulse) | HYBRID (closest to standard) | Stripe Dashboard home / Mixpanel | No time-range selector; three different hardcoded windows across tiles (admin-pulse.ts:157,171,181); KPI tiles lack the standard delta chip; one mint-gradient hero tile breaks the grid; private `.lp-table` duplicates `.um-table` at different size; sparkline has no labels/tooltip; filler "Guests & errors" card |
| ADMIN_GATE1 (/admin/gate1) | HYBRID | Mixpanel metric drill-down | Inert rows (no click, no sort, no search); double Back button top+bottom; bespoke circled "‹ Back" control instead of the breadcrumb the sibling user-detail page already uses |
| ADMIN_RUNS (/admin/runs) | HYBRID | Stripe Payments list | No toolbar at all (no search, no filter tabs, no pagination) though rows are already tagged guest/internal/external; rows do not open the run even though a read-only briefing view exists and is used by two sibling pages |
| ADMIN_RATINGS (/admin/ratings) | HYBRID | Intercom ratings / Canny | No star-distribution histogram; single star glyph + digit reads ambiguously; no filter by score; long notes crammed into a 26rem cell |
| ADMIN_REGISTERED (/admin/registered) | CUSTOM | Stripe Customers / Auth0 users | No search on a user-management screen (the sharpest deviation in the batch); bespoke company-cards-inside-one-table structure; three-line prose paragraphs per activity cell; native window.confirm/alert for destructive actions; ratings summary that belongs on /pulse |
| ADMIN_USER (/admin/users/:id) | CUSTOM | Stripe customer page | No identity/metadata header (drilling in loses information); both sections are anonymous card stacks with dot-joined prose instead of columns; run opens via in-place innerHTML swap with no URL change; people cards not clickable |
| ADMIN_ERROR_LOG (/admin/errors) | HYBRID (most pattern-literate) | Sentry Issues | No grouping/dedup (one row per occurrence, so a repeating bug floods the table); no severity levels or search; "Status" header collides with resolved/unresolved concept; window.alert on failure |
| ADMIN_FEEDBACK (/admin/feedback) | HYBRID | Intercom inbox / Canny | Inbox with no inbox mechanics: no read/done state, no filter by kind, only permanent delete; everything fully expanded (twenty notes = a wall); runId pill shown as inert truncated UUID instead of a link |
| ADMIN_GUEST_RUNS (/admin/guests) | CUSTOM | Retool sessions list | Table data flattened into anonymous prose buttons; no sort/filter; in-place page swap; three navigation systems on one small screen; different page shell from sibling drill-downs |

## Cross-screen consistency

Not one layout language; fragments of three:
- Three list grammars: `.um-table` (5 screens), private `.lp-table` (Pulse), borderless prose-button stacks (user detail, guest runs). The same object, "a run", is a table row on /admin/runs and an anonymous card button on /admin/guests.
- Two navigation grammars contradicting DESIGN.md's Breadcrumb Rule: bespoke circled "‹ Back" doubled top-and-bottom on six screens (pulse-drilldowns.css:13-43) vs the shared breadcrumb on user detail.
- Two page shells: `l-container l-container--wide` vs `stage-inner`, so gutters shift between sibling pages.
- Consistent and worth protecting: token discipline, the pill colour vocabulary, the identical error/empty/loading card recipe, the reconciliation habit tying drill-down numbers to Pulse tiles.

## Highest-leverage batch fixes

1. One standard table component (toolbar with search + filter tabs + sortable headers + clickable rows, `.um-table` skin) for all seven list screens.
2. One navigation rule enforced: breadcrumb everywhere, circled Back deleted.
3. Pulse: one global time-range control; normalised KPI tile anatomy (label, value, delta chip, caption).
4. Registered: search + role/status filter; flatten company cards to a Company column; shared confirm dialog for destructive actions.

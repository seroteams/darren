# Detail: navigation shell, IA, consistency, journeys

Full agent findings, 2026-07-22. Evidence cited as file:line.

## 1. Navigation shell vs standard SaaS

The model in both apps is a hover-expanding icon rail, not a labelled sidebar: 60px collapsed strip expanding to 248px on hover, overlaying content rather than pushing it (admin/src/styles/design/app-nav.css:3-5, tokens.css:372-373). Labels are hidden until hover (app-nav.css:125-133); hover-expand is pointer-only, so tablets never see labels outside the drawer. A new manager sees ~8 unlabelled glyphs. This is the single biggest "unfamiliar" driver.

Good: role-filtered rails from one component; proper `aria-current` active state; admin grouping (Work / Engine / Build / Operate).

Missing or non-standard:
- No global search anywhere; no command palette. Only per-page filters (Library, Role words, Gallery).
- No topbar in normal browsing; the profile entry migrates (rail-bottom Log out vs floating top-right avatar chip) and menu contents differ per role.
- No help entry: the Guide lost its rail row and is URL-only.
- No active nav state during the seven-screen core flow (ACTIVE_BY_STAGE empty for FOCUS→BRIEFING, app-nav.js:286-287).
- Same label, two meanings: "Start 1:1" is a dashboard for admins and a form for managers (app-nav.js:70-71,85-86).
- Nav rows are `<button>`s, not links: no middle-click/new-tab despite every page having a URL.
- Member rail is one item inside full rail chrome.

## 2. Page-header consistency

A shared `.page-header` primitive exists (primitives.css:33-57) but does not define the title element or action slot strictly. 37 files use it; the title fragments into `h1` variants plus six rival systems (question-stem, auth-brand__title, rv2-stem, mcr-h1, briefing-headline, text-display). Bank and Eval have no header at all (orb only, no person name, no step context on-page). Intake runs a rotating chat-style h1. Action placement varies across four patterns. Roughly two-thirds of screens share the skeleton; the run flow, auth, guided and briefing each invent their own, so the journey a manager walks changes header grammar four times.

## 3. Layout primitives adoption

- Five content widths across sibling screens: `.l-container` (blessed, 8 newest admin-ops files only), deprecated `.stage-inner` 38rem (18 files including every customer screen that matters), `.stage-medium` (9), `.stage-wide` (3), `.stage-reading` (1), bespoke `.stage-questioning` 52rem.
- Bespoke CSS dwarfs the shared system: ~9,600 lines of stage/app CSS vs ~170 lines of shared layout/primitives/cards. Single screens carry 1,000-line private stylesheets (preparation.css 1,004; design-stage.css 1,002; guided.css 836).
- 25+ private class namespaces in stage markup (ds- 191, mcr- 129, pv- 115, lp- 79, cmp- 68, rv2- 64, um- 56, arc- 52...). Each is a micro design system.

## 4. The three journeys

Manager: landing is good (first-run intro card). But adding a person is not on the path (Home never points at Team; intake absorbs it as a side effect). Two parallel run lists (Home accordion vs Past 1:1s) with different row anatomy. Orientation is strong from FOCUS onward (session topbar "n of 7") but absent on INTAKE, absent in the rail, and absent on the BANK/EVAL orb screens. Browser back is live and re-mounts stages (back from /briefing re-opens the evaluation stream, eval.js:19-21) while the UI tells a one-way story. "Finish & review this 1:1" lands on the person page or Home, not a review. Revisit (Past 1:1s → run detail with adaptive breadcrumb) is the best-behaved leg.

Member: Join is clean and self-orienting. The journey's last step does not exist: home renders static `<li>` entries with no click targets (member-home.js:120-133) while the router declares RUN_DETAIL member-reachable. The member gets a landing page where nothing is pressable and a one-item nav rail.

Admin: rail groups are the clearest IA in the product. REVIEW_RUN hardcodes Back to Library regardless of origin (review-run.js:125): the canonical Breadcrumb Rule violation on the admin's most-used deep screen. Pulse drill-downs double the back control top and bottom. Compare kept its route, lost its nav row, and lights the "Test engine" row when open.

## 5. Top 5 systemic causes of "mockups look better"

1. No single content container; the de facto default is the deprecated 38rem reading measure, so dashboard-shaped pages render as one skinny column adrift in whitespace, and sibling screens change width as you navigate.
2. The shell hides its own labels and overlays content: a discovery tax on every visit; the rail "moves" over the page, which reads as jank next to a static mockup.
3. Header grammar changes mid-journey: seven-plus title systems, some screens with none.
4. 25+ per-stage micro design systems: spacing rhythm is per-author (16px stacks on some pages, 32px on others) on top of viewport-relative padding.
5. Orientation chrome is conditional: topbar only in-run, breadcrumbs on ~5 screens vs hardcoded back buttons elsewhere, active nav absent in the flow, profile entry migrates, no search, no help. A mockup shows the complete standard shell in every frame.

**One-line synthesis:** the app is not fighting standard patterns by philosophy; it is fighting them by accretion. The fix is consolidation onto primitives that already exist (breadcrumb.ts, page-header, l-container, um-table, session-topbar), not new design.

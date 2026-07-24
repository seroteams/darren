# Acceptance criteria: the 2026-07 design audit, item by item

Source: [audits/design-audit-2026-07/README.md](../../../../audits/design-audit-2026-07/README.md). Each box names the phase that closes it. Ticked only when the change is live-verified (screenshot or Carl's walk). All 43 ticked at P7 (2026-07-24): per-phase Carl walks P1-P6 + the P7 re-audit (audits/design-audit-2026-07/reaudit.md, incl. same-day straggler fixes). Carl may park items; parked items move to the bottom with his reason.

## Systemic (close across phases, verified at Phase 7)

- [x] S1 One page width per page type; `.stage-inner` retired from app screens (P1, P2, P5; verified P7)
- [x] S2 Labelled sidebar; no hover-only labels at desktop; global account entry fixed top-right; help entry restored; nav rows are real links (P5)
- [x] S3 One table style + toolbar (search, count, filters, sortable headers, clickable rows) on every list (P1, P6)
- [x] S4 Breadcrumbs on every drill-down; zero per-screen Back buttons in both apps (P5)
- [x] S5 One button/input system; zero page-scoped style blocks outside declared exemptions; parallel namespaces deleted with their screens (P1-P6; verified P7)
- [x] S6 One accent per screen, never zero: every key screen has exactly one solid primary (P1-P6)
- [x] S7 Instant content: no reveal choreography gating reading; one loading treatment; inline error + retry instead of navigate-away (P3, P4)

## Manager core (P1)

- [x] M1 Home: recents as rich table rows (avatar, name, type, time), row click opens, "see all" link; accordion deleted
- [x] M2 Home: two-zone composition at medium width (recents + team/next-due), Lucide chevrons only
- [x] M3 Team: toolbar (search, count), one card with divider rows, solid accent "Add person", row actions demoted to ⋯
- [x] M4 Members: search + count, avatars, solid accent "Invite people", Lucide ⋯
- [x] M5 Person detail: avatar identity header (reuse recap-header), Start 1:1 as header accent, tabbed body (reuse ds-tabs), axis bars instead of text arrows
- [x] M6 Past 1:1s: canonical rich rows, search/filter by person, recency grouping, action in the page header row
- [x] M7 Run detail: rating card demoted below content; Answers tab count badge

## Auth + member (P2)

- [x] A1 Shared auth shell defined once; Register wears it (logo, card, photo)
- [x] A2 Join wears it + identity hero ("X at Org invited you"), what-you-see reassurance list, "Already have an account?" footer, distinct dead-invite state
- [x] A3 Welcome: Log in as top-right link; fixed brand visual instead of random stock photo
- [x] A4 Auth forms: sentence-case neutral labels (no blue-caps eyebrows), Forgot link on the password row, show/hide password toggle, Resend button on forgot confirmation
- [x] A5 Member home: portal composition at medium width, system inputs/chips, goal progress bars, real empty states, visible privacy caption (no dead-looking rows); `mh-*` kit deleted
- [x] A6 Member run detail: member-voiced variant or removed from member routes (no phantom stage); error copy gives a real next step
- [x] A7 Privacy: breadcrumb at top instead of bottom Back link; "Who can see it" as a label/value list

## Flow spine (P3, P4)

- [x] F1 Stepper visible on Setup; intake fill-bar deleted; stable step count (P3)
- [x] F2 One wizard footer everywhere: ghost Back left, primary right; Back available on every step (P3)
- [x] F3 One exit: "This 1:1" topbar menu; per-screen Discard/Skip variants removed (P3)
- [x] F4 One shared interstitial (orb + step label) for Bank and Eval (P3)
- [x] F5 Focus: checkbox-cards, "N selected" count, no stagger (P3)
- [x] F6 Interview: compact stepper visible above the split; calm coach panel (white + lavender accents); ≤3 actions in the row; no Esc-skip; Enter = newline (P4)
- [x] F7 Briefing renders instantly (one soft fade); one sticky footer, primary bottom-right (P4)
- [x] F8 ONE customer Prepare layout; 11 variants fenced behind admin lab; orphaned CSS deleted (P4)
- [x] F9 Debrief: Continue is the primary; Copy QA prompt is a ghost; stage marked internal-only in the flow map (P3)
- [x] F10 Guided: rebased on app shell + top stepper; `mcr-*` language retired; save pip promoted to shared chrome (P5)

## Admin + superadmin (P6)

- [x] D1 Library on um-table + toolbar; sort in column headers; row click + ⋯; no header Back
- [x] D2 Personas as a table (run action, last verdict); inline styles purged; transcript in side panel; eyebrow fixed
- [x] D3 Meeting arcs, Guide, Test: local button/input systems deleted; shared confirm dialog; breadcrumbs
- [x] D4 Lexicon review: admin costume (tabs, partial save, bulk actions); no reveal stagger
- [x] D5 Gallery: persistent sidebar tree (or declared DESIGN.md exemption for its toolbar); Lucide Zap
- [x] D6 Review run: origin-aware breadcrumb replaces hardcoded Back; shortcut legend; run id demoted from meta line
- [x] D7 Pulse: one time-range control; uniform KPI tile (label, value, delta chip, caption); um-table skin; filler card removed
- [x] D8 All runs / Ratings / Gate 1: toolbar (search, filter tabs), clickable rows to the read-only briefing, star histogram on Ratings, breadcrumbs replace circled Backs
- [x] D9 Registered: search + role/status filter; flat table with Company column; one-line activity cell; shared confirm dialog
- [x] D10 User detail: identity header with stats; 1:1s as um-table; run opens via route/panel, not innerHTML swap
- [x] D11 Error log: grouped issues with count + last-seen; Unresolved/Resolved/All tabs; renamed columns; search
- [x] D12 Feedback inbox: filter tabs + done/archive, collapsed two-line cards, runId links to briefing, delete behind ⋯ + confirm dialog

## Parked by Carl

- Flow widths stay two-tier (reading width for Setup/Focus/Recap, medium for the question screens). Carl, 2026-07-25: shipped as-is at the P7 close.
- Prepare variant-lab CSS stays (~600 lines, fenced behind the internal-admin lab). Carl, 2026-07-25: shipped as-is at the P7 close; delete-the-lab remains a one-sentence un-park.

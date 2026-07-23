# Acceptance criteria: the 2026-07 design audit, item by item

Source: [audits/design-audit-2026-07/README.md](../../../../audits/design-audit-2026-07/README.md). Each box names the phase that closes it. Ticked only when the change is live-verified (screenshot or Carl's walk). Carl may park items; parked items move to the bottom with his reason.

## Systemic (close across phases, verified at Phase 7)

- [ ] S1 One page width per page type; `.stage-inner` retired from app screens (P1, P2, P5; verified P7)
- [ ] S2 Labelled sidebar; no hover-only labels at desktop; global account entry fixed top-right; help entry restored; nav rows are real links (P5)
- [ ] S3 One table style + toolbar (search, count, filters, sortable headers, clickable rows) on every list (P1, P6)
- [ ] S4 Breadcrumbs on every drill-down; zero per-screen Back buttons in both apps (P5)
- [ ] S5 One button/input system; zero page-scoped style blocks outside declared exemptions; parallel namespaces deleted with their screens (P1-P6; verified P7)
- [ ] S6 One accent per screen, never zero: every key screen has exactly one solid primary (P1-P6)
- [ ] S7 Instant content: no reveal choreography gating reading; one loading treatment; inline error + retry instead of navigate-away (P3, P4)

## Manager core (P1)

- [ ] M1 Home: recents as rich table rows (avatar, name, type, time), row click opens, "see all" link; accordion deleted
- [ ] M2 Home: two-zone composition at medium width (recents + team/next-due), Lucide chevrons only
- [ ] M3 Team: toolbar (search, count), one card with divider rows, solid accent "Add person", row actions demoted to ⋯
- [ ] M4 Members: search + count, avatars, solid accent "Invite people", Lucide ⋯
- [ ] M5 Person detail: avatar identity header (reuse recap-header), Start 1:1 as header accent, tabbed body (reuse ds-tabs), axis bars instead of text arrows
- [ ] M6 Past 1:1s: canonical rich rows, search/filter by person, recency grouping, action in the page header row
- [ ] M7 Run detail: rating card demoted below content; Answers tab count badge

## Auth + member (P2)

- [ ] A1 Shared auth shell defined once; Register wears it (logo, card, photo)
- [ ] A2 Join wears it + identity hero ("X at Org invited you"), what-you-see reassurance list, "Already have an account?" footer, distinct dead-invite state
- [ ] A3 Welcome: Log in as top-right link; fixed brand visual instead of random stock photo
- [ ] A4 Auth forms: sentence-case neutral labels (no blue-caps eyebrows), Forgot link on the password row, show/hide password toggle, Resend button on forgot confirmation
- [ ] A5 Member home: portal composition at medium width, system inputs/chips, goal progress bars, real empty states, visible privacy caption (no dead-looking rows); `mh-*` kit deleted
- [ ] A6 Member run detail: member-voiced variant or removed from member routes (no phantom stage); error copy gives a real next step
- [ ] A7 Privacy: breadcrumb at top instead of bottom Back link; "Who can see it" as a label/value list

## Flow spine (P3, P4)

- [ ] F1 Stepper visible on Setup; intake fill-bar deleted; stable step count (P3)
- [ ] F2 One wizard footer everywhere: ghost Back left, primary right; Back available on every step (P3)
- [ ] F3 One exit: "This 1:1" topbar menu; per-screen Discard/Skip variants removed (P3)
- [ ] F4 One shared interstitial (orb + step label) for Bank and Eval (P3)
- [ ] F5 Focus: checkbox-cards, "N selected" count, no stagger (P3)
- [ ] F6 Interview: compact stepper visible above the split; calm coach panel (white + lavender accents); ≤3 actions in the row; no Esc-skip; Enter = newline (P4)
- [ ] F7 Briefing renders instantly (one soft fade); one sticky footer, primary bottom-right (P4)
- [ ] F8 ONE customer Prepare layout; 11 variants fenced behind admin lab; orphaned CSS deleted (P4)
- [ ] F9 Debrief: Continue is the primary; Copy QA prompt is a ghost; stage marked internal-only in the flow map (P3)
- [ ] F10 Guided: rebased on app shell + top stepper; `mcr-*` language retired; save pip promoted to shared chrome (P5)

## Admin + superadmin (P6)

- [ ] D1 Library on um-table + toolbar; sort in column headers; row click + ⋯; no header Back
- [ ] D2 Personas as a table (run action, last verdict); inline styles purged; transcript in side panel; eyebrow fixed
- [ ] D3 Meeting arcs, Guide, Test: local button/input systems deleted; shared confirm dialog; breadcrumbs
- [ ] D4 Lexicon review: admin costume (tabs, partial save, bulk actions); no reveal stagger
- [ ] D5 Gallery: persistent sidebar tree (or declared DESIGN.md exemption for its toolbar); Lucide Zap
- [ ] D6 Review run: origin-aware breadcrumb replaces hardcoded Back; shortcut legend; run id demoted from meta line
- [ ] D7 Pulse: one time-range control; uniform KPI tile (label, value, delta chip, caption); um-table skin; filler card removed
- [ ] D8 All runs / Ratings / Gate 1: toolbar (search, filter tabs), clickable rows to the read-only briefing, star histogram on Ratings, breadcrumbs replace circled Backs
- [ ] D9 Registered: search + role/status filter; flat table with Company column; one-line activity cell; shared confirm dialog
- [ ] D10 User detail: identity header with stats; 1:1s as um-table; run opens via route/panel, not innerHTML swap
- [ ] D11 Error log: grouped issues with count + last-seen; Unresolved/Resolved/All tabs; renamed columns; search
- [ ] D12 Feedback inbox: filter tabs + done/archive, collapsed two-line cards, runId links to briefing, delete behind ⋯ + confirm dialog

## Parked by Carl

(none yet)

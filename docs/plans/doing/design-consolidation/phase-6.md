# Phase 6: Admin + superadmin sweep

## Built (2026-07-24)

Awaiting Carl's QA walk. All 12 acceptance items (D1-D12) landed, built by four parallel fenced
workstreams: Library + Personas + review-run on the um-table idiom (sortable headers, ⋯ row menus,
side-panel transcript, origin-aware breadcrumb + shortcut legend); Pulse gets ONE 7/30/90-day range
control driving every tile + chart (backend range param, test-covered; Gate 1 stays all-time by
definition, labelled), uniform KPI tiles, um-table skin, filler card gone; drill-downs get toolbars,
clickable rows to the read-only briefing, star histogram on Ratings, merged Gate 1 table; Registered
flattens to one searchable/filterable table; User detail gets an identity header + um-table (route
re-mount, no innerHTML swap); Error log groups repeats into issues with count/last-seen + tabs +
search; Feedback inbox gets tabs, two-line cards, briefing links, delete behind ⋯ + confirm. The
four parallel button systems (.arc-btn/.guide-btn/.gal__screens-btn/mh-*) are gone, every
confirm/alert routes through the shared dialog, Lexicon review wears the admin costume (tabs,
partial save, bulk actions), Gallery keeps its toolbar via a declared DESIGN.md exemption (a
sidebar would narrow the previews it exists to show). Known honest limits: feedback done/archived
state is per-browser (localStorage; API field = follow-up), lexicon with-data view code-verified
only. Verified: 184/184 + 46/46 backend service tests, typecheck, both linters; screenshots of
Pulse, Error log, Library, Personas, Registered, Feedback on the real p6 dev pair.

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting QA

## Goal

Every internal and superadmin list works like a proper back-office table, and the last parallel component systems are deleted.

## Changes

- um-table + toolbar rollout: Library, Personas (as a runnable-rows table with side-panel transcript), All runs (filter tabs by kind, rows open the read-only briefing), Ratings (star histogram + score filter), Gate 1 (merged table, clickable rows), Registered (search + role/status filter, flat Company column, one-line activity cell), User detail (identity header + 1:1s table, run opens via route/panel), Guest runs (table, breadcrumb).
- Pulse: one time-range segmented control; uniform KPI tile (label, value, delta chip, caption); `.lp-table` replaced by um-table; filler card removed.
- Error log: grouped issues (message+path+env) with count and last-seen; Unresolved/Resolved/All tabs; renamed columns; search.
- Feedback inbox: filter tabs + done/archive; collapsed two-line cards; runId links to the briefing; delete behind ⋯ + shared confirm dialog.
- System-wide: the four parallel button systems (`.arc-btn`, `.guide-btn`, `.gal__screens-btn`, `mh-*` remnants) and in-file style blocks deleted; every `window.confirm`/`alert` routed through the shared confirm dialog; Gallery gets a persistent tree or a declared DESIGN.md exemption; Lexicon review gets its admin costume (tabs, partial save, bulk actions).

## Not in this phase

Anything customer-facing (done in P1-P5).

## Done when

- [ ] Every list screen shares the one table + toolbar; every destructive action uses the confirm dialog
- [ ] Zero page-scoped style blocks outside declared exemptions
- [ ] Free checks green; gallery re-export diffed; D1-D12 tickable

## Test scenarios — for the product owner

1. **Tables behave like Stripe** — open Registered. Search a name, filter by role, click a row: it opens the person. ❌ Not OK if search is missing or rows are dead.
2. **Pulse obeys one clock** — change the time range on Pulse; every tile and chart follows it. ❌ Not OK if tiles keep private windows.
3. **Errors group** — open the error log; a repeating bug is one row with a count, not a flood. ❌ Not OK if the same message fills the screen.

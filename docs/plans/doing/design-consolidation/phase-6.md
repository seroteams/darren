# Phase 6: Admin + superadmin sweep

**Part of:** [plan.md](plan.md) · **Status:** ⬜

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

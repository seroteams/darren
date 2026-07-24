# Phase 5: Shell

## Built (2026-07-24)

Awaiting Carl's QA walk. Landed: the rail is PINNED OPEN with labels + group headers at desktop
(collapse = a chevron toggle, remembered per browser; collapsed rail keeps the old hover-expand);
nav rows are real links (ctrl/cmd-click opens a tab); "Start 1:1" stays lit through the whole run;
Guide restored to the internal rail (customer help = What is Sero?, unchanged). Breadcrumb sweep:
all 7 Pulse/Operate pages swapped the circled Back (top + bottom) for a `Pulse › {page}` trail;
review-run's Back → `Library › Run review`; test area's "All tests" → a trail; Library/Guide/Compare
top-level Backs deleted (Esc still hops home). Guided check-in rebased on the paper shell: breadcrumb +
top stepper (visited steps clickable), left-aligned header, .btn primitives, shared save pip
(admin/src/ui/save-pip.ts), `mcr-*` retired, guided.css 836 → 385 lines. Bonus fix found in the
rename: the side panel's Save button was never wired (a duplicate `[data-save]` hook) — now it is.
Verified: 184/184, typecheck, lint:tokens, lint:copy; screenshots of the pinned rail, Pulse trail,
collapsed rail and both Guided steps taken on real local screens (admin :3093, customer :3002).

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting QA

## Goal

The app wears the standard SaaS shell: a labelled sidebar you never have to hover to read, one account entry, breadcrumbs everywhere, and the Guided check-in comes home to the app's design language.

## Changes

- Sidebar (`admin/src/ui/app-nav.js`, `frontend/src/ui/app-nav.js`, `app-nav.css`): pinned open with labels at desktop widths (collapse becomes a user choice); active state also during the flow; nav rows become real links; group headers visible.
- Account: fixed top-right entry for all roles (profile-badge unified); Help entry restored (Guide for admins, "What is Sero?"/help for managers).
- Breadcrumb sweep both apps: every drill-down gets the shared trail (`breadcrumb.ts`); every per-screen Back button deleted (review-run's hardcoded Library back, pulse drill-down circled backs, privacy bottom link, test's "← All tests").
- Guided (`frontend/src/stages/guided/`): rebased on the paper app shell, left-aligned page header, `.btn` primitives, top stepper instead of the bottom pill bar; `mcr-*` namespace deleted; save pip promoted to shared chrome for the whole flow.

## Not in this phase

Admin tool tables (Phase 6).

## Done when

- [ ] Labels visible without hover at desktop; one account entry everywhere
- [ ] Zero per-screen Back buttons in either app; breadcrumbs on all drill-downs
- [ ] Guided passes as the same product as the prep flow
- [ ] Free checks green; gallery re-export diffed; S2, S4, F10 tickable

## Test scenarios — for the product owner

1. **The sidebar reads itself** — open the app on a laptop. Every nav item's name should be visible without touching the mouse. ❌ Not OK if you must hover to see labels.
2. **You can always step up** — from any deep page (a 1:1, an admin drill-down), a breadcrumb at the top takes you up one level. ❌ Not OK if any page still has its own Back button.
3. **Check-in feels native** — open a Monthly Check-in. Same background, same buttons, same progress bar style as the rest. ❌ Not OK if it still feels like a different app.

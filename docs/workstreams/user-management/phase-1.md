# Phase 1 — User management table + rename

**Part of:** [PLAN.md](plan.md) · **Status:** ✅ done — closed on Carl's "finish" (2026-07-05); live-verified, hands-on walk optional

## Goal
Replace the stacked-card "Registered" screen with a clean flat table, and rename the nav item to **"User management"** — the surface every later action hangs off. Frontend only, no mutations.

## Why
Carl judged the card layout as weak. The table is the foundation the `⋯` actions sit on, and its look should be signed off before anything destructive is wired on.

## Changes
- **Rename:** nav label "Registered" → "User management" ([app-nav.js](../../../admin/src/ui/app-nav.js)) and the page `<h1>`. The internal stage/route stay `ADMIN_REGISTERED` / `/admin/registered` (a `/admin/users` alias is parked — less churn).
- **Redesign:** replace the stacked cards in [admin-registered.ts](../../../admin/src/stages/admin-registered.ts) with a **flat table** — flatten the existing `GET /api/v1/admin/registered` `companies[].users[]` into rows: **User** (name + email) · **Role** (badge: admin/manager/member) · **Company** · **Activity** (runs · last active) · **`⋯`**. Keep the alpha-ratings summary as one small header line. Reuse `escapeHtml` + `relTime`; all values escaped, ≥14px.
- **Open a person:** the **whole row is clickable** → the existing drilldown (`ADMIN_USER`); the name is a real `<button>` so it's keyboard- and screen-reader-reachable.
- **No `⋯` menu this phase.** After the design review (below), the single-item `⋯` ("View their 1:1s") was dropped as redundant with the clickable row. The `⋯` + real actions (role / deactivate / delete / reset) return in **Phase 2** when there's something to put in it.
- **"Coming back?" surfaced** (design-review fix): a ▲/▼/• trend per row (this-week vs last-week) leads the activity cell with recency, and the table **default-sorts by last-active** so the quiet/never-active sink to the bottom. The alpha-ratings stat became a labelled block; the zero-user note became a proper caption.
- **No backend change** — same endpoint, flattened + sorted client-side.

## Not in this phase
- Any mutation/action (role, deactivate, delete, reset) — Phases 2–5.
- Search / sort / pagination (parked; small N).

## Done when
- [x] The table lists everyone across companies with role + company + activity. *(verified live: Carl/admin, Dev Member/member, User A/manager, Daniel/manager; empty company preserved as a footnote.)*
- [x] Nav + page title read "User management". *(nav rail + h1 both updated; drilldown back button too.)*
- [x] "View their 1:1s" opens the drilldown; back returns to the table. *(walked live via preview.)*
- [x] `npm run typecheck` + `npm run build` green. *(both clean; `npm test` 60/60.)*
- [x] Product owner said go — Carl directed "finish" (2026-07-05) after the design review; a hands-on walk is still open to him.

## Test scenarios — for the product owner
1. **Clean table** — open **User management** → a clean table lists everyone with their company and a role badge. ❌ Not OK if anyone/anything is missing vs the old screen.
2. **Drilldown still works** — click a row's "View their 1:1s" → the drilldown opens → back returns to the table.
3. **Reads simple** — it looks like a tidy user list, not the old card clutter.

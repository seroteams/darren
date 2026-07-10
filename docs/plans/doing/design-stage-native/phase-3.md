# Phase 3 — Data display

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Port the data-display sections, reusing the app's existing table / card / badge / header CSS.

## Changes
- `admin/src/stages/design.js` — add sections: table, cards, badges & tags, page header & banner, goal columns & legend, "what Sero needs" inventory.
- Reuse `.um-table*` + `.um-badge*` (admin-tables.css), `.card` / `.card-flat`, `.page-header*`, `.l-grid`.
- Build showcase-local `.ds-*` bits only where nothing exists: category emoji tags, avatar+count badge, welcome banner, legend dots.
- Add the sections to the rail.

## Not in this phase
- Scores/chart/timeline/toasts/overlays/states (Phase 4); brand/nav/panel (Phase 5).

## Done when
- [ ] Table matches the app's real user-management table.
- [ ] Role pills + category tags render ≥14px with readable contrast.
- [ ] Page header (one action right) + welcome banner (accent-soft wash) match spec.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Table** — a person list with avatar + name + quiet second line, role pills, scores, ⋯ menu. Looks like the real user list.
2. **Cards** — a request card and a content card, both 12px corners, no nested cards.
3. **Badges & tags** — category tags with emoji, role pills, a score pill, an avatar with a count badge.
4. **Header & banner** — an eyebrow + Bricolage title + one quiet line + one action on the right; a "Good morning" banner in the soft blue wash.

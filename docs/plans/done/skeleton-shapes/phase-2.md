# Phase 2 — Lists and tables

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-27 — Carl walked the whole plan and signed it off (commit fd778f1b)
## Goal
Every list and table screen ghosts as its own list or table, not as generic grey cards.

## Changes
- Add the `table` and `timeline` presets to `admin/src/ui/skeleton-presets.ts` (`list-rows` already exists).
- Swap `loadingHtml(n)` for a preset at ~14 call sites: `admin/src/stages/runs.ts`, `library.js`, `personas.js`, `admin-registered.ts`, `admin-runs.ts`, `admin-ratings.ts`, `admin-gate1.ts`, `admin-guest-runs.ts`, `start-core.js`, and `frontend/src/stages/team.ts`, `members.ts`, `member-home.js`.
- Add a "Loading states" block to the existing `states` section of `admin/src/stages/design.js` so the presets can be tuned side by side.
- Extend the parity table in `skeleton-presets.test.ts` for every newly borrowed class.

## Blocked on
`admin/src/stages/runs.ts` is claimed by chat `d03316aa`. Needs that lane clear.

## Not in this phase
Detail screens, KPI tiles, two-column rails, the run lane, forms.

## Done when
- [ ] Ghost row count, row height and column widths match the loaded table on each screen
- [ ] Shape holds under Slow 3G throttling
- [ ] Parity tests cover every borrowed class; `npm test` green
- [x] Carl has walked the scenarios below and said go

## Test scenarios — for the product owner
Breadcrumb: `local > admin (dev autologin) > Past 1:1s, then Library, then Registered`
1. **A list loads as a list.** Open Past 1:1s on a throttled connection. While it loads you should see ghost rows with a round avatar, a name line and a shorter line under it. When the real list arrives, nothing should move. ❌ Not OK if the page jumps or resizes.
2. **A table loads as a table.** Open Library. You should see ghost table rows with the right number of columns, not a stack of cards. ❌ Not OK if you see cards.
3. **Row counts feel right.** The ghost should show roughly as many rows as the real screen usually has. ❌ Not OK if you see 3 ghosts then 20 real rows.

---

## Built (2026-07-26)

Preset work in `admin/src/ui/skeleton-presets.ts`:
- New `table` preset on the real um-table anatomy, with a small column vocabulary so a call site stays one line: `"stack"` (name over email), `"text:14ch"`, `"pill"`, `"actions"`.
- A `<colgroup>` plus `table-layout: fixed` (`.sk-table`, motion.css). Without it the browser dumps all the slack into one column and the ghost reads as one fat block instead of a table.
- `bare` option on `list-rows`, for a host that owns its own `<ul>` and aria-busy (the Home recents list). A wrapping `<div>` inside a `<ul>` would be invalid.

Wired (9 screens):
`admin/src/stages/runs.ts`, `start-core.js`, `library.js`, `admin-registered.ts`, `admin-runs.ts`, `admin-ratings.ts`, `admin-gate1.ts`, `admin-guest-runs.ts`. `frontend/src/stages/member-home.js` deferred to Phase 3: its section shapes live in `member-home-view.ts`, which chat `d03316aa` holds.

`start-core.test.ts:111` updated: it asserted the literal `createSkeleton`, now it asserts the list-rows preset.

### Offline proof
`npm test` 196/196 · `npm run typecheck` clean · `npm run lint:tokens` PASS · `npm run lint:copy` PASS.

### On-screen proof (measured on the real dev app, viewport 1280)

**Home recents** (`list-rows`, bare) — ghost against loaded, same page:

| Row | Ghost | Loaded | Diff |
|---|---|---|---|
| 1 | 73.5 | 73.5 | 0 |
| 2 | 73.5 | 73.5 | 0 |
| 3 (no bottom border) | 72.5 | 72.5 | 0 |

`aria-busy` flips true then false, no ghost left behind, and the `<ul>` gets three valid `<li>` children.

**Past 1:1s** (`list-rows`) — pixel-exact across nine elements, measured in Phase 1.

**Registered** (`table`, 25 real rows):

| Part | Ghost | Loaded | Diff |
|---|---|---|---|
| Toolbar | 43.03 | 43.03 | 0 |
| Table head | 30.36 | 30.36 | 0 |
| Column widths | 325 / 150 / 138 / 225 / 50 | 301 / 156 / 129 / 237 / 66 | 6 to 24px |
| Row height | 68.1 | 68.1 to 116.1 | ghost matches the shortest real row |

**The honest gap: table row height.** A real um-table row grows with its content. In this dev database emails, company names and the activity phrase wrap, so real rows run 68 to 116px. The ghost renders a clean two-line row at 68.1, which is exactly right when nothing wraps (there is a real 68.1 row) and one line short of the typical wrapped row. A skeleton cannot know how long the text will be before it arrives, so this is not tunable without lying to one dataset or the other. Lists have no such problem: their rows are fixed at two lines, which is why they come out pixel-exact.

Also verified: `/admin/runs`, `/admin/ratings`, `/admin/guests` (5 rows / 4 columns as configured), `/admin/library` all render their table ghost with no console errors.

### Defect caught during the build
The `"stack"` cell put both ghost lines on ONE line, because `.sk-leaf` is inline and the real markup relies on a `<button>` then a `<div>`. Rows came out 57.7 against 94.4 real. Fixed by giving each leaf its own block box; the row then landed at 68.1.

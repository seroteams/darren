# Phase 1: Manager lists

## Built (2026-07-22)

All five screens on the shared kit, awaiting Carl's QA walk. Files: admin/src/stages/start-core.js, runs.ts (+ new source-guard tests), frontend/src/stages/team.ts, team-card.ts, members.ts, members-table.ts, person-detail.ts, person-axes.ts (+ tests), frontend/src/styles/team-card.css, members.css, admin/src/styles/design/start-stage.css, admin-tables.css (toolbar skin + compact search input). Offline proof: 174/174 tests, typecheck clean, lint:tokens + lint:copy PASS; real-render screenshots of all five screens taken via the fixture harness and eyeballed (Team, Home, Past 1:1s, Person detail, Members). Bonus fix: scripts/gallery-export.mjs stripped HTML comments first; a comment containing the literal "<script>" was swallowing whole pages from every admin export (pre-existing harness bug, found during verification).

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting QA

## Goal

The four screens managers live in (Home, Team, Members, Past 1:1s) stop looking home-made: one shared table with a toolbar, rich rows, one solid blue action each, one medium page width.

## Changes

- Home (`admin/src/stages/start-core.js`): recents accordion deleted; rich table rows (avatar, bold name, meeting type, relative time), row click opens; "See all past 1:1s" link; Lucide chevrons; two-zone composition at `l-container` medium.
- Team (`frontend/src/stages/team.ts`, `team-card.ts`): toolbar (search + "N people" count), one card with divider rows replacing the card stack, solid accent "Add person" in the header row, per-row actions demoted to ⋯.
- Members (`frontend/src/stages/members.ts`, `members-table.ts`): search + count, avatars in the Member cell, solid accent "Invite people", shared Lucide ⋯.
- Past 1:1s (`admin/src/stages/runs.ts`): canonical rich rows, search/filter by person, recency grouping, "Start 1:1" into the page-header row.
- Person detail (`frontend/src/stages/person-detail.ts`): avatar identity header via `recap-header.ts`, Start 1:1 as the header accent, body shelved into ds-tabs, axis bars via `axes.js`.
- Orphaned CSS for the replaced patterns deleted in the same commit (start-stage accordion rules, per-card team styles).

## Not in this phase

Auth, member home, the 1:1 flow, nav shell, admin tools.

## Done when

- [ ] All five screens use the shared table/toolbar + page-header contract at medium width
- [ ] Each screen has exactly one solid accent action
- [ ] Free checks green; gallery re-export diffed vs baseline for these screens
- [ ] Acceptance boxes M1-M7 tickable

## Test scenarios — for the product owner

1. **Team feels like a directory** — open Team. Type a name in the search box; the list filters. You should see one clean list (avatars, names, roles) with a blue "Add person" top right. ❌ Not OK if people are still separate floating boxes or there's no search.
2. **Home opens things in one click** — on Home, click a recent 1:1 row. It should open that 1:1 directly. ❌ Not OK if the row folds out instead.
3. **Past 1:1s is scannable** — open Past 1:1s. Rows should read name-first in bold with the date quieter, grouped by recency. ❌ Not OK if rows are still one grey sentence.
4. **Width feels right** — on a laptop, these pages should fill a comfortable share of the window, not a narrow strip. ❌ Not OK if content hugs a skinny centre column.

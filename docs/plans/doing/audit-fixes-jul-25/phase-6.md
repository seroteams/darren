# Phase 6 — Error log readability

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The screen you open when something is on fire becomes readable.

## Changes
- **Message head only in the table** — `admin/src/stages/admin-error-log.ts`: the "What went wrong" cell shows the first clause of the message. Today it prints whole insert statements: `Failed query: insert into "people" ("id", "org_id", "manager_id", … ) values (default, $1, $2, …`. Measured: 3.3 million characters of text on one page.
- **Full statement in the row detail** — nothing is lost. Open the row and the whole thing is there, in a monospace block that scrolls on its own rather than stretching the table.
- **Page at 50** — 103 issues currently render as a 10,047px page with no paging.

## Not in this phase
- Grouping or deduplicating the issues differently. The existing "grouped into issues" logic stays as it is.
- The Unresolved / Resolved / All counts and filters. They work.

## Done when
- [ ] The rendered page height drops from ~10,000px to one screenful plus paging (both numbers recorded)
- [ ] Total visible text on the page drops from 3.3M characters to something a person could read (number recorded)
- [ ] Opening a row still shows the complete original message, verified against the DB row
- [ ] The long statement scrolls inside its own container; the page never scrolls sideways
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

1. **You can scan it** — `local > admin (audit.admin) > Errors`. Each row should read as a sentence you can take in at a glance. ❌ Not OK if any cell is still a wall of SQL.
2. **Nothing is hidden from you** — click a row with a database error. The full statement should be there in the detail, complete.
3. **It is not one endless page** — the list should page. Get to page 2 and back.
4. **No sideways scroll** — at your normal window width, the page should never scroll left and right.
5. **The filters still work** — Unresolved / Resolved / All, and Local / Live. Counts should still add up.

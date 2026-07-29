# Phase 6 — Error log readability

**Part of:** [plan.md](plan.md) · **Status:** 🔨 BUILT 2026-07-29, awaiting Carl. Not walked by him yet.

## Goal
The screen you open when something is on fire becomes readable.

## What it did

- **The cell shows the head, not the dump.** `messageHead()` takes the first line, caps it at
  100 characters and cuts on a word boundary when there is a sensible one, ending in an
  ellipsis so the truncation is visible. A failed insert that used to fill the cell now reads
  `Failed query: update "feedback_notes" set "org_id" = $1, "user_id" = $2, …`.
- **The detail is verbatim, and now ALWAYS shows.** This was the trap: the old detail printed
  the message *only when there was no stack*. Truncating the table without changing that would
  have made the full message unreachable for every error that had one. The detail now prints
  the whole message first, then the stack, both in the existing monospace block that scrolls
  inside itself (`overflow: auto`, `pre-wrap`, `break-word`), so it cannot widen the page.
- **Paging at 50**, with a bar that only renders when there is more than one page.
  `pageSlice()` clamps a stale page number, so switching a filter while on page 3 of a list
  that is now one page long lands on page 1 rather than a blank table.
- **Search had to move.** It was a hidden-toggle over the painted rows. With paging in, that
  would have searched 50 of 122 issues and still reported the count as honest. It is part of
  the filter chain now, so it reaches everything; the repaint costs the input its focus, so
  `paint()` hands the caret back at the end of the text.
- The pure pieces moved to `admin-error-log-rows.ts`. The stage imports its stylesheet at
  module top, which makes it unimportable under `node --test`. Same split as
  `members-table.ts` / `member-home-view.ts`.

## Verified

Against the real dev database (122 unresolved issues, 124 total), signed in as superadmin:

| Measure | Audit, 25 Jul | Now |
|---|---|---|
| Visible text on the page | 3,300,000 chars | **8,321 chars** |
| Longest "What went wrong" cell | whole SQL statements | **99 chars**, ends in an ellipsis |
| Issues rendered at once | 103, no paging | **50**, "1-50 of 122" |

- **Paging walked**: page 2 reads "51-100 of 122" (Previous enabled), page 3 "101-122 of 122"
  with 22 rows and Next disabled, and back to page 1.
- **Nothing lost**: opened a row and compared the detail against the API's own record for that
  error. The detail text is byte-identical to the stored `message`, and the stack renders too.
- **Search reaches past page 1**: searched `generation_failed`, a term that appears only in
  issues beyond the first 50. It found the one match. Under the old painted-rows search that
  would have returned nothing while still printing a count.
- **Filters still add up**: Unresolved 122 + Resolved 2 = All 124. Switching a tab from page 3
  lands on "1-50 of 124", not a stale page.
- No console errors. `npm run typecheck`, `lint:copy`, `lint:tokens`, `lint:components` green.
  14 new tests.

## NOT verified

- **The page-height and sideways-scroll numbers.** The Browser pane reports a 0x0 viewport in
  this session, so every geometry read (`scrollHeight`, `scrollWidth`, row heights) is
  meaningless. The plan asked for a before/after page height and I cannot honestly give one.
  What is measured instead is the text volume, which is the cause of the height. **This one
  needs your eyes, or a session where the pane lays out.**
- No screenshot, for the same reason.
- `npm test` is 204/205. The one failure is `admin/src/ui/coach-panel-state.test.ts`, which
  belongs to lane `3a92b974` (machar-fixes) and is mid-edit in that chat. Not this phase's.

## Not in this phase
- Grouping or deduplicating the issues differently. The existing logic stays as it is.
- The Unresolved / Resolved / All counts and filters. They work.

## Done when
- [x] Total visible text drops to something a person could read (3.3M → 8,321 chars)
- [x] Opening a row still shows the complete original message, verified against the DB row
- [x] The long statement scrolls inside its own container
- [x] The list pages, and paging survives a filter change
- [ ] The rendered page height drops from ~10,000px to one screenful plus paging — **not
      measurable this session** (0x0 viewport)
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
`local > admin > Error log`

1. **You can scan it** — each row reads as a sentence you can take in at a glance.
   ❌ Not OK if any cell is still a wall of SQL.
2. **Nothing is hidden from you** — click a row with a database error. The full statement is
   there in the detail, complete, in its own scrolling block.
3. **It is not one endless page** — the list pages at 50. Get to page 2 and back.
4. **No sideways scroll** — at your normal window width, the page should never scroll left and
   right. (This is the one I could not measure; please look.)
5. **The filters still work** — Unresolved / Resolved / All, and Local / Live. Counts add up.

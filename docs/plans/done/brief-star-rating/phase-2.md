# Phase 2 — Scores in the inbox

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-30 — Carl rated a brief, opened the Feedback inbox, and followed the row through to the 1:1 (commit 0d026aaa)

## Built (2026-07-30)

**Landed**
- **A new row type in the inbox.** `"brief"` added to `FEEDBACK_KINDS` (`Star` icon, label "Brief rating") with one branch in `noteKind()`. The score is checked FIRST, because a brief rating carries a run link too and would otherwise have read as a 1:1 verdict.
- **The score on the row.** `starsPill()` rendering "brief: 5 / 5" in gold, in the existing pill row. Shown as a number rather than five glyphs: the inbox is scanned down a column, and a number compares at a glance where a row of stars does not.
- **A readable preview line.** A brief rating carries no message, so the collapsed card would have been blank. It now reads "Rated this brief 5 out of 5."
- **The link into the 1:1 came free.** The existing "Open the 1:1" button already keys off `runId`.
- **Tests extended.** Four new cases in `feedback-kinds.test.ts`, including the score-beats-run-link ordering.

**Offline proof**
- `npm test` 216/216 · `npm run typecheck` clean · `npm run lint:copy` PASS · `npm run lint:tokens` PASS.

**Walked on the real screen** (`local > admin > /admin/admin/feedback`)

| Check | Result |
|---|---|
| Brief rating shows as its own row type with the score | ✅ [p2-inbox-row.png](proof/p2-inbox-row.png) |
| Collapsed preview reads as words, not blank | ✅ "Rated this brief 5 out of 5." |
| "Open the 1:1" lands on the right run's recap | ✅ opens Darryl's recap |
| Existing Note and 1:1 verdict rows unchanged | ✅ 5 verdicts, 9 notes, same icons and labels |
| Both rows for one 1:1 listed separately | ✅ verdict row and rating row side by side |
| Tab counts include the new row | ✅ New 14 / All 14 |

**Not walked by me**
- The inbox at phone width. The layout was not changed, only one pill added to a row that already wraps.

## Goal

Every brief score shows up in Carl's Feedback inbox as its own kind of row, with the score and a way through to that 1:1.

## Changes

- **A new row type in the inbox.** "Brief rating", with a star icon, sitting alongside the existing "Note" and "1:1 verdict" rows. One entry added to `FEEDBACK_KINDS` and one branch in `noteKind()` (`admin/src/ui/feedback-kinds.ts:18`): a row carrying `stars` is a brief rating. That file's own header comment (`:4-5`) describes exactly this extension path, so nothing else needs touching.
- **The score on the row.** A `starsPill()` beside `verdictPill()` in `admin/src/stages/admin-feedback.ts:96` rendering "4 / 5", pulled into the pill row (`:143`); `Star` added to the lucide import (`:26`) and `KIND_ICONS` (`:42`); `stars` added to the note type (`:44`). One `.fb-stars` rule in `admin/src/styles/feedback-inbox.css`, matching the existing `.fb-verdict` pattern.
- **The link into the 1:1 comes free.** The existing "Open the 1:1" button already keys off `runId`, which brief ratings carry.
- **Tests extended.** `admin/src/ui/feedback-kinds.test.ts` covers the new kind.

## Not in this phase

- Averages, histograms, a dedicated ratings screen, a Pulse tile. All parked.
- Any change to the Prep screen. That was Phase 1.

## Done when

- [ ] `npm test` and `npm run typecheck` clean.
- [ ] Screenshot of the real `/admin/feedback` screen showing a "Brief rating" row with a score.
- [ ] The "Open the 1:1" button on that row lands on the right run's recap.
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for the product owner

`local > admin > /admin/feedback`

1. **The score is there** — rate a brief 4 stars, then open the Feedback inbox. Newest first, you should see a row marked "Brief rating" showing 4 / 5. ❌ Not OK if it shows as a plain "Note" or the score is missing.
2. **It links through** — expand that row and click "Open the 1:1". You should land on that 1:1's recap. ❌ Not OK if it opens someone else's run or errors.
3. **The old rows are unchanged** — the existing "1:1 verdict" and "Note" rows should look exactly as they did, with their own icons and labels.
4. **Both survive on one 1:1** — rate the brief, finish the same 1:1, then answer the recap verdict question. Both should appear in the inbox as two separate rows. ❌ Not OK if one replaces the other. This is the one that would break quietly.
5. **The tabs still count right** — the New / Done / Archived / All counts at the top should include the new rows.

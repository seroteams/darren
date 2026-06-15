# Job lexicons

**Goal:** A permanent "Job lexicons" section in the left rail where you can browse every role's words and add your own — and the words you add reach the real 1:1.
**Driver:** Carl
**Created:** 2026-06-14

## Done means
- A new "Job lexicons" icon in the left rail, alongside Phrase library.
- Clicking it opens a page listing every job we have and its words.
- You can add your own words to a job (and remove ones you added).
- Your added words show up in a live run's "language of this role" — and the AI's generated words are never overwritten.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 4 | Library polish | Search/filter, group by job family, show the AI's confidence (from the shippability review) | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

_Phases 1–3 done + signed off 2026-06-15 (browse, add-your-own words, words reach the live run — "Sprint" confirmed). Detail in git history. Code in `7b8921a`._

## Current state
**Closed out 2026-06-15.** Phases 1–3 done + signed off; Phase 4 (library polish) stays parked. The shipped feature is complete; folder moved to `done/`.

## Parked
- Surfacing the rest of each role profile (challenges, themes, traps) on this page — for now it's words only.
- Editing the AI's generated words directly. We only add/remove *your* words; the AI's stay as-is.
- **Data hygiene** (from the review): messy job titles are now visible in the library (e.g. "Product manager on the payments team", lowercase titles). Normalize titles at setup, or allow hide/merge/clean.
- **Override or hide a *wrong* AI word** — today you can only add a competing word, not correct the AI's.
- Bulk import / export of words.
- Per-person or per-team word lists — these are per job title + level, shared by everyone in that role.

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
| 1 | Icon + browse | New left-rail icon → page listing every job and its words (read-only) | 🔨 |
| 2 | Add your own words | Add/remove your own words on a job; saved separately from the AI's, reversible | ⬜ |
| 3 | Words reach the run | Words you added show up in the live 1:1's "language of this role" | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 — 🔨 building (2026-06-14).** Baseline before touching anything: `npm test` → **23/23 passed** (free offline suite; no paid runs). Awaiting Carl's test + green light once built.

## Parked
- Surfacing the rest of each role profile (challenges, themes, traps) on this page — for now it's words only.
- Editing the AI's generated words directly. We only add/remove *your* words; the AI's stay as-is.
- Bulk import / export of words.
- Per-person or per-team word lists — these are per job title + level, shared by everyone in that role.

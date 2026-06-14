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
| 2 | Add your own words | Add/remove your own words on a job; saved separately from the AI's, reversible | 🔨 |
| 3 | Words reach the run | Words you added show up in the live 1:1's "language of this role" | 🔨 |
| 4 | Library polish | Search/filter, group by job family, show the AI's confidence (from the shippability review) | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phases 1–3 built + self-verified (2026-06-14) — awaiting Carl's live test.**
- `npm test` → **24/24** (incl. `test-role-lexicons.js`, now covering the run merge). Free offline only, no paid runs.
- Phases 1–2 verified earlier (browse + add/remove via API & UI).
- Phase 3 verified offline with real data: for **Backend Engineer · Mid-level**, the rendered role block now includes the user word "Sprint" (`- Sprint: …`) and `effectiveTerminology` merges it. Words ride along everywhere the role's words already go — the 5 AI prompts (all via `renderRoleProfileBlock`) + the "language of this role" screen (the handler). User words are deduped against AI words; no special-casing (engine honesty).
- Added words live in `data/role-profiles/<key>.overlay.json` (sidecar, never overwrites the generated profile).
- API server restarted on :3001 to pick up the new handler.
- **Live test pending:** start a Backend Engineer · Mid-level 1:1 → the "language of this role" screen should show Sprint. Then it's all ✅ → commit + move folder to done/.

## Parked
- Surfacing the rest of each role profile (challenges, themes, traps) on this page — for now it's words only.
- Editing the AI's generated words directly. We only add/remove *your* words; the AI's stay as-is.
- **Data hygiene** (from the review): messy job titles are now visible in the library (e.g. "Product manager on the payments team", lowercase titles). Normalize titles at setup, or allow hide/merge/clean.
- **Override or hide a *wrong* AI word** — today you can only add a competing word, not correct the AI's.
- Bulk import / export of words.
- Per-person or per-team word lists — these are per job title + level, shared by everyone in that role.

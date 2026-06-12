> **PARKED (2026-06-12)** — manager-first MVP; no history analytics. See [SERO_BOARD.md](../../../SERO_BOARD.md). Don't start phases here.

# Per-person run history + running profile

**Goal:** Sero remembers people, not just meetings — every finished 1:1 is grouped under the person it was about, and each person has one readable, always-truthful profile file.
**Driver:** Carl
**Created:** 2026-06-10

## Done means
- `data/people/<slug>/profile.md` exists per person, built only from their finished runs, regenerable at any time.
- Finishing a 1:1 refreshes that person's profile automatically.
- A "People" tab in the app lists everyone; clicking a person shows their profile and their runs.
- The profile's "How to help them" section is model-written, and every line cites the run(s) it came from — lines that can't are dropped by code.

## The ground rules (carry over from the engine)
- **No database.** Files only. A person is a folder.
- **Derived, never drifting:** profiles are rebuilt from runs — delete and regenerate, same result.
- **Honest:** thin evidence says "not enough yet"; no flat verdict labels; every claim traces to runs.
- Profiles read each run's saved **briefing** (+ ctx + review verdict). Never transcripts.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Grouping engine + profile files | Run a script → truthful profile.md per person | ⬜ |
| 2 | API + auto-rebuild | Profiles refresh themselves when a run finishes | ⬜ |
| 3 | People list page | "People" tab next to Library | ⬜ |
| 4 | Person detail page | Click a person → profile + their runs | ⬜ |
| 5 | "How to help them" synthesis | Model-written section under a hard citation rule | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 1 is next. (Full background: the approved plan lives in this folder's phase files; source exploration notes in the chat of 2026-06-10.)

## Known limitation (accepted)
People are matched by name ("Maya" and "Maya Chen" are two people). A real person id can come later; profile.json carries a `version` field as the migration seam.

## Open question (decide during/after Phase 1)
Most current history is scripted persona runs. Default: include everything, with a Mode column showing what fed the profile. Excluding scripted runs later is a one-line filter.

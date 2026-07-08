# Tracker Consolidation — five status sources down to two

**Goal:** There are exactly **two** places to check "where are we" — STATUS.md (tactical) and SERO_BOARD.md (strategic) — and every other tracker clearly says it is *not* a status source, so nothing drifts or goes stale again.
**Driver:** Carl
**Created:** 2026-06-29

## Why this exists
Five things currently track status: STATUS.md, SERO_BOARD.md, PROGRESS.md, the build
badges in `admin/src/stages/tasks.js`, and `docs/reports/sero-how-it-works.html`. Keeping them
in sync needs an ever-growing rulebook (CLAUDE.md §6), and the 2026-06-29 audit still
found three stale trackers. The fix is fewer sources, not more sync rules.

## The target model (what "two" means)
- **STATUS.md** — canonical *tactical* tracker (the phase plan we're on right now).
- **SERO_BOARD.md** — canonical *strategic* tracker (the feature board).
- **PROGRESS.md** — append-only *decisions + lessons log*. NOT a status source.
- **Build badges** (`tasks.js`) — a *UI feature* showing per-step build state. Legit to
  keep (it drives the board + the continue-prompt); just must not be a *competing*
  status narrative.
- **sero-how-it-works.html** — *manual founder-facing changelog*, refreshed at phase
  close. NOT live status.

## Done means
- Opening any of the three subordinate files, you can tell within 5 seconds it is NOT
  where you check status — each points you to STATUS.md / SERO_BOARD.md.
- CLAUDE.md §6 is shorter: it names two status sources and drops the redundant
  keep-five-in-sync rules.
- Nothing about status lives in two places where the two can disagree.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The map | A short, agreed "which file is for what" reference everyone can point to | ✅ |
| 2 | Demote PROGRESS.md | PROGRESS reads as an append-only decisions log, not a status board | ✅ via 009 P7 (`0f5f6677`) |
| 3 | Changelog clarity | sero-how-it-works.html is clearly a manual founder changelog, not live status | ✅ via 009 P7 (edit in sero-how-it-works.html) |
| 4 | Lock the rules | CLAUDE.md §6 simplified to the two-source model; badges confirmed build-only | ✅ via 009 P7 (`0f5f6677`) |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ ticked 2026-07-01** (Carl, QA-pile clear-out). Phase 1 landed a standalone
`docs/reference/trackers.md` (the map) plus a one-line pointer to it from STATUS.md's intro. Decision made:
the map is a *standalone* file (durable reference) rather than a section inside STATUS.md (which
churns each phase) — veto-able in QA.

**Audit reconciliation (2026-07-01):** `docs/reference/trackers.md` is **git-tracked with a clean status** — it
**is committed** (the earlier "not committed yet" was stale). Phase 2 (demote PROGRESS.md) is now
**partly advanced**, not untouched: the 2026-07-01 PROGRESS.md reconciliation added the "trust STATUS.md
/ append-only, not a status source" pointer — but Phase 2 isn't done, because PROGRESS.md's top banner
still reads "living log… updated after every action" and its rival phase-status table survives. Phases 3–4
remain not started (the how-it-works changelog still badges "LIVE" and doesn't point to STATUS.md; CLAUDE.md
§6 still carries the keep-many-in-sync rules). `npm test` now 52/52.

## Parked
- Auto-deriving STATUS.md content from the build badges (or vice versa) — tempting, but
  a bigger build; revisit only if manual drift continues after this consolidation.
- Renaming/moving any tracker file — out of scope; this plan changes *roles and
  headers*, not locations, to avoid breaking existing links.

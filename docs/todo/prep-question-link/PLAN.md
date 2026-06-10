# Link the prep brief to the actual questions

**Goal:** The questions the engine asks visibly follow the prep brief — the first real question carries the brief's opening question, and later questions stay on the brief instead of wandering.
**Driver:** Carl (product owner)
**Created:** 2026-06-10

## Done means
- The first substantive question in a run is a reworded version of the prep brief's opening question — not a generic "anything to cover", not a word-for-word paste.
- Planner-added questions stay tied to the brief's core issue / listen-for points, unless the report's own answer opened a new thread.
- A diagnostic shows the link holding (`opener_link`, `on_brief`) in the gate output.
- `npm run gate` and `npm run smoke` stay green.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Opener link | First real question carries the prep opening question | ⬜ |
| 2 | Stay-on-brief + diagnostics | Later questions stay on-brief; link is measured | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 1 is next. Folder just set up — waiting for the product owner to confirm the split before any work starts.

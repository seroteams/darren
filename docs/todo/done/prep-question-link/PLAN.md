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
| 1 | Opener link | First real question carries the prep opening question | ✅ |
| 2 | Stay-on-brief + diagnostics | Later questions stay on-brief; link is measured | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Good to know before building
- This changes **which** questions get asked, so it only shows in a **manual** run. Scripted persona runs (the "Run 4 of 12" reviews) freeze the question list on purpose and won't reflect it.
- The prep opener is placed *early* (right after the warm opener), not left to surface around question 5.

## Current state
Both phases **built and verified live**. Latest checks: smoke 13/13 + 22/22; gate 7/7 ok (all happy cases + both adversarial sentinels). `opener_link = 1` across all 7 meeting types; `on_brief` = 1.00 on Performance, 0.75–0.80 on bi-weekly/growth, 0.40–0.43 on the wide-ranging "feels-off" arcs. Optional: a manual Performance run to eyeball the wording yourself.

Parked (not blocking): `on_brief` uses crude word-overlap against `coreIssue`+`listenFor` only, so it reads low on wide-ranging arcs — directional, not ground truth. If the prep opener at Q2 ever feels too rigid, let a strong thread-follow win Q2 and pin the opener to Q3 instead. Pre-existing and untouched by this work: `npm run eval` fixture failures on prep `confidence`/`dontAssume` and a `maria-growth` answer-count.

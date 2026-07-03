# Phase 005 · Step 02 — "Since last time" (the make-or-break block)

## Goal
At the top of the person page, show what you agreed and what to watch for from your **most recent** 1:1
with them — so coming back to prep the next one *helps*, not just reminds.

## What you'll have
- A "Since last time" block above the run list: the latest 1:1's **agreed next actions** and **what to
  watch for**, in the plain markup they already render in.
- If the latest run has neither field → the block is **hidden entirely** (no empty scaffolding).

## A grounding example
- **Before:** Priya's page lists 3 past 1:1s but nothing from them reaches your next prep.
- **After:** the top reads "Since last time: agreed → follow up on the workload conversation · watch for →
  signs she's still stretched" — pulled from the most recent 1:1.

## Why this is near-free (from the CTO review)
This is the one change that turns *recall* into *help* — the stated willingness-to-pay bar. And the data
is already on the page: the briefing object carries `next_actions` and `watch_for`, `memberRunView` already
returns the full briefing, and the render for both fields already exists in `review-run.js`. So this is
**one composed block over data already fetched** — no new endpoint, no schema change, no OpenAI call.

## Technical detail
- In `person-detail.ts`, take the most recent run (already sorted from Step 01) and read its briefing's
  `next_actions` + `watch_for`.
- Reuse the existing markup from `review-run.js` for those two fields (lift the render, don't restyle).
- Render the block only if at least one field is non-empty; otherwise omit it. Escape all values.
- This is a **minimal slice** of the deferred "remembering" — last time's actions/watch-fors on the person
  page only. It is **not** the full cross-session continuity system (person-profiles, auto-injecting prior
  context into the engine), which stays deferred. (Carl can park even this slice — flag it.)

## Check
- `npm run typecheck` clean; `npm test` green. A person whose latest 1:1 has actions/watch-fors → the block
  shows them, matching what that run's detail shows. A person whose latest 1:1 has neither → **no block**
  (not an empty heading). No OpenAI calls.

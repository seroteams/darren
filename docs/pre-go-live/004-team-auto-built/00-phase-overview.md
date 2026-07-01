# Phase 004 — Team (auto-built people)

## Goal (plain)
Turn the empty **Team** page into a real one — the people the manager has met with, built automatically
from their past 1:1s. No "add a teammate" step; the team appears as they run 1:1s.

## What you'll have when it's done
- The Team page lists the people the manager has run 1:1s with, one card each: **times met**, **last
  met**, and **average usefulness** (from Phase 003 ratings).
- The list is built by grouping the manager's own runs by the person's name — no new data entry.
- The empty state stays for a manager who hasn't run any 1:1s yet.

## A grounding example (before → after)
- **Before:** Team → "Your team will live here" placeholder.
- **After:** Team → cards for "Priya (3 meetings, last 2 days ago, ★★★★☆)" and "Marco (1 meeting, last
  week, ★★★☆☆)".

## The steps (to be detailed when this phase starts)
1. Derive people from the manager's own runs: group by a **normalized name key** (`ctx.name` trimmed +
   lower-cased — ~2 lines, kills the "priya/Priya" split), roll up count / last-met / average stars.
   Keep the manager's original display name for the card label. **Start client-side** from the
   `/api/v1/runs/mine` payload. **Factor the grouping into a small shared function**, because Phase 008
   needs the same roll-up server-side for an arbitrary user — write it once, don't reimplement.
2. Rewrite [team.js](../../../admin/src/stages/team.js) from placeholder to the grouped people list
   (match `.card-flat` / `.l-stack`; `escapeHtml` names).
3. Design the **"only one meeting" card** deliberately ("1 meeting · not yet rated") so a single 1:1
   doesn't imply a history it lacks.
4. Keep the empty state for zero runs; own this phase's loading + error states too.

## Information architecture (from the CTO review)
**Team is the primary way in; the flat Runs list is the secondary "all activity" view.** Managers think
*"my 1:1s with Priya,"* not *"run #7"*. So every **Runs row links to the person** (Phase 005), and the
member "Runs" nav item/page is relabelled **"Past 1:1s"** (one string in `app-nav.js` + the page heading;
"Runs" stays the internal/admin word). This is a framing + label change, not a rebuild.

## What we reuse (don't rebuild)
- The `/runs/mine` list (Phase 001) already carries `ctx.name`, timestamps, and (after Phase 003) stars —
  grouping is a client-side roll-up over data we already fetch.

## How we'll know it's done (full list in `99-qa-signoff.md`)
- Two 1:1s about the same person (incl. "Priya" vs "priya") → **one** card, count = 2, correct last-met
  and average stars.
- A manager with no runs → the empty state; a manager with one 1:1 → a clean single-meeting card.
- Only the manager's own people appear (the fence holds).
- No OpenAI calls; `npm test` + typecheck stay green.

## Known limit (parked to Phase 009)
Normalized grouping catches case/whitespace, but "Priya" vs "Priya S." are still two cards. **Merging
genuine duplicates** (an explicit user action) is Phase 009, not here.

> **Status:** overview only. Detailed step files get written when we start this phase.

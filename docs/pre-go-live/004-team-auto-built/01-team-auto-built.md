# Phase 004 · Step 01 — The Team page, built from your past 1:1s

## Goal
Turn the empty Team page into the people the manager has met with, grouped automatically from their runs.

## What you'll have
- One card per person (grouped from `/runs/mine`): name, role, **times met**, **last met**, and
  **average usefulness** (from PG3 ratings, with its count). A single-meeting card reads "1 meeting · not
  yet rated" — no implied history. Empty state stays for a manager with no runs.

## Technical detail
- New shared helper `admin/src/ui/group-people.js` → `groupRunsByPerson(runs)`: groups on a **normalized
  name key** (trim + lower-case, so "Priya"/"priya" merge), keeps the display name, rolls up count /
  last-met / avg stars / rated-count, sorted most-recent-met first. (Reused by PG5's person page.)
- Rewrite [team.ts](../../../admin/src/stages/team.ts): fetch `listMyRuns()`, group, render `.card-flat`
  cards; own loading / empty / error states; `escapeHtml` names. Cards are display-only for now — the
  person page (click-through) is **PG5**.

## Check
- `npm run typecheck` clean; `npm test` green. Two 1:1s with one person (incl. "Priya"/"priya") → one
  card, count 2, correct last-met + average; one 1:1 → a clean single-meeting card; no runs → empty state.

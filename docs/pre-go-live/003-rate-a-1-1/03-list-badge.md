# Phase 003 · Step 03 — Show the rating on the Runs list

## 1. Goal (plain)
On the Past-1:1s list, show a small star badge on each run you've rated, so you can see at a glance
which ones landed — and a quiet "Rate this?" nudge (not a nag) on the ones you haven't.

## 2. What you'll have when it's done
- Each **rated** row shows a compact star badge (e.g. ★ 4) alongside the existing line.
- Each **unrated** row shows a neutral, inviting "Rate this?" affordance — never a red count,
  never a guilt prompt.
- Tapping the row still opens the detail (Step 01/PG2) where the rating can be set or changed.

## 3. A grounding example (before → after)
- **Before:** every row looks the same — no sign of which 1:1s were useful.
- **After:**
  - `Priya Shah · Senior Engineer · One-on-one · 3h ago    ★ 2`
  - `Marco Diaz · Product Manager · Bi-weekly · 2d ago      Rate this?`

## 4. The technical detail
- The rating is **already in the list payload**: `listFinishedForMember` returns each run with
  `rating: { stars, note, updatedAt } | null`
  ([run-history.ts](../../../backend/engine/run-history.ts)). So [runs.ts](../../../admin/src/stages/runs.ts)
  already receives `r.rating` — no new fetch.
- Extend `MyRun` (the local type in `runs.ts`) with `rating: { stars: number; note: string;
  updatedAt: string | null } | null`.
- In the row markup, after `rowLine(r)`, append a small badge:
  - `r.rating` present → `★ ${r.rating.stars}` in a compact, muted badge (reuse existing type
    classes; ≥14px; the star is decorative, so give the badge an `aria-label` like
    "Rated ${stars} of 5").
  - `r.rating` null → a quiet "Rate this?" hint styled as secondary text (not a warning colour).
- Keep the row a single keyboard-operable button (PG2) — the badge is display-only; the row click
  still opens the detail. Escape every value.

**Do NOT in this step:** no per-person averages (that's PG4/PG5); no sorting/filtering by rating
(parked); no inline rating from the list row (rating happens on the detail / in-flow).

## 5. How to check it worked
- `npm test` green, `npm run typecheck` clean.
- A rated run shows its star badge on the list; an unrated one shows the neutral "Rate this?".
- Rate a run on the detail, go back to the list → its badge now reflects the new score.
- A screen reader announces the badge as "Rated N of 5"; nothing on the list reads as a nag.

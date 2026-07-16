# Briefing page → "Before · During · After" layout

**Goal:** The pre-1:1 briefing (the last page of a run) is redrawn as the "Before · During ·
After" layout, so a manager lands on a clear, meeting-shaped page instead of the current flat one.
**Driver:** Carl (design lead). Trigger: Darren said the current last page is confusing.
**Created:** Thu 16 Jul 2026

## Done means
- A manager finishing a run lands on the briefing drawn as **Before you walk in → In the room →
  Leave with** — the layout Carl picked from the 5 mockups.
- Same seven pieces of content as today (nothing added or removed) — only the arrangement changes.
- It's built in Sero's real design system (tokens, not the mock's raw colours), passes the
  existing brief tests, and no other place that shows a brief is broken.

## Resolved before we start (dug out of the code, so phases don't stall)
- **The layout picker is admin-only.** `frontend/src/stages/preparation.ts:51` only renders the
  switcher for admins. Regular managers already see just **one** layout — the default
  (`DEFAULT_VARIANT`, currently "J / Contrast" in `preparation-brief.ts`). So the real fix is
  **swap the default**, not remove a picker.
- **Layouts are pluggable.** Each layout is a small `renderX(slots)` function returning an HTML
  string, registered in `RENDERERS` + `VARIANTS` (`preparation-brief.ts`). Adding one is
  self-contained.
- **The tests already guard the contract.** `preparation-brief.test.ts` loops over every entry in
  `VARIANTS` asserting all 7 slots render, nothing appears twice, and labels are truthful — so a
  new layout is auto-covered the moment it's registered.
- **This layout is cheap on colour.** "Before · During · After" uses only the accent family
  (spine, dots, the opener callout) — no navy/mint/coral — so the CSS stays simple.
- **Other places that touch a brief** (`admin/src/ui/briefing-view.ts`, `admin/src/stages/
  review-run.js`, `onepage.js`, `backend/engine/review-html.ts`) are internal/admin review
  renders, not the manager's last page. Phase 2 verifies none of them break; changing them is out
  of scope unless one shares this exact render.
- **Cost:** front-end only — **no engine, no OpenAI, no paid runs.** Baseline + verification are
  free (`npm test`, `npm run typecheck`, and looking at the running app).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Build the layout | "Before · During · After" exists as a real Sero-tokened layout; admin can switch to it and it renders right | ⬜ |
| 2 | Make it the default | Every manager lands on it by default; confirm no other brief surface broke | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Plan drafted, awaiting Carl's OK to start Phase 1. Nothing built yet. Baseline will be run at the
start of Phase 1 (free tests only — this doesn't touch the engine, so the paid gate is skipped).

## Parked
- **Auto-pick layout by meeting type** (lane C from the discussion) — a bigger, later build.
- **Retiring the admin switcher entirely** — harmless as-is (admins only); leave it for internal
  comparison unless Carl wants it gone.
- Whether the admin review/one-page renders should also adopt this shape — revisit only if Carl
  wants the internal views to match.

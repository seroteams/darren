# Phase 4 — The frame & the customer flagship

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The artifact's signature framed-screen treatment lands on the briefing/prep, and the guided
customer flow + member home join the design system — the customer-facing surfaces reach the full
artifact bar.

## Changes
- **The `.screen` frame** (page-tint ground inside an 18px hairline + `--shadow-lift` frame, white
  cards floating on it) added to `cards.css`; adopted on briefing + prep first; resting/hover
  shadows stripped from in-frame cards (`test.js`, `start-stage.css`, `guided.css`).
  **Carl call:** keep or fence the body gradient wash where framed — shown at QA.
- **`guided.css` full rebase:** `mcr-btn` → shared `.btn`; chips onto the `.chip` primitive at
  14px; ~120 hexes → tokens; global focus ring; reduced-motion gating; base font onto the type
  scale; brand mark strip. *Layout untouched — the nav-paradigm question stays parked.*
- **`member-home.js`:** inline styles → helper classes + tokens; error text onto
  `--color-negative-text`.
- **Skeleton adoption:** `createSkeleton()` replaces "Loading…" text on `team.ts`, `members.ts`,
  `person-detail.ts`, `member-home.js`, `runs.ts`, `guided.page.ts`.

## Not in this phase
- Long-tail admin pockets, alerts, overlays, off-barrel CSS (Phase 5).
- Any guided-flow layout/navigation change (parked — Carl's separate call).

## Done when
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Seen on the running app: a full guided run end-to-end, briefing, member home, Team on a
      slow reload.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **The frame** — open a briefing. The whole thing sits inside a softly-lifted rounded frame with
   the tinted page colour inside it and white cards floating on top — the artifact's signature.
2. **Flagship flow** — run a monthly check-in end to end. No tiny text; buttons and chips match
   the rest of the app; the flow itself behaves exactly as before.
3. **Member home belongs** — open it: looks like part of the same product (proper labels, proper
   controls).
4. **Skeletons** — reload Team on a slow connection: ghost cards shimmer where content will land,
   instead of a bare "Loading…" line.

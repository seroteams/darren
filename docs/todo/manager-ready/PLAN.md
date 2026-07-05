# Manager-ready — customer rail + design polish

**Goal:** managers are the paying customers. Two fixes: (1) they stop seeing the internal
toolset — they get their own clean rail; (2) the manager journey gets the last design-system
polish (Bricolage headings, 4px buttons, one date format).
**Decisions (Carl, 2026-07-05):** Polish + manager rail · 4px buttons app-wide (match Figma).
**Full plan:** `.claude/plans/for-this-figma-bridge-logical-snowglobe.md` (Carl's machine).

## Current state
- **Phase 1 — 🔨 BUILT (2026-07-05), awaiting Carl's walk.** Test-first (red→green): new
  `state.test.ts` + `router.test.ts`; `npm test` 67/67 → **69/69**; root typecheck clean.
  Browser-verified per role: admin rail unchanged; manager rail = exactly Home · New 1:1 ·
  Team · Past 1:1s; member rail unchanged; active-highlight works. Boot + back/forward bounce
  managers off internal stages to Home. Not committed — green light = commit.
  ⚠️ Pre-existing, NOT this phase: `vite build` fails at HEAD on `@sero/run-debrief` import in
  `admin/src/ui/run-debrief.js` (committed by a parallel session mid-work).
- Phase 2 — ⬜ **blocked on `design.css` going quiet** (mobile track is editing it live).

## Phases
| # | Phase | What Carl gets | Status |
|---|---|---|---|
| 1 | [Manager rail](phase-1.md) | Managers see Home · New 1:1 · Team · Past 1:1s — not the workshop | 🔨 |
| 2 | [Design polish](phase-2.md) | Bricolage headings, 4px buttons, "Mon 18 Nov 2024" dates, 12px fix | ⬜ |

## Key facts
- `isAdmin()` (state.js) = manager OR admin → gates console *access*; keep as-is. New
  `isInternalAdmin()` = admin only → gates the internal *rail* + internal stages.
- Manager rail reuses existing screens (PG1–PG5 built manager Team/Runs). No new screens.
- Backend 403s stay the real wall; the router guard is cosmetic UX.
- Exploration verdict: manager journey already ~85% on-system; Phase 2 is font-swap + touch-ups.

## Parked
- Backend gating of internal endpoints managers can still hit (list built during Phase 1).
- Any markup re-skin of manager screens (not needed).

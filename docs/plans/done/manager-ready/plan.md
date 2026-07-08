# Manager-ready — customer rail + design polish

**Goal:** managers are the paying customers. Two fixes: (1) they stop seeing the internal
toolset — they get their own clean rail; (2) the manager journey gets the last design-system
polish (Bricolage headings, 4px buttons, one date format).
**Decisions (Carl, 2026-07-05):** Polish + manager rail · 4px buttons app-wide (match Figma).
**Full plan:** `.claude/plans/for-this-figma-bridge-logical-snowglobe.md` (Carl's machine).

## Current state — ✅ TRACK CLOSED 2026-07-08
- **Phase 1 — ✅ GREEN-LIT by Carl 2026-07-05 ("looks good continue").** Committed (built-first,
  honest message). Test-first 67/67 → 69/69; per-role rails browser-verified.
- **Phase 2 — ✅ GREEN-LIT by Carl 2026-07-08 ("signed off").** Built + committed `c6eca72f`
  (2026-07-05); survived the later CSS restructure into `admin/src/styles/design/`. Walked live
  2026-07-08 with measured proof: h1 computed font = Bricolage Grotesque Variable, `.btn`
  border-radius = 4px, live "Mon 6 Jul 2026" date on New 1:1, page-wide sweep found nothing
  under 14px outside the dev-only debug strip. `npm test` 96/96. Bonus finds during the walk:
  the P1 rail guard bounced a manager off /library exactly as designed, and `formatDate` has
  since been adopted by intake + member-home too.

## Phases
| # | Phase | What Carl gets | Status |
|---|---|---|---|
| 1 | [Manager rail](phase-1.md) | Managers see Home · New 1:1 · Team · Past 1:1s — not the workshop | ✅ |
| 2 | [Design polish](phase-2.md) | Bricolage headings, 4px buttons, "Mon 18 Nov 2024" dates, 12px fix | ✅ |

## Key facts
- `isAdmin()` (state.js) = manager OR admin → gates console *access*; keep as-is. New
  `isInternalAdmin()` = admin only → gates the internal *rail* + internal stages.
- Manager rail reuses existing screens (PG1–PG5 built manager Team/Runs). No new screens.
- Backend 403s stay the real wall; the router guard is cosmetic UX.
- Exploration verdict: manager journey already ~85% on-system; Phase 2 is font-swap + touch-ups.

## Bonus: accessibility pass ✅ (2026-07-05, committed `44d6e17b`)
Measured WCAG contrast for every system pairing (script, not guesswork). Fixed: text-safe
status tokens (`--color-positive-text` mint-900 · `--color-negative-text` coral-800) wired into
all 7 colour-as-text usages; focus ring 1.2:1 → double ring (7:1); sheet coral text → 800;
the 4.5:1 law added to the sheet rules + DESIGN.md ("Accessible pairings", measured ratios).
**Button call resolved (2026-07-05):** Carl tried the dark label (pick A), saw it rendered,
and reverted — **white on sky stays as an accepted brand deviation** (2.5:1, recorded in
DESIGN.md §2 with the passing fallbacks if requirements ever harden). Every other measured
failure is fixed.

## Parked
- Backend gating of internal endpoints managers can still hit (list built during Phase 1).
- Any markup re-skin of manager screens (not needed).

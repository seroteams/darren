# Phase 2 — Two themes, one paint layer (dark mode)

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The whole product gains a proper dark theme, defined once at the token layer, with a toggle —
no screen touched individually except the bounded hardcode sweep.

## Changes
- **Dark token block** in `admin/src/styles/design/tokens.css`, artifact-derived values:
  hue-biased darks (page `#0f151b`, surface `#18212b`, borders `#2a3642`/`#33414f` — blue-toned,
  never black); ink flips to `#e9f0f6`; accent lightens to `#6fb4e8`; `--accent-dark` flips
  polarity to pale `#b7dcf6`; semantic tint triads invert as units; dark `--shadow-lift`;
  the ~8 black-rgba overlay/shadow tokens → ink-tinted equivalents (else hovers vanish).
- **The 4-block mechanism:** `:root` (light) → `@media (prefers-color-scheme: dark)` →
  `:root[data-theme="light"]` → `:root[data-theme="dark"]` — in-app choice beats OS, both ways.
- **Toggle:** small theme module + persistence (localStorage), segmented pill control, mounted in
  both shells (`admin/src/main.js`, `frontend/src/main.js`). **Carl call: placement** (profile
  menu vs nav rail) — asked when built, easy to move.
- **Hardcode sweep (~40–60 spots):** `stages/tasks.js` KB_LANE_COLORS; literal `#fff`/`#5aa9e6`/
  `#24445c` in `design-stage.css`/`session-topbar.css`; `axes.css` `#eef1f6`; rail tokenised as a
  committed-block sub-palette (`--rail-bg/-ink/-dim`) so the shell themes too.
- **Guard test:** extend the `preparation-css.test.ts` pattern — no literal colours in the design
  barrel outside `tokens.css`.

## Not in this phase
- Chip/label restyles (Phases 3–4). The frame (Phase 5). Off-barrel CSS (Phase 6 — dark may look
  rough in those pockets until then; expected, noted at QA).

## Done when
- [ ] `npm test` (incl. new guard) + `npm run typecheck` green.
- [ ] Seen on the running app in BOTH themes: nav rail, briefing, Team, Pulse, login.
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner
1. **One flip, whole app** — flip the new toggle. The entire app (nav, briefing, Team, Pulse,
   login) goes dark in one move; darks look blue-toned, not grey or black; nothing unreadable.
2. **Your choice wins** — set your computer to dark mode but the toggle to "light". The app stays
   light (and the reverse). Reload — it remembers.
3. **Five-screen walk in dark** — every pill/chip/label still reads clearly; the sky-blue accent
   is still obviously the action colour.
4. **Light untouched** — flip back to light: pixel-for-pixel what you had after Phase 1.

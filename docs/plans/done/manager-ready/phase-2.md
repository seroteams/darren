# Phase 2 — Design polish

## ✅ GREEN-LIT 2026-07-08
Carl signed off after the live walk. Measured proof: h1 = Bricolage Grotesque Variable,
`.btn` radius = 4px, live "Mon 6 Jul 2026" date on New 1:1, nothing under 14px outside the
dev-only debug strip. Built + committed `c6eca72f` (2026-07-05); `npm test` 96/96.

**The manager journey's last three gaps + one remnant.** (The old design.css hot-file warning
is resolved — the file was committed and has since been split into `styles/design/`.)

## How
1. **Bricolage Grotesque**: `npm i @fontsource/bricolage-grotesque`; import 600 weight in
   `admin/src/main.js` (same pattern as Inter); display/headline classes (`.h1`, `.h2`,
   `.text-display`) get `font-family: 'Bricolage Grotesque', InterVariable, …`. Body stays Inter.
2. **Button radius 8px → 4px**: `--radius-button` → `var(--sero-radius-sm)` in `design.css`.
   App-wide including admin — Carl chose 4px (matches Figma + the sheet).
3. **One date format** — "Mon 18 Nov 2024": shared `formatDate(ts)` helper beside the existing
   shared `relTime`; replace `toLocaleDateString` in `stages/library.js`, `stages/personas.js`,
   `stages/start.js`.
4. **12px remnant**: `start.js` persona footer `.text-xs` → `.text-sm`.

## QA scenarios (Carl walks)
- [ ] Headings on Login → Home → the 1:1 flow → Team/Runs are visibly Bricolage (rounder, warmer
      than the body font). Body text unchanged.
- [ ] Every button has the sharper 4px corner (compare with the sheet side-by-side).
- [ ] Library/Start dates read exactly "Mon 18 Nov 2024" style.
- [ ] Nothing under 14px on the manager screens.

**Green light = commit + close out the track.**

# Phase 1 — Responsive shell

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 built 2026-07-05, awaiting Carl's walk

## Goal
On screens narrower than 768px, the fixed left rail becomes a slide-in drawer behind a menu button, and the top chrome (mobile header + session topbar) stacks cleanly — so every other screen has room to work.

## Changes
- `admin/src/ui/app-nav.js` — below 768px the rail is off-canvas (`translateX(-100%)`, `min(80vw, 300px)` wide, labels always shown); a new fixed 48px mobile header (brand + hamburger) rendered by the same module so it inherits the existing show/hide + role logic. Open/close via button, scrim tap, Esc, and on navigate. `aria-expanded` kept honest.
- `admin/src/styles/design.css` — new "Mobile shell" section + edits in the nav/topbar/notes blocks. Desktop hover-expand rules wrapped in `@media (hover: hover)` (stops iPad sticky-hover). Drawer/scrim z-index sits between sticky and modal layers.
- `admin/src/ui/session-topbar.js` + css — below 768px: `left: 0; top: 48px`, compact row (Session button + current stage + step count; done/upcoming steps hidden; glossary kept). Body padding accounts for the header+topbar stack.
- Notes panel below 640px → full-width sheet with safe-area padding.
- Profile badge below 768px → avatar-only.

## Not in this phase
- Any per-screen layout fixes (Phases 2–5).
- Bottom tab bar (parked).

## Done when
- [ ] At 375px wide: no left gutter, header + working drawer, both roles see their correct links.
- [ ] Desktop (≥768px) looks and behaves exactly as before.
- [ ] Free checks green: `npm test`, `npm run typecheck:admin`, admin build.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk these on your phone (or devtools phone mode). Next phase waits for your green light.
1. **Member drawer** — log in as a member on the phone. You should see a top header with a menu (☰) button, no dark strip down the left. Tap ☰ → a drawer slides in with Home, Team, Past 1:1s + the footer links (About, Feedback, Privacy, Log out). Tap outside it → it closes. ❌ Not OK if any content hides behind a left gutter.
2. **Admin drawer** — log in as yourself. Tap ☰ → the full grouped list (Sessions / Engine / Admin) scrolls inside the drawer; tapping a link navigates and closes the drawer.
3. **In a session** — start/open a run. The header and the stage bar stack at the top, page content starts below them (nothing hidden underneath), and the stage bar shows the current stage + step count without being squashed.
4. **Notes on mobile** — mid-run, open the notes panel. It covers the screen as a sheet and closes cleanly.
5. **Rotate** — turn the phone sideways. Nothing overlaps; the drawer still works.
6. **Desktop untouched** — on your PC, the rail still sits left and expands on hover exactly like before. ❌ Not OK if desktop changed at all.

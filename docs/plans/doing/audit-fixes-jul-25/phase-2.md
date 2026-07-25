# Phase 2 — Shell and layout

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Stop the app shell falling apart on long pages and stop the header buttons hiding under the account chip, then let a 1:1 have the screen to itself.

## Changes
- **Nav reaches the bottom (F3)** — `admin/src/styles/design/app-nav.css` plus the layout shell in `admin/src/boot-shell.js`: make the shell a full-height flex container and the nav `position: sticky; height: 100vh` inside it, so the navy rail runs the length of the document instead of stopping at the window edge. Measured today: the shell renders 900px tall on a 2,641px Library and a 12,040px Design system.
- **Header buttons clear the chip (F4)** — `admin/src/ui/page-header.ts`: the eyebrow slot reserves its height when empty, and the header gets a min-height. Today the chip occupies y 12 to 52 and the action lands at y 48 to 96 on any page without an eyebrow (Past 1:1s, Library).
- **The wizard gets the screen (F13)** — the flow stages drop the left nav and centre their column, the way the guest lane already does. Compare `customer-guest-new` (centred, no sidebar) with `customer-manager-new` (column at 556 to 1132px of 1440, 308px dead gutter).

## Not in this phase
- A right rail on the list pages. Parked: Carl chose the cheaper half of F13.
- The empty lower half of Home, Team and Members. Same reason.
- Any change to what the wizard steps are called — the two vocabularies (guest vs manager) are in the Phase 7 sweep.

## Done when
- [ ] On Library, the nav element's measured height equals the document height, not the window height (read from `getBoundingClientRect`, both numbers recorded)
- [ ] On Past 1:1s and Library, the action button's box no longer overlaps the account chip's box (both boxes recorded)
- [ ] On `/new` signed in, the content column is centred in the viewport and no sidebar is present
- [ ] Screenshots of Library scrolled to the bottom, Past 1:1s header, and `/new` signed in
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

1. **Nav goes all the way down** — `local > admin (audit.admin) > Library`, scroll to the very bottom. The navy rail should still be beside the content. ❌ Not OK if it stops partway and leaves a white strip.
2. **Same on the longest page** — `local > admin > Design system`, scroll to the bottom. Same result.
3. **Start 1:1 is not clipped** — `local > customer (audit.manager) > Past 1:1s`. The "Start 1:1" button top-right should sit fully on screen, clear of your email chip. ❌ Not OK if its top edge is cut or it sits under the chip.
4. **Archived is not hidden** — `local > admin > Library`. "Archived (7)" should be fully visible, not tucked behind the chip.
5. **A 1:1 has the screen to itself** — `local > customer (audit.manager) > Start 1:1`. The left nav should be gone and the question should sit in the middle of the screen. ❌ Not OK if the sidebar is still there or the column hugs the left.
6. **You can still get out** — from inside that wizard, "Discard" should still take you back to Home. Losing the nav must not trap you.

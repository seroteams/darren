# Phase 2 — Shell and layout

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## ⚠️ Re-scoped before building — two of the three findings did not survive a second look

Before writing any code the three findings were re-measured. Only one held as written. Carl's call needed on the reduced phase.

**F3 (sidebar stops halfway down long pages) is RETRACTED. It is not a bug.**
`.app-nav` is `position: fixed; top:0; bottom:0`, so it is pinned to the viewport and correct. Scrolled 1,741px down Library and 11,120px down Design system, `document.elementFromPoint(20, viewportMiddle)` and `(20, viewportBottom - 30)` both land inside `.app-nav`. Screenshots: `audits/full-app-audit-2026-07-25/p2-check/scrolled-bottom-*.png` (viewport captures, not full-page).
Two mistakes made it into the audit. First, the original evidence was a `fullPage: true` screenshot, and a fixed element paints once at its viewport position in a stitched capture, so it *looks* like it stops after one screen. Second, the follow-up "verification" measured the wrong element: the selector `nav, [class*=app-nav], aside` matched the shell wrapper (`h-full bg-bg text-ink has-app-nav`), and its 900px height was read as proof of the bug when 900px is exactly right for a viewport-fixed rail.

**F13's reasoning was WRONG; the approved change still stands for a different reason.**
The manager's intake column is not off centre. Measured: viewport 1440, nav 248, so the content area is 1192 wide; the column runs 556→1132 (576 wide) and 248 + (1192 − 576)/2 = 556. It is centred in its space to the pixel. The "308px dead gutter" was the correct right margin, not a defect.
What is still true: the guest lane drops the rail so a 1:1 gets the whole 1440 (column 432→1008, gutters 432/432), and the signed-in version keeps it, so two navigations compete during a focused task. That is the change Carl approved, and it is worth making. It is a design call, not a bug fix.

**F4 is REAL, but the cause in the audit was wrong.**
Confirmed by paint, not geometry: on Past 1:1s, `document.elementFromPoint` at the action button's top-left corner returns `DIV.profile-badge profile-badge--menu`. The badge is `position: fixed; top: 12px; right: 12px; z-index: 30`, box y 12→52.
The real mechanism is the **lede line**, not the eyebrow (there is no `.page-header__eyebrow` element on any of these screens):

| Screen | Lede? | Header height | Actions row | Collides? |
|---|---|---|---|---|
| Past 1:1s | no | 48px | y 48→96 | **yes** |
| Team | yes | 99px | y 74→121 | no |
| Home | yes | 99px | y 74→121 | no |
| Members | yes | 99px | y 74→121 | no |

The actions are vertically centred in the header (48 + (99−48)/2 = 73.5 ✓). With no lede the header collapses to 48px, so the actions centre at y 48 and slide under the badge.

## Changes (pending Carl's nod on the reduced scope)
- **Header buttons clear the badge (F4)** — `admin/src/ui/page-header.ts`: a `min-height` on the header so the actions row centres clear of the badge's 52px band whether or not the screen has a lede. One rule, and it fixes every future screen that ships without a lede.
- **The wizard gets the screen (F13, as a design call)** — the flow stages drop the left rail and let the column centre across the full width, the way the guest lane already does.

## Not in this phase
- A right rail on the list pages. Parked: Carl chose the cheaper half of F13.
- The empty lower half of Home, Team and Members. Same reason.
- Any change to what the wizard steps are called — the two vocabularies (guest vs manager) are in the Phase 7 sweep.

## Done when
- [ ] On Past 1:1s, `document.elementFromPoint` at the action button's top-left corner returns the action, not the profile badge (the before/after values recorded)
- [ ] The same holds on a screen that has a lede, so nothing regressed
- [ ] On `/new` signed in, no rail is present and the column is centred across the full viewport (numbers recorded, guest and manager compared)
- [ ] Discard still returns you to Home from inside the wizard
- [ ] Screenshots of the Past 1:1s header and `/new` signed in
- [ ] `npm test`, `npm run typecheck`, `lint:copy`, `lint:tokens` all still green
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

1. **Start 1:1 is not tucked under your email** — `local > customer (audit.manager) > Past 1:1s`. Click the "Start 1:1" button top-right, aiming at its top edge. It should respond. ❌ Not OK if the click opens your account menu instead.
2. **Nothing moved on the screens that were fine** — `local > customer (audit.manager) > Team`, then Home, then Members. Each header should look exactly as it does today.
3. **A 1:1 has the screen to itself** — `local > customer (audit.manager) > Start 1:1`. The left rail should be gone and the question should sit in the middle of the screen.
4. **You can still get out** — from inside that wizard, "Discard" should still take you back to Home. Losing the rail must not trap you.
5. **The guest lane is unchanged** — log out and start a guest run. It should look exactly as it does today, since it already worked this way.

# Phase 2 — Shell and layout

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, waiting on Carl's walk

## ⚠️ Re-scoped before building — two of the three findings did not survive a second look

Before writing any code the three findings were re-measured. Only one held as written. Carl's call needed on the reduced phase.

**F3 (sidebar stops halfway down long pages) is RETRACTED. It is not a bug.**
`.app-nav` is `position: fixed; top:0; bottom:0`, so it is pinned to the viewport and correct. Scrolled 1,741px down Library and 11,120px down Design system, `document.elementFromPoint(20, viewportMiddle)` and `(20, viewportBottom - 30)` both land inside `.app-nav`. Screenshots: `audits/full-app-audit-2026-07-25/p2-check/scrolled-bottom-*.png` (viewport captures, not full-page).
Two mistakes made it into the audit. First, the original evidence was a `fullPage: true` screenshot, and a fixed element paints once at its viewport position in a stitched capture, so it *looks* like it stops after one screen. Second, the follow-up "verification" measured the wrong element: the selector `nav, [class*=app-nav], aside` matched the shell wrapper (`h-full bg-bg text-ink has-app-nav`), and its 900px height was read as proof of the bug when 900px is exactly right for a viewport-fixed rail.

**F13's reasoning was WRONG; the approved change still stands for a different reason.**
The manager's intake column is not off centre. Measured: viewport 1440, nav 248, so the content area is 1192 wide; the column runs 556→1132 (576 wide) and 248 + (1192 − 576)/2 = 556. It is centred in its space to the pixel. The "308px dead gutter" was the correct right margin, not a defect.
What is still true: the guest lane drops the rail so a 1:1 gets the whole 1440 (column 432→1008, gutters 432/432), and the signed-in version keeps it, so two navigations compete during a focused task. That is the change Carl approved, and it is worth making. It is a design call, not a bug fix.

**F4 is REAL, but the cause in the audit was wrong — and the re-scope named the wrong cause too.**
Confirmed by paint, not geometry: on Past 1:1s, `document.elementFromPoint` at the action button's top-left corner returns `DIV.profile-badge profile-badge--menu`. The badge is `position: fixed; top: 12px; right: 12px; z-index: 30`, box y 12→52.

The mechanism is the **eyebrow**, not the lede. The re-scope looked for a `.page-header__eyebrow` element and found none; the class is actually `.page-header__step`, and it is present on every screen that does NOT collide. Re-measured live (1440×900, signed-in manager, customer app):

| Screen | Eyebrow | Lede | Header | Actions row | elementFromPoint at the button's top corners |
|---|---|---|---|---|---|
| Past 1:1s | no | no | y 48, 47px | y 48→95 | **`DIV.profile-badge`** |
| Team | "Work" | yes | y 48, 98px | y 74→121 | `BUTTON.btn.js-add` |
| Members | "Account" | yes | y 48, 99px | y 74→121 | `BUTTON.btn.js-invite` |

The eyebrow sits ABOVE the title row (22px + a 4px gap = 26), so it pushes the actions to y 74, clear of the badge's 52px band. The lede sits BELOW the row and cannot move it: a `min-height` on `.page-header` would have grown the header downwards and left the button exactly where it was. The fix reserves the eyebrow's own band instead.

Two measuring notes for whoever verifies this next: the Browser pane runs with `document.hidden = true`, so frames never composite, `requestAnimationFrame` never fires and the stage freezes 12px short of its settled position mid-transition (`.stage-enter` → `.is-in`). Every number above was taken after forcing `.is-in` with transitions off. Do NOT leave a blanket `transition: none` injected: the intake stage's unmount waits on a `transitionend` that then never arrives, and the render chain hangs.

## Changes as built

**Header buttons clear the badge (F4)** — one CSS rule, in `admin/src/styles/design/primitives.css` (the file that owns the `.page-header` primitive; `page-header.ts` only renders markup and needed no change):

```css
@media (min-width: 768px) {
  .page-header:first-child > .page-header__row:first-child { margin-top: var(--sero-space-6); }
}
```

A header that opens with its title row — no eyebrow above it — reserves the eyebrow's band, so its right-hand action starts at y 72 instead of y 48. Scoped to `:first-child` on both sides so it only ever affects a header at the top of a page, and to desktop widths because on a phone the chip lives inside the header strip and the page already starts below it.

**The 1:1 lane gets the screen (F13, a design call)** — the rail is gone for everyone while a 1:1 is being set up or run, not just for guests:
- `frontend/src/router.js` — new `isRailFreeStage`: setup plus every run stage (the screens that carry the run's own topbar).
- `frontend/src/ui/app-nav.js` — the hide guard uses it, so the signed-in carve-out (`!user && isGuestStage`) is gone. The now-dead "keep Start 1:1 lit during the flow" highlight and its `INTAKE` map entry went with it.
- `admin/src/styles/design/app-nav.css` — `body:not(.has-app-nav) { --app-nav-w-now: 0px }`. The session topbar lines up with the rail gutter, so zeroing the variable moves the bar to the true left edge instead of leaving it 248px in. This is also why the guest-only `.session-topbar--guest { left: 0 }` rule and its class toggle in `admin/src/ui/session-topbar.js` are gone: one state now covers both cases.
- Customer app only. The admin app's `app-nav.js` belongs to lane `49a426fe`, and the manager flow lives in the customer app anyway.

### Proof, by paint (1440×900, customer app)

| Check | Before | After |
|---|---|---|
| Past 1:1s, `elementFromPoint` at the Start 1:1 button's top-left / top-right | `DIV.profile-badge` / `DIV.profile-badge` | `BUTTON.btn.js-start` / `BUTTON.btn.js-start` |
| Past 1:1s, button top edge vs badge bottom (52) | y 48 (**under it**) | y 72 (20px clear) |
| Team (has an eyebrow) — the screen that was fine | header y 48 h 98, button y 74, hits the button | header y 48 h 99, button y 74, hits the button |
| Members, Home — the other fine screens | column starts y 48 | column starts y 48 |
| `/new` signed in: rail | present, body padding-left 248px | hidden, padding-left 0 |
| `/new` signed in: column of 1024 in a 1425 client width | x 324 (centred beside the rail) | x 201 (centred in the viewport) |
| `/new` signed in: session topbar left edge | 248px | 0 |
| `/new` as a guest — must be unchanged | no rail, topbar left 0, brand mark shown | no rail, topbar left 0, brand mark shown |
| Discard from inside the wizard | back to Home | back to Home, rail returns |

`npm test` 188/188, `npm run typecheck` clean, `lint:copy` PASS, `lint:tokens` PASS. New regression guard: `frontend/src/ui/app-nav-flow.test.ts` (the stage set, the nav's hide guard, the zeroed gutter, the F4 rule).

⚠️ **Not screenshotted.** The Browser pane never composites frames in this session (nothing to capture), and the Playwright browser profile is held by another chat, so I could not spawn one. Everything above is DOM + `elementFromPoint` evidence from the live app. Carl's walk below is the visual check.

## Not in this phase
- A right rail on the list pages. Parked: Carl chose the cheaper half of F13.
- The empty lower half of Home, Team and Members. Same reason.
- Any change to what the wizard steps are called — the two vocabularies (guest vs manager) are in the Phase 7 sweep.

## Done when
- [x] On Past 1:1s, `document.elementFromPoint` at the action button's top-left corner returns the action, not the profile badge (before/after recorded above)
- [x] The same holds on the screens that were already fine, so nothing regressed
- [x] On `/new` signed in, no rail is present and the column is centred across the full viewport (numbers recorded, guest and manager compared)
- [x] Discard still returns you to Home from inside the wizard
- [ ] ⚠️ Screenshots — not possible in this session (see the note above). Carl's walk is the visual check.
- [x] `npm test`, `npm run typecheck`, `lint:copy`, `lint:tokens` all still green
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

The customer app is already running at `http://localhost:3265` (API on 3261), sitting on the Log in screen. Sign in as `audit.manager@seroteams.com`.

1. **Start 1:1 is not tucked under your email** — `local > customer (audit.manager) > Past 1:1s`. Click the "Start 1:1" button top-right, aiming at its top edge. It should respond. ❌ Not OK if the click opens your account menu instead.
2. **Nothing moved on the screens that were fine** — `local > customer (audit.manager) > Team`, then Home, then Members. Each header should look exactly as it does today.
3. **A 1:1 has the screen to itself** — `local > customer (audit.manager) > Start 1:1`. The left rail should be gone and the question should sit in the middle of the screen.
4. **You can still get out** — from inside that wizard, "Discard" should still take you back to Home. Losing the rail must not trap you.
5. **The guest lane is unchanged** — log out and start a guest run. It should look exactly as it does today, since it already worked this way.

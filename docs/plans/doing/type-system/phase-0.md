# Phase 0 — Font truth and the two floor breaches

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-30 — Carl walked the user list, a briefing and general text; said go (commit 8ba3516b)

## Built (2026-07-30)

Confirmed the font bug on screen before touching it, then fixed it. Full measurements: [proof/p0-font-measurements.md](proof/p0-font-measurements.md).

**What the app was actually doing.** A width probe in the running app: the bundled webfont stack `"Inter Variable", serif` measured **542.11px** — byte-identical to the `serif` control, i.e. it never painted. All 7 `Inter Variable` faces reported `unloaded`. The app's own stack measured **644.61px**, identical to Carl's locally installed `Inter`. So the bundled font downloaded and was discarded on every page load, and the app rendered in whatever Inter the machine happened to have. Without one: `system-ui` at 590.83px, ~8% narrower.

After the fix the app stack and the bundled webfont both measure **644.36px** — the same face, from the bundle.

**Files:**
- `admin/src/styles/design/base.css:19` — `"InterVariable"` → `"Inter Variable"`, with the finding recorded in a comment
- `admin/src/styles/design/tokens.css:283` — same, inside `--type-family-display`'s fallback chain
- `admin/tailwind.config.js:42` — same, in `fontFamily.sans` (Tailwind preflight sets the base face from it)
- `admin/src/styles/design/admin-tables.css:48` — `.um-trend` `0.85em` → `var(--type-body-sm)`; was computing **11.9px** on 37 rows of the user list
- `admin/src/styles/design/briefing.css:84` — `.bullet__mark` `0.65em` → `var(--type-body-sm)`; was computing **10.4px**

Smallest text on `/admin/admin/registered` after: **14px**. Both apps covered — `frontend/src/main.js:10` imports the admin stylesheet and `frontend/tailwind.config.js:11` spreads the admin Tailwind config.

**Offline proof:** `npm test` 217/217, typecheck clean, `lint:tokens` PASS (13 known warnings unchanged), `lint:copy` PASS, zero `InterVariable` references left outside the explanatory comment.

**Not verified by screenshot.** The Browser pane would not composite frames this session and the headless browser was held by another chat, so there is no image. Everything above is a computed-style or layout read from the real running page. The scenarios below are the eye check.

## Goal
Make the app render the font it actually ships, and stop the two places where text renders below the 14px floor.

## Changes
- **Verify first, on screen.** In the Browser pane, read `getComputedStyle(document.body).fontFamily` and `document.fonts.check('16px "Inter Variable"')`. Screenshot a text-heavy screen before touching anything. If the bundled font is already resolving, say so and the rest of this phase is just the two floor fixes.
- `"InterVariable"` → `"Inter Variable"` in three places: `admin/src/styles/design/base.css:19`, `admin/src/styles/design/tokens.css:283` (inside `--type-family-display`'s fallback chain), `admin/tailwind.config.js:42`.
- `admin/src/styles/design/admin-tables.css:105` — `.um-trend { font-size: 0.85em }` renders at 11.9px inside a 14px table. Goes to `var(--type-body-sm)` (14px).
- `admin/src/styles/design/briefing.css:164` — `.bullet__mark { font-size: 0.65em }` renders at 10.4px. Goes to `var(--type-body-sm)` (14px); if the bullet glyph then looks too heavy, shrink the glyph with `line-height` or a smaller mark character, not with `font-size`.

## Not in this phase
- Any token, role or ladder change. The type scale is untouched.
- The guard's px-only blind spot that hid these two. That rule lands in Phase 1.
- The other two `em`-based sizes (`mobile.css`'s `max(1rem, 1em)`) — that one resolves ≥16px, so it is not a floor breach.

## Done when
- [ ] `document.fonts.check('16px "Inter Variable"')` returns `true` in the running app, confirmed in the Browser pane console
- [ ] `grep -rn "InterVariable" admin frontend --exclude-dir=node_modules --exclude-dir=dist` returns nothing
- [ ] No computed `font-size` below 14px on the user table or a briefing bullet, read off the real elements in the Browser pane
- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy` all clean
- [ ] Before/after screenshots of the same screen at the same width, saved to `proof/`
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

**Setup:** `local > Start Sero.bat > localhost:3000 > Dev login: Manager`

1. **The text still reads properly** — go to **Team** (the people list). Look at the body text and the names. You should see text that looks normal and evenly spaced. ❌ Not OK if letters look cramped, or a name that used to fit on one line now wraps.
2. **The small trend numbers are readable** — on the **Team** list, find the little up/down trend figure next to a person. You should be able to read it comfortably at the same size as the rest of the row. ❌ Not OK if it is noticeably smaller than the text beside it.
3. **Briefing bullets look right** — open a prep **Briefing** with bullet points. The bullet marks should sit neatly against their text. ❌ Not OK if a bullet dot is now huge, or the lines have gone lopsided.
4. **Nothing else moved** — compare the two screenshots I'll put in the chat. They should look near-identical apart from very slightly different letter shapes. ❌ Not OK if a heading has changed size or a layout has shifted.

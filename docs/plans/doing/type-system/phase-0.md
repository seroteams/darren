# Phase 0 — Font truth and the two floor breaches

**Part of:** [plan.md](plan.md) · **Status:** ⬜

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

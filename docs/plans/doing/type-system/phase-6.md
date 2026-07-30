# Phase 6 — Lock it

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Make it impossible to drift back, and bring the three surfaces a stylesheet sweep cannot reach into line.

## Changes
- **Flip every guard rule from warning to error** in `scripts/lint-design-tokens.js` and delete their ceilings from `scripts/test-design-guard.js`. The headline rule: `font-size`, `line-height`, `font-weight`, `letter-spacing`, `font-family`, `text-transform`, `font-variant-numeric` and `font` may appear **only** in `design/tokens.css` and `design/type.css`. Anywhere else in `admin/src` or `frontend/src` fails the build. `literalRadius: 53` and `offGridSpacing: 135` are left alone — not this request.
- **`DESIGN.md` §3** — replace the bespoke T1–T9 ladder with the adopted system and the fourteen roles. Delete the "Known drift (2026-07-26, reported not fixed)" note; it is fixed. Record the parked gallery exemption in §6.
- **`admin/src/stages/design.js`** — the in-app design system sheet. It is guard-allowlisted, so it can drift silently. Update it to show the seven rungs and the fourteen roles.
- **`admin/src/ui/recap-pdf.ts`** — 18 hardcoded pdfmake sizes (8, 8.5, 9, 9.5, 10, 10.5, 15, 20) plus `lineHeight` 1.12/1.4 and `characterSpacing` used as pseudo-tracking. pdfmake cannot read CSS variables, so this is a hand-remap to a documented print ladder derived from the roles. Only three static font files exist (`inter-regular`, `inter-bold`, `bricolage-semibold`) — generate a fourth only if a weight-500 role must appear in the PDF.
- **`backend/api/services/notifications/email-layout.ts`** — a fourth, undiscovered type system: `font-size` 11px (an eyebrow, below the floor), 12, 14, 15, 22, 23px, inline hex colours, `letter-spacing: 0.08em`. Outside the guard's scan path entirely. Generate a constants file from the role table and add a test asserting the email sizes match.
- **`admin/src/ui/account-sheet.ts`** (6 sites) and **`admin/src/ui/profile-badge.js`** (1) — `font-size` inside template-literal `<style>` blocks. They take role classes.

## Not in this phase
- Radius and spacing. Different request, ceilings untouched.
- The five gallery prototypes in `admin/src/stages/tests/*.js` — permanently parked with a narrow exemption.

## The headline invariant was unmeasurable as written (2026-07-31)
"`font-size` appears in exactly two files" cannot be reached, and the recon proved why: **`tokens.css` contains zero occurrences of the string `font-size`** (it defines `--type-size-*` but never uses the property), while about seventeen files legitimately still match — five test files that assert on the string, `design.js`, the eight parked gallery files, `orb.css`, `app-nav.css`, and two where it appears only in a comment. A grep would fail forever on a plan that was actually finished.

**The invariant is therefore the guard's own rule, not a grep:** `type-property-outside-type-layer` reports zero, with the exemption list stating exactly which files are excluded and why. That is checkable, honest, and survives a comment being reworded.

Two rules also cannot reach zero and must be waived explicitly rather than chased:
- **`literalFontSize`** — `design/mobile.css:298` is `font-size: max(1rem, 1em)`, the iOS focus-zoom guard. There is no token form; the linter's own `max()` branch exists to keep it green. It needs a `lint-tokens-ignore` with a reason.
- **`relativeFontSize`** — `test-engine.css:16` and `ux-audit-fixes.css:26` hold one each and are in no phase file. Either pull them into Phase 3's widened scope or waive them here with a reason.

## Done when
- [ ] `npm run lint:tokens` reports **zero** for `type-property-outside-type-layer`, with every exemption listed and reasoned in the linter header
- [ ] Every new guard rule is an error at zero; `npm run lint:tokens` passes with no warnings
- [ ] A generated recap PDF and a sent email both match the role table
- [ ] `DESIGN.md` §3 describes what the code actually does
- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy` clean
- [ ] Screenshots + one PDF + one email saved to `proof/`
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
**Setup:** `local > Start Sero.bat > localhost:3000 > Dev login: Manager`

1. **The recap PDF** — finish a run and download the recap PDF. Headings, body text and labels should look like a printed version of the app, not a different document. ❌ Not OK if the PDF text is tiny, or if a heading is barely bigger than the body.
2. **An email** — trigger a notification email to yourself. Open it on your phone. Every line should be readable without zooming. ❌ Not OK if the little uppercase heading at the top is too small to read.
3. **The design sheet** — go to the internal **Design** page. It should show the ladder and the roles that the app actually uses. ❌ Not OK if it shows sizes you cannot find anywhere in the app.
4. **Your account menu** — click your avatar, open the account panel. Text sizes match the rest of the app. ❌ Not OK if anything in there looks off-size.
5. **The whole tour** — walk Sign in → Welcome → Team → a person → a run → recap. It should read as one product. ❌ Not OK if any screen still feels like it came from a different app.

# Type system — one standard ladder, everywhere

**Goal:** Every piece of text in both apps takes its size, spacing and weight from one of fourteen named roles, so the app reads like one product instead of seventeen different font sizes.
**Driver:** Carl
**Created:** 2026-07-30
**Mockup:** https://claude.ai/code/artifact/401c7c5c-b460-4711-a8d1-f2f27147abb3 — _awaiting approval_ (source: `reference/type-specimen.html`)

## Done means
- Nothing on any screen renders at 15px or 17px again. The near-duplicate sizes are gone.
- Reading text everywhere is 16px and breaks at a comfortable line length instead of running the full panel width.
- One heading ladder across the admin console and the customer app: hero 36, page title 30, section 24, card 20.
- The app renders the font it actually ships. Right now customers without Inter installed are seeing Windows' default face.
- `font-size` exists in exactly two files in the whole repo. Anywhere else fails the build.

## Resolved before we start
Dug out of the code so the phases don't stall:

- **The font name is wrong.** The bundled font registers as `'Inter Variable'` (with a space); the app asks for `"InterVariable"` in three places. Carl has Inter installed locally so he sees it; customers get Segoe UI. Not yet confirmed on screen — that is the first act of Phase 0.
- **Two live sub-14px breaches** the guard cannot see because its check is px-only: `.um-trend` at `0.85em` (11.9px in a 14px table) and `.bullet__mark` at `0.65em` (10.4px).
- **The scale is Tailwind's, already installed.** Read from `tailwindcss/defaultTheme`: 14/20, 16/24, 18/28, 20/28, 24/32, 30/36, 36/40. Every line-height lands on Sero's existing 4px spacing grid. The 12px step is deliberately not defined — 14px is the floor.
- **The top rung is 36px, not 40.** Tailwind's ramp has no 40. Carl picked 40 for the hero before the system was chosen; adopting the standard means the hero is 36. Flagged for his call at mockup sign-off.
- **461 selectors declare type, but only ~40 need a human decision.** The rest classify mechanically from the tuple they already declare (size + weight + tracking + transform + family). A throwaway script proposes the mapping and prints the unclassifiable ones for review.
- **Markup is 75% component-class-driven** (803 component uses vs 261 semantic-class uses), so the migration groups component selectors onto role recipes rather than editing 803 markup sites. The pattern is already proven twice in this repo — `base.css:131` puts ten chip families on one recipe, `:188` does three segmented controls.
- **Two tests hard-fail on any token rename:** `frontend/src/stages/preparation-css.test.ts` (closed token allowlist, fails on `clamp()`, still lists three tokens that no longer exist) and `admin/src/styles/design/chip-system.test.ts` (its regex points at `base.css`).
- **Four surfaces a stylesheet sweep cannot reach:** `admin/src/ui/recap-pdf.ts` (18 hardcoded pdfmake sizes, only 3 static font files), `backend/api/services/notifications/email-layout.ts` (an undiscovered fourth type system with an 11px eyebrow), and two template-literal `<style>` blocks in `admin/src/ui/`.
- **Lane collision ahead.** Phases 3 and 4 touch `admin/src/styles/feedback-inbox.css` and `frontend/src/stages/preparation.css`, both claimed by session `080b9104` (brief star rating). Surface it to Carl when we reach those phases; do not edit through.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 0 | Font truth + floor breaches | The app renders the font it ships; no text below 14px | ✅ |
| 1 | Build the three layers | Scale, fourteen roles and the type layer exist; nothing consumes them yet | 🔨 |
| 2 | The Meeting screen | Carl's screenshot: five sizes become three | ⬜ |
| 3 | The 14px stratum | ~150 chrome, table and label selectors take a role | ⬜ |
| 4 | Reading surfaces | 15px and 17px die; prose gets a real line length | ⬜ |
| 5 | Headings + markup sweep | One heading ladder; old tokens and aliases deleted | ⬜ |
| 6 | Lock it | Guard rules become errors; PDF and email brought in line | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 0 ✅ green-lit 2026-07-30** (commit `8ba3516b`). Carl approved the specimen mockup first (his "A" on the 36px hero), then walked the user list, a briefing and general text after the build.

What landed: the app now renders the Inter it actually ships. Measured in the running app before touching anything — the bundled webfont stack rendered byte-identical to the `serif` control, all 7 faces `unloaded`, while the app's stack matched Carl's locally installed Inter. So the webfont downloaded and was discarded every page load, and anyone without Inter installed read Sero in Segoe UI, ~8% narrower. Plus two floor breaches the px-only guard could not see: `.um-trend` at `0.85em` computed to 11.9px on 37 rows, `.bullet__mark` at `0.65em` to 10.4px.

Not verified by screenshot — the Browser pane would not composite this session and the headless browser was held by another chat. Every number is a computed-style or width-probe read from the live page: [proof/p0-font-measurements.md](proof/p0-font-measurements.md). Carl's eye was the visual check.

**Baseline (free checks only — this plan needs no paid run):** `npm test` 216/216 before, 217/217 after; typecheck clean; `lint:tokens` PASS with 13 known warnings; `lint:copy` PASS.

**Next: Phase 1** — build the three layers additively. Deliberately invisible; the test is that nothing moved.

**Board:** https://claude.ai/code/artifact/189fce23-69c4-437f-9121-6417d8926f7f (regenerated at every phase-close via `node scripts/plan-board.js type-system`)

Full research and rationale: `C:\Users\User\.claude\plans\compare-these-two-screens-wise-tarjan.md`.

## Parked
- Radius and spacing normalisation. The guard's `literalRadius: 53` and `offGridSpacing: 135` ceilings are untouched by this plan — different request.
- The five gallery prototypes in `admin/src/stages/tests/*.js` (123 font-sizes). No customer sees them; they get a narrow exemption and stay as they are.
- `--type-family-display`'s optical-size and width axes. Both fonts ship `opsz` and `wdth` axes that are not imported. Possible refinement later, not now.
- Restoring a 40px top rung if Carl wants the hero back at 40 — one line, documented as a deliberate deviation from the standard scale.

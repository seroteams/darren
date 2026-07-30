# Type system — one standard ladder, everywhere

**Goal:** Every piece of text in both apps takes its size, spacing and weight from one of fourteen named roles, so the app reads like one product instead of seventeen different font sizes.
**Driver:** Carl
**Created:** 2026-07-30
**Mockup:** https://claude.ai/code/artifact/401c7c5c-b460-4711-a8d1-f2f27147abb3 — approved 2026-07-30 (Carl's "A": Tailwind scale, 30px titles, 36px hero). Source: `reference/type-specimen.html`

## How this plan runs (changed 2026-07-30)
Carl: _"as this is a frontend, can you keep going?"_ then _"lets go!"_ — so **the one-phase-then-stop gate is lifted from Phase 2 onward**. Phases run back to back and close on evidence in the chat rather than on a walk. **Phases 0 and 1 were walked and green-lit by Carl. Phase 2 onward is closed unwalked**, recorded as such in each phase file with its measured proof, so the record never implies he saw something he did not. Anything genuinely ambiguous or irreversible still stops and asks.

**One thing waiting for his eyes, not blocking:** Phase 2 changed the "Lock in what you two agreed" promises card, because it renders the same `.question-stem` class. It went from 36px Inter bold to 30px Bricolage semibold, and it ships to the **customer app** as well as admin. Correct by the system (one class, one look) but outside phase-2.md's stated scope, so it is flagged rather than buried.

## Done means
- Nothing on any screen renders at 15px or 17px again. The near-duplicate sizes are gone.
- Reading text everywhere is 16px and breaks at a comfortable line length instead of running the full panel width.
- One heading ladder across the admin console and the customer app: hero 36, page title 30, section 24, card 20.
- The app renders the font it actually ships. Right now customers without Inter installed are seeing Windows' default face.
- ~~`font-size` exists in exactly two files in the whole repo.~~ **Unmeasurable as written, replaced in P6.**
  `tokens.css` contains the string zero times and about seventeen files match it legitimately
  for ever (test files asserting ON it, the parked gallery, two comments), so the floor for that
  grep is ~17. The invariant is now the guard's own `type-property-outside-type-layer` rule,
  which reads declarations rather than text. It reports **164** and is frozen there; the nine
  other type rules ARE errors at zero, so anywhere else genuinely does fail the build.

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
| 1 | Build the three layers | Scale, fourteen roles and the type layer exist; nothing consumes them yet | ✅ |
| 2 | The Meeting screen | Carl's screenshot: five sizes become three | ✅ unwalked |
| 3 | The 14px stratum | ~300 chrome, table and label selectors take a role | ✅ unwalked |
| 4 | Reading surfaces | 15px and 17px die; prose gets a real line length | ✅ unwalked |
| 5 | Headings + markup sweep | One heading ladder; old tokens and aliases deleted | ✅ unwalked |
| 6 | Lock it | Guard rules are errors at zero; PDF and email brought in line | ✅ unwalked |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state — ALL SEVEN PHASES DONE (2026-07-31)

Phases 0 and 1 were walked and green-lit by Carl. Phases 2 to 6 are **closed unwalked** on his
"as this is a frontend, can you keep going?" then "lets go!", each with measured proof in its own
file. Commits: `8ba3516b` · `fa8b0762` · `29b9d29f` · `b662b101` · `a0543bd2` · `af1eea22` and the
P4/P5/P6 chain · `ca5a3109`.

**What the app looks like now**

| | Before | After |
|---|---|---|
| Distinct rendered text sizes | ~17 | **7**, enforced |
| Sizes off the ladder | 28 | **0**, a build error |
| Sizes written as literals | 18 | **0**, a build error |
| Sizes pointing at an old token | 451 | **0**, a build error |
| Fluid sizes with an off-rung endpoint | 12 | **0**, a build error |
| Bricolage below 20px (T6) | 7 | **0**, a build error |
| Font stacks written out by hand | 8 | **0**, a build error |
| `var()` references that resolve to nothing | 3 | **0**, a build error |
| Text below the 14px floor | 2 live, invisible to the guard | **0**, unit-aware error |

Nine rules, all at zero, all errors. Every size in both apps is one of seven rungs, each welded to
a leading on the 4px grid.

**Four things found on the way that were nothing to do with type**

- The bundled Inter **never painted**, on any page load, for anyone. The app asked for a font name
  that does not exist. Carl saw Inter only because he has it installed; customers read Sero in
  Segoe UI, about 8% narrower, so their line breaks never matched his.
- The coach panel's reading-width cap **never applied** — 62ch at 17px is 664px inside a 560px
  column, so the cap was wider than the box. That is most of why the Meeting screen read badly.
- `.btn`, the app's primary control, rendered 16px text on a 24.8px line box on **every screen**,
  because it took a size without its leading and fell back to body's 1.55 ratio.
- The email shell was a **fourth type system nobody had ever checked**: `backend/` was outside the
  guard's scan path entirely, and three of its sizes were below the 14px floor. It shipped to real
  managers like that.

**What is left, honestly**

- **`type-property-outside-type-layer` reports 164, not zero.** No `font-size` in it is off the
  ladder: it is weights, leadings and cases still declared in component sheets rather than routed
  through a role. Sixteen of those sheets were named in no phase file of this plan. Clearing them
  is a **Phase 5b sweep** that changes sizes on screens someone has to look at first.
- **That ceiling rose, 142 to 164**, which this plan otherwise forbids. Completing 25 half-declared
  size/leading pairs is a visible fix and costs +1 each on a counter that counts declarations. The
  counter was deliberately not redefined to hide it. Reversible, and Carl's to overrule.
- **Reading measure.** Prose is capped at `--measure-read: 60ch`, which sets as roughly 74 to 82
  real characters. DESIGN.md T5 says 66, with 75 as the absolute maximum. It is far better than the
  full-panel-width it replaced, but it is over the written spec and narrowing it is a look-at-it
  decision, not an arithmetic one.
- **The phone heading collision.** Four display-face heading roles, three rungs a phone may legally
  use, so exactly one adjacent pair must share a size. It was moved to `.h3`/`.h4` (15 and 6 uses,
  rarely adjacent) instead of `.h2`/`.h3` (together on almost every admin screen). One rule to move
  it back.
- **The promises card** changed look, on the customer app as well as admin, because it shares the
  question-stem class. Correct by the system, outside phase 2's stated scope.

## Parked
- **Phase 5b: the last 164.** Weights, leadings and cases still declared in component sheets rather than routed through a role, across ~30 sheets, sixteen of which this plan never named. It changes sizes on real screens, so it wants eyes before it is swept. Doing it takes the ceiling down past 142 and lets that rule flip to an error too.
- **The reading measure vs DESIGN.md T5.** Prose sets at roughly 74 to 82 real characters against T5's 66 (75 absolute). Narrowing is one token.
- **The phone heading collision.** Four display roles into three legal phone rungs; one adjacent pair must share a size. Currently h3/h4. One rule to move it.
- Radius and spacing normalisation. The guard's `literalRadius: 53` and `offGridSpacing: 135` ceilings are untouched by this plan — different request.
- The five gallery prototypes in `admin/src/stages/tests/*.js` (123 font-sizes). No customer sees them; they get a narrow exemption and stay as they are.
- `--type-family-display`'s optical-size and width axes. Both fonts ship `opsz` and `wdth` axes that are not imported. Possible refinement later, not now.
- Restoring a 40px top rung if Carl wants the hero back at 40 — one line, documented as a deliberate deviation from the standard scale.

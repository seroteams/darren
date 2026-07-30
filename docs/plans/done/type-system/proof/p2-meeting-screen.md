# Phase 2 proof — the Meeting screen, five sizes to three

Measured in the live dev build (`type-web`, localhost:3943, admin app) on 2026-07-30.
No screenshot: the Browser pane will not composite frames in this environment, so every
number is a `getComputedStyle` or `getBoundingClientRect` read from elements the app
actually rendered. The screen was reached by importing the app's own
`admin/src/stages/questioning.js` and calling its real `mount()` with one stubbed fetch,
so the real stage module, the real `createCoachPanel`, the real markup and the real
Vite-served cascade were all in play. No OpenAI call was made.

## The census: exactly three sizes

Every descendant of `.cp-screen` owning a non-empty text node was walked, skipping
`display:none` and `visibility:hidden`, and its computed size collected.

| Screen | Distinct sizes |
|---|---|
| Support tab | **14, 16, 30** |
| Live scores tab | **14, 16, 30** |
| Phone, 390px | **14, 16, 20** |

Before: **32 / 17 / 16 / 15 / 14**. After: **30 / 16 / 14**.

- **30px:** `.question-stem`, alone.
- **16px:** `.question-desc`, `.coach-hint__text`, `.coach-row__why`, `.textarea--question`, the buttons.
- **14px:** `.cp-head__turn`, ctx segments, `.cp-seg`, `.cp-privacy`, `.coach-source`, `.coach-pill`, `.coach-row__label`, `.coach-row__delta`, `.coach-meter__thumb`, `.field-live-label__text`.

`admin/src/styles/coach-panel.css` now contains **zero** `font-size`, `line-height`,
`font-weight`, `letter-spacing`, `font-family`, `text-transform` and `font-variant-numeric`
declarations. Its selectors were grouped onto roles inside `design/type.css`, the pattern
`base.css:131` already uses for ten chip families.

## The cascade, proven rather than reasoned

Injected sheet order on the running screen: `0 inter, 1 bricolage, 2 tailwind.css,
3 design.css (type.css flattened inside it), 4 stage-exit.css, 5 inline, 6 admin-pulse.css,
7 coach-panel.css`. **coach-panel.css is last**, so it beats `type.css` at equal specificity.
That is exactly why it had to end up declaring nothing: the grouped-selector approach is only
safe when the component sheet is silent. Walking coach-panel.css's 55 CSSOM rules for any
type property returned zero.

## The measure: why 62ch never bit

The old cap was `max-width: 62ch` at 17px, which is 664.9px. The column is 560px. **The cap
was wider than the column, so it never applied** and the coaching text ran the full panel
width. That is the thing Carl was looking at.

46ch is the first measure narrower than the column. Measured two ways on the real element:

- **By definition:** box 464.31px / 10.094px per `0` = **46.0ch exactly**.
- **By real prose,** walking each character's rect with a `Range` to find true line breaks:
  a 106-character hint sets as **59 and 46 characters**; a 158-character line sets as 3 lines
  of 58, 58 and the remainder.

`ch` is the width of a zero, and real prose is narrower per character, so **46ch reads as
roughly 58 characters**. The phase file's original "breaks at ~46 characters" was wrong as
written and has been corrected.

## Label and delta: told apart without differing in size

Both are 14px / 600 / Inter. They separate by ink and by position (334px of gap, the row is
`justify-content: space-between`). Contrast against the coach half's real background
`rgb(253,254,254)`:

| Element | Ink | Ratio |
|---|---|---|
| `.coach-row__label` | `#1f2a37` | **14.39:1** |
| `.coach-row__delta--flat` | `#636363` | **5.95:1** |
| `.coach-row__delta--up` | `#0c4b3c` | **9.96:1** |
| `.coach-row__delta--down` | `#ac1608` | **7.24:1** |

All four clear AA (4.5:1) at 14px.

## Two regressions the verifiers caught, and the fixes

Three verifiers attacked the build. Zero blockers, three majors. Two were real and are fixed
here; the third is a scope note for Carl.

### 1. The phone stem got BIGGER, not smaller

The deleted `coach-panel.css:200` override read `var(--type-h2)`, and `design/mobile.css:352`
re-points that token to `1.35rem` at phone width with the comment *"22px, question stems fit
beside a keyboard"*. So it computed **21.6px on a phone**, not the 36px it reads at desktop.
Landing the role on the 2xl rung (24/32) was therefore **larger than what it replaced**: a real
stem wrapped to four lines and pushed the answer box 50px further down a 390px screen. That is
precisely the failure the rule exists to prevent, and the one phase-2.md scenario 4 tests.

Fixed by dropping one further rung, to **xl (20/28)**. Measured at the phone breakpoint
(`matchMedia('(max-width: 639.98px)')` true) on the same element:

| | Size | Leading | Lines | Stem box | Answer box top |
|---|---|---|---|---|---|
| Pre-P2 recipe, re-applied inline | 21.6px | 25.92px | 3 | 78px | 213px |
| **After the fix** | **20px** | **28px** | **3** | **84px** | **220px** |

A 7px difference instead of a 50px one, and still on a ladder rung.

### 2. The coach column shrank by 96px

`.cp-col` is `display:flex; align-items:flex-start`, and `coach-panel.css:91` gave
`width: 100%` to `.question-host`, `.thinking-host` and `.footer-host` but **not** to
`.coach-host`, which has no CSS rule anywhere in the tree. So it shrink-wrapped to its
max-content, and once the prose took a 46ch cap that max-content became 464px. Every hairline
divider, score row and gradient meter stopped 96px short of its own column, breaking the 50/50
mirror with the question half. It had looked fine only because the old 62ch cap never bit.

Fixed by adding `.coach-host` to the same `width: 100%` rule. This is layout, not type, so it
does not reintroduce a type declaration. Measured after:

| | Width |
|---|---|
| `.cp-col` (the column) | 560px |
| `.coach-host` | **560px** |
| `.coach-hint` (the divider) | **560px** |
| `.coach-hint__text` (the prose) | **464.31px** = 46ch |

Dividers span the column; only the reading text is capped. That is the intended shape.

### 3. The promises card also changed, and it ships to customers

`.questioning-card .question-stem` was moved with its twin, as phase-2.md instructed. That
selector is live on the **"Lock in what you two agreed"** promises card via
`admin/src/ui/promise-agree.ts:105`, and `frontend/src/main.js:61` loads the same module, so
the card renders in the **customer app** too. It went from 36px / 45px / weight 700 / Inter to
30px / 36px / weight 600 / Bricolage.

This is correct by the system: one class, one look, which is the entire point. But phase-2.md's
"Not in this phase: any other screen" made it out of the stated scope, so it is called out
rather than buried. **Carl should look at this card on both apps.**

Two further homes of the same class were found and also changed, both internal: the design-system
gallery (`admin/src/stages/design.js:695`) and the promises-loop test page
(`admin/src/stages/tests/promises-loop.js:270`). The gallery's ghost-versus-real height parity,
which is the thing it exists to prove, did not regress.

## Carried forward, not fixed here

Each of these is outside Phase 2's file list and is recorded in the later phase that owns it:

| Finding | Owner |
|---|---|
| `.axis__thumb` is weight 700 while `.coach-meter__thumb` is now 600. The two were deliberately converged after Machar's *"does not match the design from the runner"*, and are now half out of step. | Phase 3 |
| Two 14/16 pairs on the screen differ by size alone, which DESIGN.md T2 forbids: ctx segments vs `.question-desc`, and `.copy-snippet-btn__label` vs `.hint--kbd`. | Phase 3 |
| `.hint--kbd` carries the class `text-xs` and renders at **16px**, the largest of the three sizes. A class that says extra-small must not produce the biggest text on screen. | Phase 3 |
| The header's "Wrap up early" ghost button is 16px/500, the largest thing in the header. The mockup has it at 14px, level with the rest of the header chrome. This is the one place the live screen still reads busier than the mockup, and the cause is the button, not the roles. | Phase 3 |
| `skeleton-presets.ts:264` still says *"the runner's stem is 32px"*. It is 30px. The three-line assumption still holds but the premise is stale. | Phase 3 |
| `mobile.css:352`'s comment describes a job the token no longer does for the stem. The value must stay: other consumers still read it. | Phase 3 or 5 |
| `admin/src/stages/tests/runner-v2.js` still carries the old five-size stack under `rv2-*` names. It is the POC this screen was designed from, so it now shows a design the live screen no longer matches. | Phase 5 |

## Free checks

| Check | Result |
|---|---|
| `npm test` | 219/219 passed |
| `npm run typecheck` | clean |
| `npm run lint:tokens` | PASS |
| `npm run lint:copy` | PASS |
| `node scripts/test-design-guard.js` | ok: fonts **7/7** (was 13), radii 53/53, spacing 135/135, type **534/534** (was 560) across 9 rules |

Ceilings lowered by this phase, re-measured rather than predicted: `nonTokenFont` 13 to 7,
`offLadderFont` 28 to 22, `unsanctionedSizeToken` 451 to 439, `literalFontSize` 18 to 12,
`clampOffRung` 12 to 10.

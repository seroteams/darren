# Phase 5b: what actually changed on screen

Measured 2026-07-31 in the running app: `local > localhost:3943 > admin app` and
`local > localhost:3945 > members app`, both at 1280px unless a row says otherwise.

The Browser pane will not composite frames on this machine, so screenshots time out.
Everything below is a **computed style** read out of the live page instead, which is a
stronger check than a picture: it reads the value the browser actually resolved.

## How before and after were both measured live

A diff cannot tell you what a screen renders. So the 164 removed declarations were
rebuilt, verbatim, into one stylesheet and injected at the END of `<head>` on the running
page. That reproduces exactly what they did before, because a component sheet is what
loaded last then too. For every element on the page the script reads ten computed
properties (`font-size`, `line-height`, `font-weight`, `font-family`, `letter-spacing`,
`text-transform`, `font-variant-numeric`, `font-feature-settings`, `max-width`,
`text-wrap`), injects the sheet, reads them again, and reports every element whose values
differ.

So "nothing changed" below is not an argument. It is 2,013 elements read twice.

---

## THE LIST: everything that moves

Eight things. Nothing changes size, and nothing changes weight.

| # | What you would be looking at | Screen | Before | After |
|---|---|---|---|---|
| 1 | The small denominator inside a Pulse KPI, the "of 1" in "0 of 1" | Pulse dashboard | 18/28, weight 500, **Bricolage** | 18/28, weight 500, **Inter** |
| 2 | The session-context line above the question card | Meeting screen | 16px on a **23.2px** line | 16px on a **24px** line |
| 3 | Recap card paragraphs | Past 1:1 > Recap | 16px on a **24.8px** line | 16px on a **24px** line |
| 4 | The answer text under a past question | Past 1:1 > Answers | 16px on a **24.8px** line | 16px on a **24px** line |
| 5 | The bullet mark beside a briefing "watch out for" line | Briefing | 16px on a **24.8px** line | 16px on a **24px** line |
| 6 | A coaching phrase in the phrase list | Coaching phrases, and the Design system page's list specimen | 16px/500 on a **23.2px** line | 16px/500 on a **24px** line |
| 7 | The verdict pill on the internal compare screen | Compare (internal) | letter-spacing **0.42px** | **0.28px** |
| 8 | The gate pill on the internal build checklist | Checklist (internal) | letter-spacing **0.56px** | **0.28px** |

**Rows 1 to 6 in plain terms.** Row 1 fixes a rule the design system already had:
Bricolage is banned below 20px (DESIGN.md T6), and that denominator was 18px Bricolage
because it inherited the face from the big number above it and never said otherwise. Rows
2 to 6 are all the same thing: five places wrote their line spacing as a RATIO (1.45 or
1.55 times the size) instead of taking the locked pair, so they landed at 23.2px or 24.8px
instead of 24px. Under a pixel each, and now on the 4px grid like everything else.

**Rows 7 and 8** are three caps pills that each kept their own letter-spacing: 0.02em,
0.03em and 0.04em. They are one value now, 0.02em, which is the house tracking the third
one was already using. At 14px the spread was 0.28px per character. This is the same call
Phase 3 made on eighteen eyebrow rivals.

### One more, and it is not a size

Twenty-two selectors joined `.type-body` in this sweep and picked up that role's
`text-wrap: pretty` with it. Inherited, that reaches 67 elements on the Design system page
and 42 on Role words; one or two on most other screens. `pretty` changes only how the LAST
line of a paragraph breaks: it pulls a word down rather than leaving one word alone on a
line. No size, weight, face or spacing changes with it. It was left in rather than
suppressed, because a selector that takes a role's face but refuses its wrapping is exactly
the half-application this whole plan exists to stop.

---

## A defect the measuring found, that the diff hid

`.auth-split .link` (the quiet links on the sign-in and join screens) went to **weight 400
when it should be 600**, and the CSS diff read perfectly clean.

Why: `auth.css` had `font: inherit` on that selector. The `font` shorthand resets
font-weight, it sits in a sheet that loads AFTER `design/type.css`, and it beats a
same-specificity rule there on source order. So moving the weight into the layer silently
disabled it.

Fixed by writing the three properties the link genuinely has to inherit as longhands
(`font-family` / `font-size` / `line-height: inherit`) and leaving the weight to the layer.
Re-measured on a live auth shell: **16/24/600 Inter, before and after**.

This is now written into DESIGN.md as the thing to watch, because the linter cannot see it:
a CSS-wide keyword sets no type value, so `font: inherit` is legally invisible to the rule
while being able to defeat it.

## A claim that was corrected rather than kept

An earlier draft of the comments in `type.css` said that removing `font: inherit` restored
Inter's stylistic sets (ss01/cv11) on the affected buttons. Measured, that was false:
`font: inherit` was inheriting them fine. What actually moves is `font-variant-ligatures`,
from `common-ligatures` to `normal`, and `normal` still uses the font's own default
ligatures, so it renders the same. Every other control in both apps has read `normal` all
along. The comments were rewritten to what was measured.

---

## The screens, read twice each

`changed` counts elements whose computed type differs. `text-wrap` is broken out because it
is the inherited `pretty` above, not a type change.

| Screen | Elements read | Changed (type) | Changed (text-wrap only) |
|---|---|---|---|
| admin > Design system | 2,013 | **4** (row 6) | 67 |
| admin > Design system, **390px phone** | 2,013 | **4** (row 6) | 67 |
| admin > Pulse dashboard | 548 | **1** (row 1) | 1 |
| admin > Team | 369 | 0 | 1 |
| admin > Start 1:1 (intake) | 365 | 0 | 2 |
| admin > Past 1:1s | 350 | 0 | 1 |
| admin > Past 1:1 detail | 405 | 0 | 1 |
| admin > Meeting arcs | 432 | 0 | 0 |
| admin > Meeting arcs, editor open | 519 | 0 | 7 |
| admin > Role words | 377 | 0 | 42 |
| admin > Test engine | 484 | 0 | 1 |
| admin > User management | 1,021 | 0 | 1 |
| admin > User management, row menu open | 1,026 | 0 | 1 |
| admin > Feedback inbox | 762 | 0 | 1 |
| admin > Came back unprompted | 445 | 0 | 1 |
| admin > Tests gallery | 537 | 0 | 1 |
| admin > Guide | 1,018 | 0 | 1 |
| members > Home | 238 | 0 | 1 |
| members > Team | 238 | 0 | 1 |
| members > Person | 267 | 0 | 1 |

## Every button variant, on a real screen

Read on admin > Design system at 1280px. `.btn--md`, `.btn--lg` and `.btn--cta` have **zero
markup callers** in either app today (`ui/button.ts` says so and a grep agrees), so those
three were measured by applying the class by hand to a live `.btn` on that page.

| Variant | Before | After |
|---|---|---|
| `.btn` (10 on the page) | 16px / 24px / 500 / Inter | **same** |
| `.btn--sm` (9 on the page) | 14px / 20px / 500 / Inter, tracking 0.28px | **same** |
| `.btn--ghost` (16 on the page) | 16px / 24px / 500 / Inter | **same** |
| `.btn--danger` (1 on the page) | 16px / 24px / 500 / Inter | **same** |
| `.btn--md` (no callers) | 16px / 24px / 500 / Inter | **same** |
| `.btn--lg` (no callers) | 18px / 28px / 500 / Inter | **same** |
| `.btn--cta` (no callers) | 16px / 24px / 600 / Inter | **same** |

## The Pulse dashboard's KPI numbers, and whether tabular figures survived

| | Before | After |
|---|---|---|
| `.lp-tile__value` (the big number) | 30/36/600 Bricolage, -0.3px, **tabular-nums** | **same** |
| `.lp-den` (its denominator) | 18/28/500 **Bricolage**, tabular-nums | 18/28/500 **Inter**, tabular-nums |
| `.lp-tile__label` | 14/20/500, 0.28px | **same** |
| `.lp-tile__delta`, `.lp-delta` | 14/20 | **same** |
| `.lp-card h3` | 16/24/600 | **same** |

Tabular figures survived everywhere. Twenty selectors gave up
`font-variant-numeric: tabular-nums` in their own sheets and were grouped into
`.num-tabular` in `type.css` instead. Read live and all still `tabular-nums`: the Pulse bar
figures, `.pd-count b`, `.pd-num` and `.pd-stars` on the drill-down tables, `.fb-time` and
`.fb-stars` in the feedback inbox, `.notes-panel__ts`, `.lex-row__num`, `.about-step__n`,
`.cl-num`, `.cl-count`, `.cl-overall__pct`, `.cl-step-no`, `.prep-timeline__num`,
`.focus-point__num`, `.axis__thumb`, `.axis__value`, `.axis__delta`, `.cmp-axis__vals`,
`.cmp-axis__delta`.

## A guided run on the members app

The guided screen needs a live guided session, and creating one through the UI could not be
reached from the seeded data on this machine. Its stylesheet is code-split, so it was
loaded on the running members app and its real classes measured against the real cascade.
That is the live app's cascade with markup built by hand, and it is called out as such
rather than dressed up as a walk.

| | Before | After |
|---|---|---|
| `.gd-q__stem` (the question) | 16/24/600 Inter | **same** |
| `.gd-q__coach` (the coaching line) | 16/24/400 Inter | **same** |
| `.gd-row__chev` (the chevron) | 14/20 | **same** |
| `.gd-row__text`, `.gd-row__pct`, `.gd-row__cat` | 16/24/600 · 14/20/600 · 14/20 | **same** |
| `.gd-stepper .stage-step` (the stepper) | 14px on a 14px flush line | **same** |
| `.gd-block__icon` (the medallion icon) | 16/24 | **same** |
| `.gd-panel__x` (the close cross) | 16/24 | **same** |
| `.gd-panel__title` | 20/28/600 Bricolage | **same** |
| `.gd-q__logo` (the monogram) | 14px flush, weight 700 | **same** |
| `.gd-lastmark::after` (the slider caret) | line-height **9.8px** | **same** |
| `.gd-panel__err` (moved off an inline style, onto a class) | 14/20/400 | **same** |

## The Meeting screen

A live Meeting screen needs an engine run, which is a paid OpenAI call, and this task was
free-checks-only. Its selectors were measured on the running admin app instead, the same
way as the guided ones.

| | Before | After |
|---|---|---|
| `.question-session-ctx` | 16px / **23.2px** | 16px / **24px** |
| `.textarea--question` (the answer box) | 16/24/400 Inter | **same** |
| `.hint` | 16/24/400 Inter | **same** |
| `.meeting-card__label` (the type picker) | 16/24/600 | **same** |
| `.action-when` / `.action-body` | 14/20/500 lowercase · 16/24/400 | **same** |
| `.watch-item__text` | 16/24/400 | **same** |
| `.btn` on that screen | 16/24/500 | **same** |

## Phone, 390px

admin > Design system at 390 x 844. Same four changes as desktop, nothing else. The phone
rungs all held: `.text-display` 30/36, `.type-heading-xl` 24/32, `.h2` 20/28, `.h3` 18/28,
`.btn` 16/24, `.btn--sm` 14/20, `.input` 24/32. No text fell below the 14px floor.

## The other 40-odd selectors, individually

Every remaining selector this sweep touched, read before and after and identical:
`.ds-star` (24px flush), `.ds-rowmenu` (16px flush), `.ds-sub`, `.ds-axes`, `.ds-dl`,
`.ds-dl__row dd` (16/500), `.ds-axis__val`, `.ds-details > summary`, `.ds-alert__icon` and
`.ds-requestcard__icon` (700), `.ds-skdiff--off`, `.ds-avatar`, `.ds-brandbadge`,
`.input` (24/32), `.textarea`, `.bench-select`, `.bench-flow__desc`,
`.js-runlabel-wrap .input`, `.script-state`, `.run-step--active .run-step__label`,
`.joblex-item`, `.joblex-item.is-active`, `.joblex-remove`,
`.joblex-hidden__row .flow-glossary__term`, `.guide-step__title`,
`.guide-ref--text strong`, `.run-log__tree-line--stage` (mono, 500),
`.lp-down`, `.lp-bar__name`, `.lp-bar__n`, `.lp-pill--none`, `.stage-review__q`,
`.stage-review__row-title`, `.stage-review__axis-name`, `.stage-review__num`,
`.lib-progress__count`, `.stage-review__bullets li`, `.stage-review__qlist li`,
`.lookback__band`, `.lookback__what strong`, `.lookback__back`, `.pa-who--them`,
`.pa-who--you`, `.pa-add__plus`, `.start-point__text`, `.intake-firstrun__title`,
`.about-alpha__link`, `.auth-input`, `.join-hero`, `.join-hero strong`,
`.cmp-delta--flat`, `.cmp-delta-sep`, `.cmp-axis__vals`, `.cmp-axis__delta`,
`.cmp-axis--unread .cmp-axis__vals`, `.fp-chip`, `.fp-chip--changed`, `.cl-num`,
`.cl-feat`, `.cl-count`, `.cl-step-no`, `.cl-overall__pct`, `.brutal__badge`,
`.axis__value--baseline`, `.ud-chev` (line-height 0), `.um-menu-btn`, `.um-menu__item`,
`.row-menu-btn` (line-height 0), `.notes-panel__item`, `.notes-panel__ts`,
`.notes-panel__edit`, `.team-card__avatar`, `.tg-card__title`, `.tg-card__ext`,
`.arc-sec`, `.arc-sec__note` (moved off an inline style), `.arc-chip`, `.arc-chip__sep`,
`.arc-edit .textarea`, `.arc-edit .input`, `.pv-e__lead`, `.pv-e__opener`,
`.pv-g__tick span`, `.pv-g__tick b`, `.rd-avatar`, `.rd-name`, `.rd-digest`.

---

## The waivers, five lines in the whole app

Each carries a `lint-tokens-ignore` comment with its reason on the line, and each is named
in the header of `scripts/lint-design-tokens.js` and in DESIGN.md.

| Line | Why it cannot move |
|---|---|
| `design/mobile.css` `font-size: max(1rem, 1em)` | the iOS focus-zoom guard. No token form, and it must not get one. Pre-existing. |
| `ui/account-sheet.ts` `letter-spacing: 3px` | spreads the masked password's bullets. Decoration, not tracking. Pre-existing. |
| `design/admin-tables.css` `letter-spacing: 1px` on `.um-menu-btn` | the same call one glyph over: it spreads the three dots of the row-actions mark. |
| `design/admin-tables.css` `text-transform: capitalize` on `.um-menu__item` | re-cases role names the API returns lower-cased. It rewrites the words rather than sizing them. |
| `design/briefing.css` `text-transform: lowercase` on `.action-when` | re-cases pill labels the model returns capitalised. Same reason. |
| `styles/tailwind.css` `font-weight` on `.link` | must stay inside `@layer components` so a Tailwind utility can still beat it. `design/type.css` is unlayered, so moving it would break the four deliberately quiet links the layer exists to protect. |

That is six rows for five files; `admin-tables.css` holds two.

`uppercase` was deliberately NOT waived. It is a type level the ladder already expresses
(`.type-overline`), so the three caps badges took a new grouped treatment, `.type-caps`,
inside the layer. Narrowing the rule to drop `text-transform` altogether would have taken
`.type-overline`'s own uppercase out of the layer with them.

## The checks, run free

```
node scripts/lint-design-tokens.js --report
  ~ type rules (P5b: all ten are errors):
    [relative-font-size] : 0 (error)         [off-ladder-font] : 0 (error)
    [unsanctioned-size-token] : 0 (error)    [undefined-token] : 0 (error)
    [clamp-off-rung] : 0 (error)             [display-face-below-20] : 0 (error)
    [font-family-literal] : 0 (error)        [font-shorthand-resets-numeric] : 0 (error)
    [literal-font-size] : 0 (error)          [type-property-outside-type-layer] : 0 (error)
  PASS: no hard violations.

node scripts/test-design-guard.js
  design guard ok - 210 files, 0 violations; radii 53/53, spacing 135/135;
  all ten type rules at zero, as errors; copy clean

npm run typecheck   clean
npm test            221/221 passed
npm run lint:copy   PASS - no em dashes in copy
```

### And it bites

A scratch declaration was appended to a real component sheet and the guard re-run:

```
.p5b-scratch-probe { font-weight: 600; }

design guard FAILED
  x 1 hard design-token violation(s):
      admin/src/styles/row-menu.css:54  [type-property-outside-type-layer]  font-weight: 600
  exit 1
```

Removed, and the guard went green again. The probe left no trace: `git diff` on that file
shows only the comment this phase intended.

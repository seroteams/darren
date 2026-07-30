# Phase 4 — Reading surfaces

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Kill 15px and 17px from the product, put every reading block at 16px, and give prose a real line length. This is the phase Carl will actually see the quality change in.

## Changes
- **`admin/src/styles/design/briefing.css`**, **`stage-extras.css`**, **`about-stage.css`**, **`promise-agree.css`**, **`design/run-detail.css`**, **`meeting-arcs.css`**, **`member-home.css`** — prose selectors take `body` + the 66ch measure; ledes take `body-lg` + 72ch.
- **`frontend/src/stages/guided/guided.css`** — its 28 prose selectors. This sheet holds 16 of the ~40 hand decisions.
- **`frontend/src/stages/preparation.css`** and **`preparation-lab.css`** — the nine confidence-readout selectors currently render the same thing at 18 / 16 / 14px across eight layout variants. All become `label`.
- **The ~40 hand decisions** from the migrate script's review table. Each gets a prose / chrome / glyph / numeric column in the review table before anything is written. **Never sed this set:** in `guided.css`, `.gd-row__chev` is a glyph and `.gd-row__pct` and `.gd-q__n` are numbers — those go *down* to 14 — while `.gd-q__coach`, `.gd-sum li`, `.gd-rec__block li` and `.gd-sugg__row` are prose and go *up* to 16.
- The question stem's other four homes (`guided.css`, `buttons-inputs.css`, `meeting-arcs.css`, `finish-feedback-modal.css`, `run-detail.css`) currently render the same object at 28 → 16 → 15 → 14px depending on surface. They take `heading-xl` or `heading-xs` by context, and stop being four different things.

**Lane collision:** `frontend/src/stages/preparation.css` is claimed by session `080b9104`. Surface it to Carl before starting; do not edit through it.

## Four traps the recon found (2026-07-31)

1. **The icon-sizing trap, and it is the one that bites.** `guided.css:9-16` sets `.gd svg, .gd-portal svg { width: 1em; height: 1em }` and `guided-icons.ts` emits SVGs with no width or height attributes. **In the whole guided runner, an icon's size IS its font-size.** Six selectors are affected: `.gd-row__chev` (17px), `.gd-block__icon` (17px), `.gd-panel__x` (17px), `.gd-q__clock` (15px), `.gd-block__label svg` (14px), `.gd-stepper .stage-step__check` (16px). A blind 15/17 → 16 sweep enlarges chrome across the customer app; a blind → 14 shrinks the chevron and the close cross by 18%. Neither is a text change and neither shows up in a font-size audit. Treat these as icon sizing, not type.
2. **Grouping a bold selector into `.type-body` silently un-bolds it.** `.type-body` declares weight 400 and the pattern leaves the component sheet nowhere to keep a weight. Fourteen 16px-semibold selectors would flatten, including `.arc-phase__label` (which sits directly above a 16/400 intent line it is meant to outrank), `.gd-q__stem`, `.gd-block__label`, `.gd-row__text` and `.pv-a__opener`. **`.type-heading-xs` (16/600) is the correct home** and currently matches nothing.
3. **Do not change `--measure`.** `layout.css:11` `.l-container` reads the same token, so retuning it from `38rem` to a character measure widens every plain page column plus four more sites: 18 screens move. The character measure belongs inside the roles in `type.css`, which is where it already is.
4. **Three selectors depend on a line-height multiplier for their geometry**, not their type: `.bullet__mark { line-height: inherit }` keeps the dot on the sentence's baseline, `.pv-tile__name { line-height: 1 }` keeps the switcher tiles short, `.gd-stepper .stage-step { line-height: 1 }` sets the stepper pill height. They take `.type-flush` alongside their role.

Also: `mobile.css:298` `input, select, textarea { font-size: max(1rem, 1em) }` looks like a literal to fix and is not. It is the iOS focus-zoom guard that raises small controls to 16px while leaving big ones alone. Leave it; Phase 6 gives it an explicit waiver.

## Two tests break on the clean end state
`frontend/src/stages/preparation-css.test.ts:111` and `:126` assert that at least one `font-size` survives in `preparation.css` plus `preparation-lab.css`; stripping both sheets fails them. `finish-feedback-modal.test.ts:63` asserts `.ffm__q` exists in `finish-feedback-modal.css`. Both must be changed test-first or the phase ends red.

## Not in this phase
- Headings, metrics and KPI values — Phase 5.
- The markup class sweep — Phase 5.

## Done when
- [ ] `grep -rn "15px\|17px\|--type-body-md\|--type-body-lg" admin/src frontend/src` returns nothing outside the parked gallery files
- [ ] Every reading block computes to 16px with a max width between 60 and 66 characters, measured in the Browser pane console
- [ ] The review table for the ~40 hand decisions is in this file, with each call recorded
- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy` clean
- [ ] Screenshots of each screen below saved to `proof/`
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
This is the one where you should **see it get better**.

**Setup:** `local > Start Sero.bat > localhost:3000 > Dev login: Manager`

1. **A prep briefing** — open a briefing with real text in it. The paragraphs should now break at a comfortable width instead of running the full page. ❌ Not OK if lines are still very long, or so short the text looks like a newspaper column.
2. **All the reading text matches** — in that same briefing, every paragraph, bullet and note should be the same size as every other. ❌ Not OK if you can spot one block that is slightly bigger or smaller than the one above it.
3. **A recap** — open a finished run's recap. Same check: one reading size, comfortable line length. ❌ Not OK if the recap reads differently from the briefing.
4. **Customer app, guided run** — `localhost:3002`, Dev login: Member. Open a guided meeting and scroll to the summary and recommendations. Reading text should be comfortable; the little chevrons, percentages and question numbers should stay small. ❌ Not OK if a percentage or arrow has ballooned to the size of body text.
5. **Confidence readouts** — on the preparation screen, the confidence line should look the same everywhere it appears. ❌ Not OK if two of them are different sizes.
6. **The gut check** — put this next to a screenshot from before the phase. Does it read better? That's the whole point of this one.

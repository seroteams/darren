# Phase 4: reading surfaces

**Part of:** [plan.md](plan.md) · **Status:** ✅ closed UNWALKED

## ✅ CLOSED UNWALKED 2026-07-31 — Carl lifted the walk gate ("as this is a frontend, can you keep going?" then "lets go!"). He has NOT seen these screens. Proof stands in place of the walk; anything genuinely aesthetic is listed in plan.md's Current state for his eye.


## Goal
Kill 15px and 17px from the product, put every reading block at 16px, and give prose a real line length. This is the phase Carl will actually see the quality change in.

## Changes
- **`admin/src/styles/design/briefing.css`**, **`stage-extras.css`**, **`about-stage.css`**, **`promise-agree.css`**, **`design/run-detail.css`**, **`meeting-arcs.css`**, **`member-home.css`**: prose selectors take `body` + the measure; ledes take `body-lg`.
- **`frontend/src/stages/guided/guided.css`**: its prose selectors. This sheet held 16 of the ~40 hand decisions.
- **`frontend/src/stages/preparation.css`** and **`preparation-lab.css`**: the nine confidence-readout selectors rendered the same sentence at 18 / 16 / 14px across eleven layout variants. All become `body`, not `label` (see the table).
- **The ~40 hand decisions** are recorded in the table below, each with a prose / chrome / glyph / numeric call.
- The question stem's other homes take `heading-xl` or `heading-xs` by context.

**Lane collision:** cleared before the build. Session `080b9104` is off the board and its `.pv-rate` work has landed, so `frontend/src/stages/preparation.css` was free. Nothing was edited through another chat's claim.

## Three corrections to this file, from the recon
Recorded here rather than left in the recon, because the trackers move together.

1. **Two paths in the original Changes list did not exist.** `meeting-arcs.css` is `admin/src/styles/meeting-arcs.css`, not under `design/`; `member-home.css` is `frontend/src/stages/member-home.css`. Both are code-split satellites, so both needed a full strip rather than a role beside an old rule.
2. **`.arc-phase__q` is not a question stem.** `meeting-arcs.js` renders `${n} q` into it: it is a per-phase question COUNT. It stays 14px `body-sm`. Sent to `heading-xs` as a stem it would have put "3 q" at 16/600 beside a 16px label.
3. **`guided.css:433` does not exist.** The stem lives at `.gd-q__stem` and `.gd-q--done .gd-q__stem`, and the original file cited nine surfaces where there are six.

## Four traps the recon found, and what happened to each

1. **The icon-sizing trap.** `guided.css` sets `.gd svg, .gd-portal svg { width: 1em; height: 1em }` and the icon emitter writes no width or height, so in the guided runner an icon's size IS its font-size. Six selectors were affected and none was swept blind. `.gd-row__chev` and `.gd-q__clock` took `body-sm` and their glyphs went 17px and 15px to **14px**; `.gd-block__icon` and `.gd-panel__x` kept an in-sheet size, tokenised to the 16px rung, because 14 would have left a small glyph rattling round a 38px medallion and a 32px close target; `.gd-block__label svg` and `.gd-stepper .stage-step__check` were restated as `width`/`height` in px so they hold 14px and 16px now that the text beside them takes a role. Measured after: every one of the six is 14 or 16, nothing is 15 or 17.
2. **Grouping a bold selector into `.type-body` un-bolds it.** `.type-heading-xs` (16/600) took the fourteen. It matched nothing before this phase.
3. **`--measure` was not changed.** `.l-container` still reads 38rem and no layout container moved. The character measure lives in a new token, `--measure-read: 60ch`, which only the two body roles read.
4. **Three geometry line-heights survived**: `.bullet__mark` keeps `inherit` in briefing.css with its reason beside it, `.pv-tile__name` and `.gd-stepper .stage-step` are in `.type-flush`.

`mobile.css`'s `max(1rem, 1em)` was left alone. It is the iOS focus-zoom guard, not a literal to fix.

## Two tests changed test-first
Both were changed, watched fail, and only then was the source touched.

- `frontend/src/stages/preparation-css.test.ts` asserted **at least one** `font-size` survives in the two prep sheets. It now asserts the opposite, with a floor: no surviving size may resolve below 20px, so the reading stratum has provably left those files while the three display headings Phase 5 owns are allowed to stay. The 14px floor check now reads `type.css` as well, which is where the sizes went.
- `admin/src/ui/finish-feedback-modal.test.ts` asserted `.ffm__q` exists in `finish-feedback-modal.css`. It now asserts the rule exists in `type.css` **and** that the modal sheet declares no size at all, because that sheet is code-split and a size there would beat the role.

## Six defects carried in from Phase 3, all fixed here
Every one was measured in the running app before and after.

| What was wrong | Fix | Measured after |
|---|---|---|
| `.btn--sm` was grouped into `body-sm` with a single class. `.btn` declares 16px in `buttons-inputs.css`, which loads twelve lines later, so **every small button grew from 14px to 16px** | `.btn.btn--sm` in `.type-label`, not `body-sm`: two classes beat one whatever the sheet order, and `.type-label` is where the app's other small controls already live, so it keeps the medium weight `.btn` gave it | 14px/500 (was 16px/500) |
| `.rd-turn__a` still declared its own size, so the answer text on the Answers tab sat at 14px on a 21.7px leading beside a 14px question | Stripped, grouped into `.type-body` | 16px/24px beside `.rd-turn__q` at 16px/24px |
| `.axis__value--baseline` lost to its own base class `.axis__value` later in type.css, so the baseline rendered semibold and stopped reading as the baseline | `.axis__value.axis__value--baseline` | weight 500 against the live value's 600 |
| `.hint--kbd` still rendered 16px: `.hint` in `buttons-inputs.css` beats a Tailwind utility, so the `text-sm` P3 put in the markup never applied | `.hint.hint--kbd` in `body-sm` | 14px/20px, level with `.copy-snippet-btn__label` at 14px |
| `.kbd` was grouped into `body-sm` but kept `line-height: 1.5` in `base.css` | Stripped | 14px/20px |
| `.run-list__avatar` sat in the `body-sm` list and was inert: every element carrying it also carries `.ds-avatar`, which is in `label-strong` later in the same file | Removed from the list | unchanged at 14/600, and the role list no longer lies |

Two more, both records rather than renders: the eyebrow census comment in `type.css` broke its own arithmetic (buckets summing to thirteen, described as fifteen, against a list of eighteen) and is rewritten to the checkable count; and `test-design-guard.js` said all 22 `offLadderFont` hits were "15px, 17px or clamp sites", when **none of the 22 was a clamp**. Both corrected.

Also carried in from Phase 2 and closed here: the `.ctx-segments` / `.question-desc` pair on the Meeting screen was 14px and 16px, both weight 400 and both ink-dim, which DESIGN.md T2 forbids for that one narrow rung pair. The context strip moved to ink-mute. That is a colour change, not a type one, and it is the quieter of the two.

## The hand decisions
Every off-ladder site and every judgement call, with the call recorded. **Kind** is what decided it.

| Selector | Was | Now | Kind | Why |
|---|---|---|---|---|
| `.briefing-prose` | 16px, no measure, in a 1152px card | 16/24, 60ch | prose | 147 characters a line measured before, 75 after. The biggest single win in the phase |
| `.brutal__body` | same | 16/24, 60ch | prose | second biggest |
| `.rd-turn__a` | 14px | 16/24, 60ch | prose | the most words on the run-detail screen and the smallest text on it |
| `.rd-turn__q` | 14/600 | 16/600 | heading | so the question you are re-reading is reading size; it separates from its answer by weight now, not size |
| `.question-source-answer` | 14px | 16/24 | prose | a full previous answer quoted for context. It is a paragraph, so it goes up |
| `.about-sec__sub`, `.about-how__you`, `.about-duo__body` | 14px | 16/24 | prose | real copy on the About page, below the reading tier for no reason |
| `.about-alpha` | 14px | 14px | prose | STAYS. A quiet caveat row, deliberately below the reading tier, and it carries a link that must not grow |
| `.focus-point__reason`, `.focus-point__evidence` | 14px | 14px | prose | STAY. Tiers two and three inside a card whose hierarchy is the point |
| `.about-how__title` | 17px/600 | 16/600 | heading | DOWN. Under a 20px section title, beside a 14px chip. 18 would have tied it too close to the title |
| `.member-req__text`, `.member-empty__copy` | 14px | 16/24 | prose | what a member reads on their own home screen |
| `.member-goal__text` | 14/500 | 16/600 | prose | up, but with a weight: `.type-body` would have stopped it leading its own progress row |
| the nine confidence readouts | 18px ×2, 16px ×1, 14px ×6 | 16/24, 60ch | prose | ONE sentence rendered nine ways. phase-4.md said `label`; `.type-label` is 14/500 with caps tracking, built for a field label, and this is a sentence a manager reads to decide how far to trust the brief |
| `.pv-e__lead` | 18px | 18/28, 60ch | prose | the one exception. It carries variant E's confidence AND opener AND leave-with, and "the top band reads louder" is that layout's premise |
| `.pv-h__opener` | 18/500 | 18/400 | prose | loses the medium weight. The size is what makes it the opener; `heading-sm` would have made it louder than it is today |
| `.pv-a__opener` | 16/500 | 16/600 | prose | a quoted opener. `.type-body` would flatten it to 400 and it stops reading as a quote |
| `.pv-b__row p` | 14px | 16/24 | prose | UP, and it is a real densification cost for a layout whose premise is the whole brief in one view. Flagged for Carl |
| `.notes-quote` | 18px, no measure | 18/28, 60ch | prose | the manager's own note read back. The lede rung |
| `.gd-q__coach`, `.gd-sum p/li`, `.gd-rec__block p/li`, `.gd-sugg__row`, `.gd-prom__text`, `.gd-rec__scorerow`, `.gd-rec__item` | 15px | 16/24, 60ch | prose | the guided runner's reading text, all of it |
| `.gd-q__n` | 15px | 14/20 | numeric | a counter, read at a glance |
| `.gd-row__pct` | 15/700 | 14/600 | numeric | a percentage beside a 14px category chip |
| `.gd-row__chev` | 17px | 14px | glyph | an icon at 1em, so this is the arrow's size. 18% smaller, and level with the chrome round it |
| `.gd-q__clock` | 15px | 14px | glyph | same mechanism, a clock in a 28px button |
| `.gd-block__icon`, `.gd-panel__x` | 17px | 16px | glyph | 14 would leave a small glyph in a 38px medallion and a 32px close target. Tokenised in the sheet, not given a reading role |
| `.gd-q__stem`, `.gd-q--done .gd-q__stem` | 16/700 and 15/600 | 16/600 | heading | the stem stopped being two sizes. NOT `heading-xl`: several cards stack down one 608px column |
| `.gd-row__text` | 15/500 | 16/600 | prose | the weight is what separates it from the chip and percentage beside it |
| `.gd-block__label`, `.gd-eng__ask` | 16/700 and 16/600 | 16/600 | heading | trap T1 |
| `.gd-block__score` | 30px literal, display, 700, no tabular figures | `.type-metric`, 30/36/600 + tabular-nums | numeric | the digits used to shift sideways as the slider moved |
| `.gd-q__logo` | 14px, display face | 14px, base face | glyph | size unchanged. It is here to leave Bricolage, which DESIGN.md T6 bans below 20px |
| `.gd-notes textarea`, `.gd-field select/input/textarea` | 15px | 16/24 + `--full` | control | 16 also clears the iOS focus-zoom edge |
| `.gd-eng button` | 16px | 16/24 + `--full` | numeric | a 1-to-5 digit in a 44px button. `[data-selected]` keeps a weight via `heading-xs` |
| `.team-card__avatar` | 15px, display | 16px, base | glyph | initials in a 44px circle. Off the ladder AND a T6 breach |
| `.team-card__name-btn` | 17px, display | 18/600, base | heading | UP. Off the ladder AND a T6 breach, both fixed by one rung |
| `.ffm__q` | 16px, var fallback | 16/600 | heading | the one question in a 440px modal. It reads as the ask now |
| `.ffm__title` | 18px, var fallbacks | 18/600 | heading | exact fit |
| `.arc-chip` | 16/500 | 14/500 | chrome | the only chip in either app set at 16. Visible shrink, internal admin screen only |
| `.arc-chip__sep` | 1.1rem (17.6px) | 16px | glyph | a bare arrow between chips, never read. Fired two rules at once |
| `.arc-phase__label` | 16/600 | 16/600 | heading | unchanged in look; it is in `heading-xs` so `.type-body` cannot flatten it against the intent line under it |
| `.joblex-remove` | 1.05rem (16.8px) | 16px | glyph | a remove cross. 0.8px, and it clears two rules |
| `.ds-star` | 1.5rem literal | 24px token | glyph | a real star character, so the size genuinely draws it. Tokenised, not resized |
| `.rd-avatar` | 1.125rem literal | 18px token | glyph | one initial in a 52px circle |
| `.pa-add__plus` | `--type-h4` | 18px token | glyph | a plus in a 32px dashed circle |
| `.star-rating__star` | 1.75rem + line-height 1 | no size; `inline-flex` + `.type-flush` | glyph | the font-size was INERT: the star is drawn at 26px by an explicit width/height attribute. It only set the button's line box. Measured: button 29x28 to 29x26, star unchanged at 26x26 |
| `.pa-input` | 16px, leading 1.35 | 16/24 + `--full` | control | the promise row grows about 2px. Its own comment asked for a self-contained font so it never inherits the answer box size, which the role now guarantees |
| `.textarea--question`, `.arc-edit .input` | 16px | 16/24 + `--full` | control | the measure has to come off or the answer box narrows inside its shell |
| `.question-drill-hint` | 16px/23px bare, 14px under `.cp-screen` | 14/20 everywhere | prose | one class, two recipes. Same defect P2 fixed for `.question-stem` |

## Where the measure landed
`--measure-read: 60ch`, read only by `.type-body` and `.type-body-lg`. Measured in the running app: 1ch is 10.09px at 16px Inter, so the body measure computes to **605.6px**, which is within 3px of `--measure`'s 608px page column. That is why 60 and not the recon's 66: at 66ch prose would cap at 666px and the app would have gained a SECOND reading width, wider than every `.l-container` page. At 60ch it has one.

At 18px the same token computes to 681px, because a `ch` is relative to the element's own size. That is the point of a character measure: `body` and `body-lg` break at the same number of characters, not at the same number of pixels.

Real prose, measured on a real recap paragraph in a 1152px card: **147 characters a line before, 75 after.**

## Done when
- [x] No screen renders 15px or 17px. `grep -rn "15px\|17px\|--type-body-md\|--type-body-lg"` over both apps returns only comments, three SVG width/height pairs (icon geometry, not type) and the two token DEFINITIONS in tokens.css, which now have no live consumer and are kept alive solely by the parked gallery prototypes. Every live call site is gone.
- [x] Every reading block computes to 16px at 60ch (605.6px), measured in the browser console
- [x] The hand-decision table is in this file
- [x] `npm test` 219/219 · `npm run typecheck` clean · design guard PASS · `npm run lint:copy` PASS
- [x] Six ceilings re-measured and lowered: offLadderFont 22→**0**, unsanctionedSizeToken 138→68, literalFontSize 10→4, displayFaceBelow20 7→4, relativeFontSize 10→8, nonTokenFont 7→6
- [ ] Product owner has tested the scenarios below and said go

**Not screenshotted.** The Browser pane in this session reports `window.innerWidth: 0` and does not composite, so a screenshot would have been a blank or a lie. Everything above is a computed style or a range-measured character count read off the real running app at `localhost:3943` and `localhost:3945`, with the real stylesheets in their real load order.

## Test scenarios, for the product owner
This is the one where you should **see it get better**.

**Setup:** `local > Start Sero.bat > localhost:3000 > Dev login: Manager`

1. **A prep briefing.** Open a briefing with real text in it. The paragraphs should now break at a comfortable width instead of running the full page. ❌ Not OK if lines are still very long, or so short the text looks like a newspaper column.
2. **All the reading text matches.** In that same briefing, every paragraph, bullet and note should be the same size as every other. ❌ Not OK if you can spot one block that is slightly bigger or smaller than the one above it.
3. **A past 1:1, Answers tab.** The answer under each question used to be the smallest text on the page. It should now be the same size as the question, separated by weight. ❌ Not OK if the answer still looks smaller than the question.
4. **Customer app, guided run.** `localhost:3002`, Dev login: Member. Open a guided meeting and scroll to the summary and recommendations. Reading text should be comfortable; the little chevrons, percentages and question numbers should stay small. ❌ Not OK if a percentage or arrow has ballooned to the size of body text.
5. **Confidence readouts.** On the preparation screen, the confidence line should look the same everywhere it appears. ❌ Not OK if two of them are different sizes.
6. **Small buttons.** "Keep", "Drop", "See more" and the like. They were 14px before Phase 3, grew to 16px by accident, and are 14px again. ❌ Not OK if a small button looks the same size as a full-size one.
7. **The gut check.** Put this next to a screenshot from before the phase. Does it read better? That's the whole point of this one.

## Left for Carl, not decided in the build
- **75 characters a line, or fewer?** 60ch is the plan's own band and matches the page column. Read as real characters it is 75, which is the top of the classic 45 to 75. Dropping the token to 50ch would give about 62 real characters. One line in `tokens.css`, reversible.
- **Four eyebrow trackings** still differ from `.type-overline` (0.02em to 0.06em against 0.08em). Collapsing them widens five small-caps labels at once. That is a look change, not a mechanical one, so it was left.
- **`.page-header__lede`** is the most-seen lede in the app and stayed at 14px. Raising it to 16 is a one-word change and touches every page header.
- **The run-detail Recap tab** renders its paragraphs with Tailwind `text-sm` in the markup, not with `.briefing-prose`, so it is still 14px with no measure. That is the markup sweep, which is Phase 5.

## Not in this phase
- Headings, metrics and KPI values: Phase 5.
- The markup class sweep: Phase 5.

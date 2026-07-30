# Phase 3 — The 14px stratum

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl

## What landed (2026-07-31)

Roughly 300 selectors across 45 stylesheets gave up their type and were grouped into
the roles in `design/type.css`. Nothing was left half-applied: every selector grouped
in also had every type property stripped from its own sheet, including the code-split
satellites, which was the failure mode P2 measured.

Measured on the running app rather than reasoned about (the Browser pane will not
composite here, so these are computed styles, not screenshots):

| check | before | after |
|---|---|---|
| `relativeFontSize` | 33 | **10** |
| `unsanctionedSizeToken` | 439 | **138** |
| `fontFamilyLiteral` | 8 | **1** |
| `literalFontSize` | 12 | **10** |
| text below 14px on any screen read | 0 | **0** |
| uppercase recipes on one screen | 2 | **1** |

`offLadderFont` 22, `clampOffRung` 10, `displayFaceBelow20` 7 and `undefinedToken` 3
are untouched on purpose: every one of them is a 15px, 17px, clamp or display-face
decision that Phase 4 or Phase 5 owns.

**Ten selectors changed SIZE, in a phase billed as changing none.** All ten declared a
weight or a family and no size, so they inherited 16px; taking a 14px role drops them.
Nine of the ten sit on a shared baseline beside a sibling that was already 14px, so
this reads as the fix rather than the regression, but it is a size change and here they
all are: `.run-list__name`, `.pck-action`, `.lex-row__num`, `.fb-name`,
`.member-runs__type`, `.ds-avatar`, `.axis__value`, `.ds-btn-quiet`, `.tg-card__link`
and `.run-log__tip` (the last is mono, not weight). Measured live: `.run-list__name`
now renders 14px/600 level with `.run-list__sub` at 14px/400 on Past 1:1s.

**Two weights dropped 700 to 600** on the avatar initials (`.profile-badge__avatar`,
`.session-topbar__avatar`, `.fb-avatar`, `.run-step__dot`, `.cmp-tag`, `.axis__thumb`,
`.axis__caret`): the roles have no 700 rung, and `.axis__thumb` was the convergence
Machar asked for.

**The media-query rule and the nine state rules, handled explicitly.**
`.session-topbar__count` only ever renders inside the phone query, and it has a base
`display: none` rule outside it, so the plain class selector was grouped into
`.type-label` and the media block kept only layout and colour. Seven of the nine state
rules are compound selectors (`.app-nav__link.is-active` and friends), so they carry
their own higher specificity into `type.css` and were grouped into `.type-label-strong`.
Two could not be: `.joblex-item.is-active` and `.fp-chip--changed` sit on a base that
takes no role, so a 14px role would have shrunk them as well as emboldened them. Both
kept their local weight with a comment saying why.

**Twelve glyph selectors took `.type-flush`.** Three could not: `.ud-chev` and
`.row-menu-btn` need `line-height: 0`, not 1, so the line box collapses entirely, and
`.bullet__mark` needs `inherit` so it stays on the 16px prose baseline beside it. All
three keep one declaration, each with a cited comment.

**One extra fix, found by measuring.** Tailwind's `text-sm` still carried
`lineHeight: 1.5` (21px), so 114 markup sites sat one pixel off the grid the roles had
just landed on. It now reads `var(--type-leading-sm)`. Deleting the `xs` entry also
un-shadowed Tailwind's own 12px `text-xs`, which would have been a new floor breach, so
the two parked gallery sites that still said `text-xs` were swept too. `text-xs` now
appears nowhere in either app and the utility is no longer emitted at all.

Free checks after: `npm test` 219/219 · `npm run typecheck` clean ·
`npm run lint:tokens` PASS · `npm run lint:copy` PASS ·
`node scripts/test-design-guard.js` ok · `node scripts/test-type-rules.js` all passed.
No paid run.

**Skipped, not forgotten:** `admin/src/styles/design/stage-lookback.css` holds three
selectors this phase wanted and is claimed by session `a6878b4e`. The claim is four
days old and stale by the board's own two-day rule, but the row is still up, so it was
left alone. Carl's call.


## Goal
Move the ~150 chrome, table, label, eyebrow and code selectors onto roles. Nothing changes size — only the line spacing snaps onto the grid.

## Changes
This is the biggest count and the lowest visual risk: 69% of every type declaration in the app is already 14px. The migrate script classifies them from the tuple they already declare.

- Table cells, column headers, row metadata, nav items, breadcrumbs, status counts, tooltips, timestamps → `body-sm` / `label` / `label-strong`.
- The 111 `.eyebrow` uses and its four rivals (`.cp-eyebrow`, `.brutal__eyebrow`, `.app-nav__group-label`, `.run-log__block-label`) → `overline`.
- The 14 mono sites and their **four different mono stacks** → `code`, one stack.
- **Collapse the two rival label recipes.** `.field__label` uses full ink and no tracking; `.label` uses muted ink, tracking and line-height 1.5. They are the same job. Both become `label`.
- `admin/tailwind.config.js` — delete the `xs` entry. It points at `--type-small`, which does not exist, so its six markup sites emit an invalid `font-size` and silently inherit. Those sites become `text-sm`. **Test-first:** `admin/src/ui/skeleton-presets.test.ts:242` asserts `"text-xs"` — change the assertion, watch it fail, then change the source.

**Lane collision:** `admin/src/styles/feedback-inbox.css` was claimed by session `080b9104`. That row has since cleared, so the file is free. Re-check LANES.md before starting anyway.

## Carried in from Phase 2's verification
Each of these was found on the Meeting screen but lives in a file Phase 2 did not own:

- **`.axis__thumb` (design/axes.css:78) is weight 700; `.coach-meter__thumb` is now 600.** The two were deliberately converged after Machar's *"does not match the design from the runner"*, and are currently half out of step. Bring the axis thumb onto `label-strong` in the same move.
- **Two 14/16 pairs differ by size alone**, which DESIGN.md T2 forbids: the ctx segments against `.question-desc`, and `.copy-snippet-btn__label` against `.hint--kbd`. Whichever roles they take must differ in weight or ink as well as size.
- **`.hint--kbd` carries `text-xs` and renders at 16px**, the largest of the Meeting screen's three sizes. Tailwind's `text-xs` points at the undefined `--type-small` and loses every tie, so the class is a lie in the markup. Either the element takes `body-sm` and the class goes, or the class goes.
- **The "Wrap up early" ghost button is 16px/500**, the largest thing in the runner header. The mockup has its equivalent at 14px, level with the rest of the header chrome. This is the one place the live screen still reads busier than the mockup, and the cause is the button, not the roles. Buttons live in `design/buttons-inputs.css`.
- **`admin/src/ui/skeleton-presets.ts:264`** still says *"the runner's stem is 32px in a 560px column"*. It is 30px now. The three-line assumption still holds, but the widths `['96%','88%','54%']` were tuned against 32px. Correct the comment and re-check the assumption against a real question bank while the file is open.
- **`design/mobile.css:352`** comments `--type-h2: 1.35rem` as *"22px, question stems fit beside a keyboard"*. The stem no longer reads that token. Keep the value, other consumers still use it; reword the comment.

## Scope correction (2026-07-31, from the recon)
The original scope said "~150 chrome selectors" but named only eight files. The recon counted the rest: **sixteen more files carry type and appear in no phase file at all** — `design-stage.css` (46 declarations), `start-stage.css` (46), `stage-review.css` (39), `test-engine.css` (34), `auth.css` (23), `axes.css` (15), `team-card.css` (15), `add-person-modal.css` (13), `pulse-drilldowns.css` (12), `test-gallery.css` (11), `primitives.css` (9), `guide.css` (9), `shared-components.css` (7), `promise-checkin.css` (5), `persona-bench.css` (4), `member-runs.css` (3).

Between them they hold about **104 of the 439** remaining unsanctioned-token hits. Left out, Phase 6's guard flip cannot reach zero and the plan quietly fails at the last step. **So this phase covers every 14px chrome selector wherever it lives, not just the eight files originally listed.**

Two structural rules the recon settled, both now built into `type.css`:
- **`.type-body-sm` no longer carries a measure.** 35 of its 54 consumers are chrome that must fill its container; a measure would have stopped the people table filling its card, which is test scenario 1's exact failure.
- **`.type-flush` exists** for the ~18 selectors that centre a glyph or an initial inside a fixed-height circle or pill with `line-height: 1`. They group into it the same way they group into a role, so no stray line-height survives in a component sheet.

Three things cannot be reached by grouping and need their own handling: `session-topbar.css:287` sets type inside a media query; nine state rules bump weight in place (`.um-menu__item.is-current`, `.app-nav__link.is-active` and seven more); and `admin/tailwind.config.js` has **nine** entries reading retiring tokens behind ~181 markup uses, of which only `xs` was previously noted.

## Not in this phase
- Prose and reading surfaces — Phase 4.
- Headings and metrics — Phase 5.
- Any deliberate size change. **Exception, and it must be reported:** seven weight-only chrome selectors declare a weight and no size, so they inherit 16px today and taking a 14px role shrinks them (`.run-list__name`, `.pck-action`, `.lex-row__num`, `.fb-name`, `.member-runs__type`, `.ds-avatar`, `.axis__value`). Several sit on a shared baseline beside a sibling already at 14px, so shrinking is probably a fix rather than a regression, but it is a size change in a phase billed as changing none. Name them in the phase note.

## Done when
- [ ] Zero **14px** type declarations left in the twenty-four files this phase covers. Not zero type declarations: seven of the original eight also hold `--type-h2`/`h3`/`h4` and 16px prose that Phases 4 and 5 own, so only `breadcrumb.css` can reach absolute zero on this phase's rules.
- [ ] One mono stack in the repo, one label recipe, one eyebrow recipe
- [ ] `text-xs` gone from the Tailwind config and from markup
- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy` clean
- [ ] Screenshots of each screen below saved to `proof/`
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Text should be the **same size everywhere** in this phase. You are looking for spacing, not size.

**Setup:** `local > Start Sero.bat > localhost:3000 > Dev login: Admin`

1. **The people table** — go to **Team**. Rows should look tidy and evenly spaced. ❌ Not OK if a row has grown tall enough to push the table out of shape, or if text now touches the row edges.
2. **Column headers** — the headers above the table should all look like each other. ❌ Not OK if one header looks different from its neighbours.
3. **Small caps labels** — the little uppercase headings dotted around (above groups in the nav, above sections in a run log). They should all look identical to each other now. ❌ Not OK if two of them look different.
4. **Anything code-ish** — open the **Error log**. The technical text should be in one consistent typewriter font. ❌ Not OK if two bits of technical text use different typewriter fonts.
5. **The left nav and top bar** — unchanged in size, tidy in spacing. ❌ Not OK if anything is now clipped or overlapping.
6. **On a phone** — narrow the window to phone width. Tables and nav still usable. ❌ Not OK if something now overflows sideways.

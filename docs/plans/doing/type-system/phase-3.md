# Phase 3 — The 14px stratum

**Part of:** [plan.md](plan.md) · **Status:** ⬜

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

## Not in this phase
- Prose and reading surfaces — Phase 4.
- Headings and metrics — Phase 5.
- Any size change. If a selector in this set is not already 14px, it belongs to a later phase.

## Done when
- [ ] Zero type declarations left in `admin-tables.css`, `notes-panel.css`, `session-topbar.css`, `app-nav.css`, `error-log.css`, `run-log.css`, `breadcrumb.css`, `row-menu.css`
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

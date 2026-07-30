# Phase 5 — Headings, metrics, and the markup sweep

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl

## What landed (2026-07-31)

**The ladder, measured on the running app at 1440px.** Every number below is a
computed style read off the real page, not a prediction.

| What | Before | After |
|---|---|---|
| Welcome hero (`start-welcome.ts`) | 42 / 46.2 | **36 / 40** |
| `.text-display`, `.briefing-headline` | 42 / 46.2 | **36 / 40** |
| Page titles (`.h1`, 31 sites incl. `ui/page-header.ts`) | 42 / 46.2 | **30 / 36** |
| "Reset your password" / "Choose a new password" | **44** / 48.4, w700 | **30 / 36, w600** |
| Log in / Create account / customer welcome | 36 / 39.6 | **30 / 36** |
| `.h2` (16 sites) | 36 / 43.2 | **24 / 32** |
| A person's name (`.ud-nameline .rd-name`) | 36 / 43.2, w700 | **24 / 32, w600** |
| `.join-hero` | 36, w500 | **24 / 32, w600** |
| `.h3` (15 sites) | 20 / 27, **base face** | **20 / 28, Bricolage** |
| `.rd-name`, `.gd-panel__title` | 20 / 24, w700 | **20 / 28, w600** |
| `.h4`, `.modal__message`, `.stage-review__headline` | 18 / 25.2-27 | **18 / 28** |
| `.ds-rail__title`, `.tg-card__title`, `.gd-rec__block h3` | 18, **Bricolage** | **18 / 28, base face** |
| Sero wordmark ×3 | 18 / w700, two faces | **18 / 28, w700, one face** |
| `.lead` | 18 / 28.8 | **18 / 28, measure 624.6px** |
| `.body` | 16 / 25.6 | **16 / 24, measure 555.2px** |
| Pulse KPI (`.lp-tile__value`) | 30px literal / 34.5 | **30 / 36 via `.type-metric`** |
| `.input` (intake, feedback, password screens) | clamp 20-28 | **24 flat** |

**The inverted ladder is gone.** `--type-h1` maxed at 44px against `--type-display`'s
42px, so above a 1000px viewport the second rung outranked the first. Both tokens are
deleted. Measured after: display 36 > heading-xl 30 > heading-lg 24 > heading-md 20 >
heading-sm 18 > heading-xs 16.

**The phone regression the recon caught did not ship.** Measured at 390px: hero 30/36
(was 30.4 via `mobile.css`), page title 24/32 (was 25.6), `.h2` 20/28 (was 21.6),
question stem 20/28 unchanged. Without the three new rules at the foot of `type.css`
the hero would have GROWN to 36px.

**Guard ceilings, re-measured with `node scripts/lint-design-tokens.js --json`:**

| rule | was | now |
|---|---|---|
| `unsanctionedSizeToken` | 68 | **0** |
| `clampOffRung` | 10 | **0** |
| `relativeFontSize` | 8 | **0** |
| `displayFaceBelow20` | 4 | **0** |
| `fontFamilyLiteral` | 1 | **0** |
| `literalFontSize` | 4 | **1** (mobile.css's iOS zoom guard, P6 waives) |
| `nonTokenFont` | 6 | **5** (all in the parked `runner-v2.js`) |

`npm test` 219/219 · `npm run typecheck` clean · `lint:tokens` PASS · `lint:copy` PASS
· `npm run build:all` clean.

## Decisions made in the build, and why

1. **The markup was NOT renamed. The classes were grouped into roles.** `phase-5.md`
   asked for 269 class renames. The house pattern (`base.css:131`, and what P2, P3 and
   P4 all did) is to group the component selector into the role instead, and it is
   better here for four reasons: 118 of the 269 are in `design.js`, which Phase 6
   rewrites; three sites build the class name dynamically and a rename misses them;
   `page-header.test.ts` would hard-fail and `recap-header.test.ts` and
   `finish-feedback-modal.test.ts` would go INERT, passing trivially on a class that no
   longer exists; and grouping costs one edit per role instead of 269. `.h1` still had
   to split two ways, so `start-welcome.ts` is the **one** markup line this phase
   changed.
2. **The parked gallery kept its tokens rather than breaking silently.** The nine
   prototypes read the old names ~180 times and are exempt by Carl's call. The
   definitions moved to `admin/src/stages/tests/parked-tokens.css`, imported by the
   eight files that need them. Verified in the build: the legacy tokens appear only in
   the gallery's own code-split chunk, never in the main bundle.
3. **`--type-weight-bold` survived.** Every heading gave up 700, but the Sero wordmark
   (three copies) and the guided monogram are the logotype, not headings. Dropping them
   to 600 is a brand change, so it is made explicitly in `type.css` rather than falling
   out of a migration. This also fixes a P4 miss: `.gd-q__logo` lost 700 in that phase
   while the record said it had not changed.
4. **Four of the six tracking tokens stayed.** `type.css` reads `tighter`, `tight`,
   `wide` and `caps-lg` itself. Only `wider` and `caps` were deletable, and `caps` only
   after `.eyebrow--slot` gave up a 0.02em difference nobody reads.
5. **`--measure-read` went 60ch to 55ch.** Re-measured: 1ch is 10.094px at 16px Inter
   and 11.359px at 18px, so 60ch was **81 characters** a line, over DESIGN.md **T5**'s
   75-character absolute maximum. 55ch is 74 at both rungs. The comment above the token
   in `tokens.css` had four wrong numbers and argued the unit does something it cannot;
   it is rewritten.
6. **`.run-log__stat-value` took `.type-heading-md`, not `.type-metric`.** Metric is
   30px Bricolage and this is 20px on an internal QA screen: a 50% jump for no reason.
7. **`runner-v2.js` was left alone.** `plan.md`'s Parked section says the gallery stays
   as it is. Retiring it would take `nonTokenFont` from 5 to 0, and that is Carl's call
   rather than a lint number's.

## Still open for Carl
- Retire `admin/src/stages/tests/runner-v2.js`? It shows a design the Meeting screen
  deliberately no longer matches, and it is the only thing left in `nonTokenFont`.
- `--measure-read` at 55ch clears T5's absolute maximum. T5's stated **target** is 66
  characters, which is about 49ch and a visibly narrower column.
- `.input` grows 20 to 24px on a phone. Every other change shrinks or holds.

**Status:** 🔨

## Goal
One heading ladder across both apps, and the old system deleted rather than left lying around.

## Changes
- **Headings** onto `display` (36/40), `heading-xl` (30/36), `heading-lg` (24/32), `heading-md` (20/28), `heading-sm` (18/28), `heading-xs` (16/24). This retires three competing clamps — `--type-display` (30–42), `--type-h1` (32–44) and `--type-h2` (28–36) — including the inverted top of the ladder where `h1` rendered *larger* than `display`.
- **The 16 metric selectors** → `metric` (30/36, tabular figures baked in). Retires the two 30px literals in `admin-pulse.css:23` and `guided.css:208`.
- **Delete the old tokens** from `tokens.css`: `--type-display`, `--type-h1/h2/h3/h4`, `--type-body`, `--type-body-sm`, `--type-body-md`, `--type-body-lg`, the four `--type-leading-*` legacy names, `--type-weight-bold`, `--font-mono`, the six `--type-tracking-*`.
- **Sweep the markup** — the 261 uses of `.h1 .h2 .h3 .h4 .text-display .lead .body .label .caption .eyebrow` become role names, then the alias block is deleted from `type.css`. Pure class rename, greppable, mechanical.
- **`admin/src/styles/design/chip-system.test.ts`** — its `inGroup()` regex reads `base.css`; the chip recipe now lives in `type.css`. Repoint it.
- **`admin/src/ui/notes-panel-utils.js:54`** reads `parseFloat(getComputedStyle(ta).lineHeight) || 22` for textarea auto-grow. Confirm it still grows correctly against absolute leadings — the `|| 22` fallback suggests it has returned `normal` in the past.

## Five corrections from the recon (2026-07-31)

1. **A phone regression nobody had flagged.** Deleting `mobile.css:349-353` removes the only phone override for `--type-display`, and `type.css`'s breakpoint block only drops `.type-heading-xl`. So the **welcome hero GROWS from 30.4px to 36px on a 390px screen**, and `.briefing-headline` and `.text-display` do the same. That is the exact failure Carl's 27 July phone shot motivated, and the same shape as the regression Phase 2 shipped and had to fix. **Add `.type-display` and `.type-heading-lg` to `type.css`'s phone block in the same commit.**
2. **Four of the six `--type-tracking-*` tokens are read by `type.css` itself** (`tighter`, `tight`, `wide`, `caps-lg`, at six call sites). Deleting all six as originally written would strip the tracking off `.type-display`, `.type-heading-xl`, `.type-heading-lg`, `.type-label`, `.type-overline` and `.type-metric` **with no lint error and no failing test**, because an invalid `var()` on a non-inherited property just computes to initial. **Only `--type-tracking-wider` and `--type-tracking-caps` are genuinely deletable.**
3. **`admin/tailwind.config.js` is an uncounted blocker.** Nine entries read retiring tokens and back roughly 181 live markup uses: `text-sm` ×107, `leading-normal` ×24, `leading-relaxed` ×15, `leading-snug` ×11, `text-xs` ×9, `leading-tight` ×7, `tracking-tight` ×5, `tracking-wide` ×3, `text-display` ×2. Only `xs` was named in any phase file. **None of the four legacy leading tokens or `--type-body-sm` can be deleted until all nine are repointed.**
4. **The markup rename is not mechanical.** Three sites build the class name dynamically and a `class="eyebrow"` search will not find them: `frontend/src/stages/preparation-brief.ts:123` (glued to a template interpolation, feeding ~25 call sites on the customer prep brief) and `admin/src/ui/skeleton-presets.ts:214` and `:230` (passed as a function argument). Miss the skeleton ones and the loading ghosts size differently from the cards they stand in for, which is the exact coupling `type.css` documents.
5. **`--type-body-sm` cannot be deleted here as originally scoped** — 431 consumers, of which Phase 3's widened scope now clears most. Re-count before deleting rather than assuming.

## Carried in from Phase 2's verification
- **`admin/src/stages/tests/runner-v2.js` still carries the old five-size stack** (32px stem, 17px hint, three 15px rows) under parallel `rv2-*` class names. It is the POC the Meeting screen was designed from, so it now shows a design the live screen deliberately no longer matches, and it holds five of the seven remaining non-token font hits in the whole tree. It is a parked gallery file, so this is a judgement call: either retire it here so the gallery stops contradicting the product, or leave it and say so plainly in the phase note.

## Not in this phase
- The PDF, the email layout and the two template-literal style blocks — Phase 6.
- Flipping guard rules to errors — Phase 6.

## Done when
- [x] The old tokens are deleted. The same grep, excluding the parked gallery, returns nothing outside `admin/src/stages/tests/parked-tokens.css`
- [x] Every alias class takes a role. `.h1 .h2 .h3 .h4 .text-display .lead .body .label .caption .eyebrow` are grouped into roles in `type.css` and declare nothing of their own; markup is untouched except the one hero
- [x] Textarea auto-grow still works in the notes panel. Typed by hand: `getComputedStyle().lineHeight` returns `"24px"`, the `|| 22` fallback never fires, the box grew 115.6px to 282px over 442 characters and capped at exactly 288px (12 × 24) before scrolling internally
- [x] `npm test` 219/219, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy`, `node scripts/test-design-guard.js`, `npm run build:all` all clean
- [ ] Screenshots. **Not done, and it is not possible in this session:** the Browser pane will not composite a frame here, so every screenshot times out. Everything above is a computed style read off the live page instead, which is stated wherever it is claimed
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
This is where headings change size. **Expect to see a difference.**

**Setup:** `local > Start Sero.bat > localhost:3000 > Dev login: Admin`

1. **The welcome screen** — the big heading comes down from about 42px to 36px. It should still feel like the biggest thing on the page. ❌ Not OK if it now looks like an ordinary heading.
2. **Page titles** — go to **Team**, then a **person's page**. Page titles land at 30px. ❌ Not OK if a title now looks the same size as the text under it.
3. **A person's name** — on their page, the name drops from about 36px to 24px. It should still clearly win against everything around it. ❌ Not OK if the name no longer stands out as the main thing on the page.
4. **Section and card headings** — inside a page, section headings are 24px and card headings 20px. Each level should be obviously different from the one below. ❌ Not OK if two levels look the same size.
5. **KPI numbers** — open the **Pulse** dashboard. The big numbers should be crisp and lined up in a column. ❌ Not OK if the digits jiggle horizontally as they change.
6. **Everything still works** — click into a run, open the notes panel, type a long note. The box should still grow as you type. ❌ Not OK if it stops growing or jumps.

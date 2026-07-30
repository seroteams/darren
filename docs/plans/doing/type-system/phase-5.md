# Phase 5 — Headings, metrics, and the markup sweep

**Part of:** [plan.md](plan.md) · **Status:** ⬜

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
- [ ] `grep -rn "type-h1\|type-h2\|type-h3\|type-h4\|type-body\|type-display\|type-leading-tight\|type-leading-snug\|type-leading-normal\|type-leading-relaxed" admin/src frontend/src` returns nothing
- [ ] The alias block is gone from `type.css`; markup uses role names only
- [ ] Textarea auto-grow still works in the notes panel — typed by hand, not assumed
- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy` clean
- [ ] Screenshots of each screen below saved to `proof/`
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

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

# Phase 1 — Build the three layers

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting walk

## Built (2026-07-30)

Full measurements: [proof/p1-invisibility.md](proof/p1-invisibility.md).

**Files:**
- `admin/src/styles/design/tokens.css` — Layer 1 added: seven locked size/leading pairs (Tailwind's defaults verbatim), `--type-family-base`, `--type-family-mono`, `--measure-narrow: 46ch`. **59 lines added, 0 removed or modified.**
- `admin/src/styles/design/type.css` — new, 220 lines. Fourteen `.type-*` role classes, two `.type-body` modifiers, fourteen `--type-role-*` composites, one phone breakpoint block. Zero literal sizes, weights, leadings or tracking: every value is a `var()`.
- `admin/src/styles/design.css` — one import at line 23, deliberately **before** `base.css` so the roles lose every same-specificity tie.
- `scripts/lint-design-tokens.js` — made requireable (the walk now sits behind `require.main === module`, removing the hazard CLAUDE.md still flags for `gate.js`), plus a unit-aware size resolver and nine new type rules as warnings.
- `scripts/test-type-rules.js` — new, 60 assertions, auto-discovered by `npm test`.
- `scripts/test-design-guard.js` — ceilings for the nine new rules, frozen at today's measured counts.
- `frontend/src/stages/preparation-css.test.ts` — rewritten. It was a closed hardcoded allowlist that broke on every legitimate token addition and still listed three tokens that no longer exist; it now parses `tokens.css` at test time.

**Invisibility, measured on the running page:** `.type-heading-xl` injected live computes to 30/36/600, so the layer genuinely loaded. All fourteen role classes match **zero** live elements. The ten existing treatment classes compute exactly as before (`.h1` 42px Bricolage, `.h2` 36px, `.h3` 20px, `.h4` 18px, `.lead` 18px, `.body` 16px, `.label` 14px/500, `.caption` 14px, `.eyebrow` 14px/600/caps). `base.css` is byte-identical to Phase 0.

**Adversarial review found four real defects, all fixed before this was handed over.** The 14px floor was still px-only and blind to the `font:` shorthand, which mattered because this phase published composites designed for exactly that syntax. Two ceilings traded against each other, so following the guard's own advice broke the build. On-rung rem literals were invisible to every counter, so the migration could be faked. And a test claimed to guard `type.css` while testing a hand-copied excerpt of it. Details in the proof file.

**Offline proof:** `npm test` 218/218, typecheck clean, `lint:tokens` PASS, `lint:copy` PASS, design guard ok across 9 rules.

**Not verified by screenshot.** The Browser pane would not composite this session. Every claim above is a computed-style read from the real running page or a command against the real repo. The scenarios below are the eye check.

## Goal
Stand up the scale, the fourteen roles and the type layer alongside the existing system, so that nothing on screen moves but everything is ready to migrate onto.

## Changes
- **`admin/src/styles/design/tokens.css`** — add Layer 1: Tailwind's scale as seven locked size/leading pairs (14/20, 16/24, 18/28, 20/28, 24/32, 30/36, 36/40), plus `--type-family-base` and `--type-family-mono`. The 12px step is deliberately not defined. The old tokens stay for now: additive only.

  **Correction (2026-07-30):** this originally said Layer 1 would carry three measures at `66ch`, `46ch` and `72ch`. Only **one new token ships: `--measure-narrow: 46ch`**. The three existing measures (`--measure: 38rem`, `--measure-tight: 32rem`, `--measure-lede: 44rem`) are left alone until Phase 3/4, because `--measure` is 608px against roughly 580px for 66ch and it is read by CSS call sites plus five `max-w-measure` utilities. Re-pointing it here would have moved real screens, which is the one thing this phase may not do.
- **`admin/src/styles/design/type.css`** — new file, Layer 2 + 3. The fourteen role classes (`display`, `heading-xl/lg/md/sm/xs`, `body-lg/body/body-sm`, `label`, `label-strong`, `overline`, `code`, `metric`), the composite `--type-role-*` tokens, and one documented phone breakpoint block.

  **Correction to the original plan (2026-07-30):** the plan said this phase would also re-point the ten existing treatment classes (`.h1 .h2 .h3 .h4 .text-display .lead .body .label .caption .eyebrow`) at the new roles as aliases. That contradicts this phase's own pass condition. `.h1` currently resolves to `--type-display` (30–42px fluid); `heading-xl` is 30/36 fixed — re-pointing it would move every page title in the app, which is a Phase 5 change Carl expects to see, not a Phase 1 one he expects to be invisible. So **the existing classes are left completely untouched in `base.css`**. Nothing aliases, nothing bridges: the new roles simply sit unused beside the old system until Phase 2 starts consuming them. Markup saying `class="h1"` keeps working from `base.css` exactly as today, right up to the Phase 5 sweep.
- **`admin/src/styles/design.css`** — import `type.css` second, straight after `tokens.css`.
- **`scripts/lint-design-tokens.js`** — wrap the walk in `if (require.main === module)` and export the rule functions. Add the eight new rules as **warnings only**, with today's counts frozen as ceilings.
- **`scripts/test-type-rules.js`** — new, test-first. Each rule asserted against inline fixture strings. Auto-discovered by `scripts/run-tests.js`.
- **`frontend/src/stages/preparation-css.test.ts`** — rewrite. Its `TOKEN_PX` allowlist is closed, fails on `clamp()`, and still lists three tokens (`--type-caption`, `--type-label`, `--type-lead`) that no longer exist.

## Not in this phase
- Migrating a single component onto a role. Nothing consumes the new layer yet.
- Deleting any old token or class. Removal happens in Phase 5.
- Turning any guard rule into an error. That is Phase 6.

## Done when
- [ ] `type.css` defines exactly fourteen roles, and every one resolves to a size/leading pair from Layer 1 — no literals
- [ ] Every existing treatment class renders identically to before: `.h1 .h2 .h3 .h4 .text-display .lead .body .label .caption .eyebrow` compared computed-style-to-computed-style against the Phase 0 build, on the real page
- [ ] No new selector in `type.css` matches any element the app currently renders — the roles are inert until Phase 2
- [ ] `npm test` green including the new `test-type-rules.js` and the rewritten `preparation-css.test.ts`
- [ ] `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy` clean
- [ ] Six screenshots pixel-identical to Phase 0's, saved to `proof/`
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
This phase is deliberately invisible. You are checking that **nothing changed**.

**Setup:** `local > Start Sero.bat > localhost:3000 > Dev login: Manager`

1. **Sign in screen** — sign out, look at the sign-in page. It should look exactly as it did yesterday. ❌ Not OK if any heading or label has changed size.
2. **Start / welcome** — the big welcome heading should be the same size it was. ❌ Not OK if it is bigger or smaller.
3. **Team list** — names, roles and the column headers all unchanged. ❌ Not OK if row heights have shifted.
4. **A meeting run** — start a 1:1 and reach the question screen. Unchanged. ❌ Not OK if anything moved.
5. **Customer app** — `localhost:3002`, Dev login: Member. Open a guided run. Unchanged. ❌ Not OK if anything moved.

If you spot **any** visible difference on this phase, that is a fail — tell me what moved and I'll find the leak.

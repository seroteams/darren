# Phase 1 — Build the three layers

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Stand up the scale, the fourteen roles and the type layer alongside the existing system, so that nothing on screen moves but everything is ready to migrate onto.

## Changes
- **`admin/src/styles/design/tokens.css`** — add Layer 1: Tailwind's scale as seven locked size/leading pairs (14/20, 16/24, 18/28, 20/28, 24/32, 30/36, 36/40), the three family tokens, three weights, three measures (`66ch`, `46ch`, `72ch`). The 12px step is deliberately not defined. The old tokens stay for now — additive only.
- **`admin/src/styles/design/type.css`** — new file, Layer 2 + 3. The fourteen role classes (`display`, `heading-xl/lg/md/sm/xs`, `body-lg/body/body-sm`, `label`, `label-strong`, `overline`, `code`, `metric`), the composite `--type-role-*` tokens, one documented phone breakpoint block, and the ten existing treatment classes (`.h1 .h2 .h3 .h4 .text-display .lead .body .label .caption .eyebrow`) re-pointed at roles as aliases so nothing breaks mid-migration.
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
- [ ] The alias classes render identically to before: `.h1`, `.eyebrow`, `.label`, `.caption`, `.body` compared computed-style-to-computed-style against the Phase 0 build
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

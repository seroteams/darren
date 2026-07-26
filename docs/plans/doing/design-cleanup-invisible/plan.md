# Design system clean-up — the invisible pass

**Status:** P0 ✅ · P1 ✅ · P2 ✅ · P3 ✅ · P4 built, awaiting Carl's sign-off
**Owner session:** 3a8bfd02 · **Started:** 2026-07-26 · **Cost:** £0 (free checks only)

## Why

A deep audit (2026-07-26) of the token layer, the component layer and the guards found the
colour discipline genuinely clean, but a thick layer of things that exist and do nothing:

- **54 of 309 tokens referenced nowhere.** Whole dead families: `--sero-teal-*` (11/11),
  `--sero-state-*` (9/9), `--sero-breakpoint-*` (5/5, structurally unusable — custom properties
  don't work in `@media`), `--sero-elevation-*` (4/4), `--sero-block-*` (6/6).
- ~~70 dead colour ramp steps of 122~~ — **wrong, corrected in P2.** The Design system screen
  renders all 121 swatches by building token names at runtime, so a plain text search couldn't see
  the consumer. The ramps stay whole.
- **69 tokens (22%) are pure `--x: var(--y)` aliases**; three duplicate namespaces
  (`--space-*`/`--sero-space-*`, `--radius-*`/`--sero-radius-*`, `--shadow-*`/`--sero-shadow-*`).
- **Four token names for one 14px value** plus 52 hardcoded `14px` literals.
- **The customer app downloads the admin design system** — `frontend/dist` CSS is 153,677 B vs
  admin's 154,060 B, and the 1,002-line internal design-system browser ships to customers.
- **Tailwind generates ~380 utilities; markup uses 3.**
- **Neither guard runs automatically**, and `npm run lint:tokens` hides its own counts.
- **DESIGN.md states things that are not true** (Flowbite base, a component sheet that no longer
  exists, the wrong tokens path, an exemption for files that were deleted).

## Carl's call (2026-07-26)

**Invisible pass only.** Six phases that change zero pixels, then look again before touching
anything visible. Start now, don't wait for the audit-fixes-jul-25 walk.

**Parked for a later decision:** the type-ladder inversion (`--type-h1` renders larger than
`--type-display`), the banned 15px/17px tokens, radius normalisation, the destructive delete
dialog that bypasses the house confirm box, the missing toast.

## Phases

| # | Phase | Changes pixels? | Proof | Status |
|---|---|---|---|---|
| P0 | [Make the docs true](phase-0-docs.md) | no | grep returns nothing; both linters still PASS | ✅ signed off 2026-07-26 |
| P1 | [Make the guards bite](phase-1-guards.md) | no | `npm test` runs the design guard | ✅ signed off 2026-07-26 |
| P2 | [Delete the provably dead](phase-2-dead-tokens.md) | no | built CSS byte-identical outside `:root` | ✅ signed off 2026-07-26 |
| P3 | [One namespace per concept](phase-3-namespaces.md) | no | identical resolved-value map | ✅ signed off 2026-07-26 (partial: 6 files lane-blocked, needs a P3b) |
| P4 | [One name per size](phase-4-sizes.md) | no | resolved-value map + guard ceiling 68 → 13 | ✅ built, awaiting sign-off |
| P5 | [Admin CSS out of the customer bundle](phase-5-bundle.md) | no | `ds-layout` gone from `frontend/dist`; 4 screenshots | ⬜ |

## Baseline

Before any edit (2026-07-26): 76 non-token font-sizes · 55 literal border-radii · 138 off-grid
spacing declarations, both linters PASS.

After P1 reconciled the allowlist with DESIGN.md §6 (the `stages/gallery/` exemption the guard
was missing, minus the dead `universe.*` one): **68 · 53 · 135**. These are now the ceilings
enforced by `scripts/test-design-guard.js` inside `npm test`. Each later phase lowers whichever
ceiling it earns, in the same commit.

Built CSS baseline is captured fresh at the start of P2 (parallel chats move the tree daily, so
a stale baseline would be worthless).

## Lanes

**Claimed by this session:** this plan folder, `admin/src/styles/design/tokens.css`,
`admin/src/styles/design.css`, `admin/src/styles/DESIGN-SYSTEM.md`, `admin/tailwind.config.js`,
`scripts/lint-design-tokens.js`, `scripts/lint-copy.js`, `scripts/test-design-guard.js`, `DESIGN.md`.

**Off limits** (other live chats): `design/primitives.css`, `design/session-topbar.css`,
`design/app-nav.css`, `ui/session-topbar.js`, `frontend/src/router.js` · `styles/coach-panel.css`,
`ui/coach-panel*.ts`, `stages/questioning.js` · `design/admin-tables.css` ·
`styles/test-gallery.css`, `stages/test.js` · `admin/src/ui/modal-shell.ts`.

Re-read `LANES.md` at the start of every phase — it moves daily.

## Risks

1. **Silent breakage.** CSS has no type system and there are no visual-regression tests. Every
   deletion is preceded by a mechanical selector/token grep across **both** app trees, and every
   phase signs off on a built-CSS diff, not a claim. Unexpected diff = stop the phase.
2. **Lane collisions.** `tokens.css` is the hottest file in the repo. If it shows changes this
   session didn't make, re-baseline before continuing.
3. **Rubber-stamping.** Five phases with nothing to look at. Each sign-off is a specific number
   in a pasted command output, not "it passed".

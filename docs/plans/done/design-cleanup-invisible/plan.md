# Design system clean-up — the invisible pass

**Status: ✅ CLOSED 2026-07-27 — all six phases green-lit in two days.**
**Owner session:** 3a8bfd02 · **Started:** 2026-07-26 · **Cost:** £0 (free checks only, no paid run)

## Current state

Done and signed off. What landed, in one list:

| | Before | After |
|---|---|---|
| Design tokens | 309 | **250** |
| Tokens referenced nowhere | 54 | **0** |
| Names for one 14px size | 4 | **1** |
| Namespaces for radius / shadow | 2 each | **1 each** |
| Tailwind config | 211 lines, ~380 generated utilities | **74 lines, 9 used** |
| First-paint stylesheet, customer | 157,894 B | **129,423 B (−18%)** |
| Non-token font sizes | 76 | **13**, all off-ladder |
| Design guards running automatically | none | **`npm test` + CI, as a ratchet** |

Every phase proved itself against the built CSS rather than by claim: `:root` compared separately
from the rules, and for the renames every `var()` chain resolved to a literal first. No screen
changed.

**Three things the audit got wrong, corrected in flight:**
1. The "70 dead colour ramp steps" were not dead. The Design system screen renders all 121
   swatches by building token names at runtime. Deleting them would have left 70 blank chips.
2. The Tailwind config, not the app, was the only consumer of ~40 "live" tokens. Trimming it first
   is what exposed them.
3. Unhooking `design-stage.css` needed four component families promoted out of it first, not one.
   `.ds-alert` on the customer Team screen was the loudest.

**One mistake, on the record:** the P3 commit swept 57 lines of another session's uncommitted
start-screen work. Not lost, on `main`, but filed under the wrong phase. The rule it earned is in
`phase-3-namespaces.md`.

## What's next (not started, needs Carl)

- **P3b — finish the namespace collapse.** ~150 call sites (`--sero-radius-full` 87,
  `--sero-radius-sm` 34, `--sero-shadow-focus` 16, `--color-page` 11) plus three temporary bridge
  tokens in `tokens.css`, each marked with the lane that blocked it. Same proof method. Do it when
  the lanes clear.
- **The visible pass.** The type ladder is still inverted at the top (`--type-h1` renders larger
  than `--type-display`), 15px and 17px still exist against DESIGN's own T2, 22 off-spec radii
  remain, and DESIGN.md §3 still carries the "Known drift" note describing it. The guard now counts
  all of it: 13 font sizes, 53 radii, 135 off-grid spacings. Needs screenshots, so it is a
  separate plan.

**No board.html for this track.** `scripts/plan-board.js` reads `phase-N.md`; these files are named
`phase-N-<topic>.md` and are referenced by name in six commit messages, so renaming them to suit the
generator would cost more than the board is worth on a track with nothing to look at.

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
| P4 | [One name per size](phase-4-sizes.md) | no | resolved-value map + guard ceiling 68 → 13 | ✅ signed off 2026-07-27 |
| P5 | [Admin CSS out of the customer bundle](phase-5-bundle.md) | no | both bundles −18%; `ds-layout` gone from the customer build; live computed styles | ✅ signed off 2026-07-27 |

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

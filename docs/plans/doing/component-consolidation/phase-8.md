# Phase 8 — The guard, so it cannot drift back

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal

Make it impossible to quietly hand-roll these again.

Everything in phases 1 to 7 could be undone by one person typing `<button class="btn">` next month, and **neither existing linter would notice**. `lint:tokens` and `lint:copy` have no concept of a component: a hand-rolled button with tokenised CSS passes both today.

The proof this approach works is already in the repo: `admin/src/styles/design/chip-system.test.ts` is a source-reading guard that fails if a chip family re-declares its own geometry, and it is why the chip CSS never drifted while the chip markup did.

## Changes

- New `scripts/lint-components.js` and `npm run lint:components`. Pure Node, no dependencies, free, same skeleton as `scripts/lint-design-tokens.js`.
- Fails on: a `modal-backdrop` created outside `modal-shell.ts`; a `class="btn"` string outside `button.ts`; a locally defined `initialOf`; a second copy of the logo SVG.
- Explicit allowlist for the DESIGN.md §6 exemptions (`dev-badge.js`, `build-stamp.js`, `universe.ts`, `design.js`, `gallery/`), plus a `lint-components-ignore` per-line waiver, matching how the other two linters work.
- Fix the stale design docs this work exposed: DESIGN.md still points at `admin/public/sero-flowbite/index.html`, which was deleted in commit `5edacbea`. `admin/src/styles/DESIGN-SYSTEM.md` contradicts `tokens.css` on caption, label and display sizes.

## Not in this phase

- Any check that renders or measures pixels. Parked by prior ruling.
- Widening `lint:copy` to the backend. Owned by audit-fixes-jul-25 Phase 5.

## Done when

- [ ] `npm run lint:components` passes on the clean repo.
- [ ] Deliberately reintroducing each violation makes it fail, one at a time. Proof pasted in the phase file.
- [ ] DESIGN.md and DESIGN-SYSTEM.md no longer point at things that don't exist.
- [ ] `npm test`, `npm run typecheck` clean.
- [ ] Carl has tested the scenarios below and said go.

## Test scenarios — for the product owner

This one is a terminal check, not a click-walk.

1. **It passes** — run the command below on the tidy repo. You get a pass.

```bash
npm run lint:components
```

2. **It catches things** — I will show you, in chat, the linter failing on a deliberately broken copy of each of the four rules, then passing again once removed.
3. **It doesn't nag** — the full free check set still passes end to end.

```bash
npm test && npm run typecheck && npm run lint:tokens && npm run lint:copy && npm run lint:components
```

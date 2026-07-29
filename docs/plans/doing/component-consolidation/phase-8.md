# Phase 8 — The guard, so it cannot drift back

**Part of:** [plan.md](plan.md) · **Status:** ✅ done (tested)

## ✅ GREEN-LIT 2026-07-27 — Carl ran `npm run lint:components` and got the pass (commit 99422a66)

## Built (2026-07-27)

- `npm run lint:components` — a free, dependency-free guard that fails the build on hand-rolled components
- Five rules, one per thing Phases 1 to 3 consolidated
- Proved by reintroducing each violation one at a time and watching it fail, then pass again
- 18 known leftovers recorded WITH their reasons, so the guard passes today and a new one still fails
- The exemption list cannot rot: a KNOWN entry that stops matching also fails the build

**New:** [scripts/lint-components.js](../../../../scripts/lint-components.js) (~200 lines, pure Node, same skeleton as `lint-design-tokens.js`) plus the `lint:components` script in `package.json`.

### Why it was needed

Neither existing linter has any concept of a component. A hand-rolled `<button class="btn">` with perfectly tokenised CSS passes `lint:tokens` and `lint:copy` clean. That blind spot is how the app got to 223 hand-typed button strings, nine copies of the initials helper, and five copies of the modal focus trap with two different selector lists. Phases 1 to 3 collapsed those; without a guard, one person typing the old markup next month quietly undoes it.

### The five rules

| Rule | Fails on | Owner module |
|---|---|---|
| `hand-rolled-button` | a `<button>` with a standalone `btn` class | `ui/button.ts` |
| `hand-rolled-modal` | a `modal-backdrop` built anywhere else | `ui/modal-shell.ts` |
| `own-focus-trap` | a local `getFocusables` (the exact P1 bug) | `ui/modal-shell.ts` |
| `local-initials` | a local `initialOf` / `initials` helper | `ui/avatar.ts` |
| `duplicate-logo` | a second copy of the brandmark rect | `ui/app-nav.js`, until P7 |

### Two things the first draft got wrong, caught by running it

**`btn` is the wrong boundary.** It also matches inside `row-menu-btn`, `um-menu-btn`, `copy-snippet-btn` and `js-btn-label` — separate CSS families, and in one case my own `button()` call. The rule now requires a `<button` element and uses `(?<![\w-])btn(?![\w-])`, so hyphenated families are out. It also excludes `<a class="btn">` anchors, which are a full-page navigation.

**The owner pattern was too loose.** `ui/app-nav.js` matched the customer app's fork as well as admin's, so one of the duplicates the logo rule exists to count was being skipped as its own owner. Anchored to `admin/src/ui/app-nav.js`.

Both were only visible by running the thing on the real tree. A linter you have not watched fail is not a linter.

### Proof

| Check | Result |
|---|---|
| `npm run lint:components` on the clean tree | PASS, 18 known exemptions, exit 0 |
| All 5 rules reintroduced at once in a scratch file | FAIL, all 5 reported by name and line, exit 1 |
| `lint-components-ignore` on one of those lines | 5 violations drop to 4 |
| Scratch file restored | PASS again, `git status` clean |
| `npm test` | 196/196 |
| `npm run typecheck`, `lint:tokens`, `lint:copy` | all clean |

### Noted while building: one P1 site is gone

`admin/src/ui/stage-review.js` — one of the three overlays Phase 1 gave a keyboard trap — no longer exists. Another chat's `stage-back-nav` work replaced that overlay with a real screen, and updated `modal-shell.test.ts` accordingly. Nothing to fix: the guard scans 145 files and still passes, and the modal-shell test is 8/8. Recorded so the P1 write-up is not read later as describing a file that is not there.

### Left out, and why

The stale-doc fixes this phase also scoped (DESIGN.md still points at the deleted `admin/public/sero-flowbite/index.html`; `DESIGN-SYSTEM.md` contradicts `tokens.css` on caption/label/display sizes) are **not done**: both files are held by lane `3a8bfd02` (design system clean-up), which is very likely fixing them already. Recorded rather than edited through.

## Goal

Make it impossible to quietly hand-roll these again.

Everything in phases 1 to 7 could be undone by one person typing `<button class="btn">` next month, and **neither existing linter would notice**. `lint:tokens` and `lint:copy` have no concept of a component: a hand-rolled button with tokenised CSS passes both today.

The proof this approach works is already in the repo: `admin/src/styles/design/chip-system.test.ts` is a source-reading guard that fails if a chip family re-declares its own geometry, and it is why the chip CSS never drifted while the chip markup did.

## Changes

- New `scripts/lint-components.js` and `npm run lint:components`. Pure Node, no dependencies, free, same skeleton as `scripts/lint-design-tokens.js`.
- Fails on: a `modal-backdrop` created outside `modal-shell.ts`; a `class="btn"` string outside `button.ts`; a locally defined `initialOf`; a second copy of the logo SVG.
- Explicit allowlist for the DESIGN.md §6 exemptions (`dev-badge.js`, `build-stamp.js`, `universe.ts`, `design.js`), plus a `lint-components-ignore` per-line waiver, matching how the other two linters work. *(`gallery/` was in this list until the Screens feature was deleted 2026-07-29.)*
- Fix the stale design docs this work exposed: DESIGN.md still points at `admin/public/sero-flowbite/index.html`, which was deleted in commit `5edacbea`. `admin/src/styles/DESIGN-SYSTEM.md` contradicts `tokens.css` on caption, label and display sizes.

## Not in this phase

- Any check that renders or measures pixels. Parked by prior ruling.
- Widening `lint:copy` to the backend. Owned by audit-fixes-jul-25 Phase 5.

## Done when

- [x] `npm run lint:components` passes on the clean repo.
- [x] Deliberately reintroducing each violation makes it fail. All five proved; the per-line waiver proved too.
- [ ] DESIGN.md and DESIGN-SYSTEM.md no longer point at things that don't exist. **HELD** — lane `3a8bfd02`.
- [x] `npm test` 196/196, `npm run typecheck` clean.
- [x] Carl has tested the scenarios below and said go.

## Test scenarios — for the product owner

This one is a terminal check, not a click-walk.

1. **It passes** — run the command below. You should see `PASS — no hand-rolled components.`

```bash
npm run lint:components
```

2. **It catches things** — already proved above: all five rules were reintroduced, all five failed by name, then passed again once removed.
3. **It doesn't nag** — the full free check set still passes end to end.

```bash
npm test && npm run typecheck && npm run lint:tokens && npm run lint:copy && npm run lint:components
```

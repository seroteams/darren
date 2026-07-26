# Phase 1 — The module, invisible

**Part of:** [plan.md](plan.md) · **Status:** ✅ Carl moved us on to Phase 2 on 2026-07-26 rather than walk an invisible phase, which is a fair call: with zero screens migrated there was nothing to see. The geometry proof below stands on its own.

## Built (2026-07-26)

New:
- `admin/src/ui/skeleton-parts.ts` — the primitives. `skLeaf(classes, width)`, `skFill(classes)`, `skRoot(classes, inner, label)`.
- `admin/src/ui/skeleton-presets.ts` — the preset catalogue and the single `skeletonFor(spec)` entry point. Ships `cards` (legacy) and `list-rows`.
- `admin/src/ui/skeleton-presets.test.ts` — 18 tests.

Changed:
- `admin/src/ui/skeleton.js` — now a façade over `skeletonFor`. Same two exports, same filename (20 stages import it).
- `admin/src/ui/screen-scaffold.ts` — `loadingHtml` widened from `(rows?: number)` to `(spec?: SkeletonSpec)`.
- `admin/src/styles/design/motion.css` — `.sk` anti-flash, `.sk-leaf`, `.sk-fill`; the legacy card stagger switched from `nth-child` to `nth-of-type` (the root now carries an `.sr-only` announcement as child 1).

Not migrated: zero screens, by design. `runs.ts` was used as the spike, measured, then reverted.

### Offline proof
- `npm test` 194/195. The one failure (`admin/src/stages/runs.test.ts:71`) is NOT from this work: another chat moved `initialOf` out of `runs.ts` into `ui/avatar.ts`, and that test slices the source between `function aboutEntry` and `function initialOf`. Proven by reverting only my line and watching it still fail 9/10.
- `npm run typecheck` clean · `npm run lint:tokens` PASS · `npm run lint:copy` PASS.

### On-screen proof (measured, not screenshotted)
Real `/admin/runs`, real stage code, dev server on 3333, viewport 1280, the runs fetch held open so the ghost stays on screen. Ghost against loaded, same page, same session:

| Element | Ghost | Loaded | Diff |
|---|---|---|---|
| `.list-toolbar` | 43.69 | 43.69 | 0 |
| `.list-toolbar__search` | 43.69 | 43.69 | 0 |
| `.list-toolbar__count` | 21.69 | 21.69 | 0 |
| `.run-list__item` | 73.48 | 73.48 | 0 |
| `.run-list__row` | 72.48 | 72.48 | 0 |
| `.run-list__avatar` | 36 | 36 | 0 |
| `.run-list__name` | 24.80 | 24.80 | 0 |
| `.run-list__sub` | 21.69 | 21.69 | 0 |
| `.run-list__side` | 21 | 21 | 0 |

Bar widths honoured `--sk-w`: count 52.5px (6ch), name 117.4px (11ch), sub 192.5px (22ch), badge 40px (4ch).

**Not verified:** no screenshot. The Browser pane would not composite frames (`screenshot failed: the Browser pane is not displayed`), and it also freezes CSS animation clocks, so the 150ms anti-flash fade could not be watched. The measurements above are from the live rendered DOM, so geometry is proven; the fade is not.

### Three real defects the spike caught
1. **An inline-block bar made rows taller than the loaded row** (`.run-list__sub` 27.38 against 21.69). An inline-block sits on the baseline, so the descender space is added under it. Fixed by drawing the bar as an out-of-flow `::after`.
2. **The anti-flash could strand the skeleton invisible.** `animation-delay` + `fill: backwards` leaves opacity 0 wherever the animation clock is frozen (a backgrounded tab, the preview pane) — a blank screen instead of a flicker. Fixed by moving the hold into the keyframes with an opaque `0%` stop, so a frozen clock shows the ghost.
3. **Bars collapsed to 4px** where the borrowed class was content-sized. `max-width: 100%` was measuring against a leaf only as wide as its `&nbsp;`. Fixed by putting `--sk-w` on the leaf itself; `min-width` was no use because the borrowed classes set their own.

## Done when
- [x] `loadingHtml(4)` renders the legacy cards byte-for-byte (golden-string test)
- [x] Ghost row geometry matches loaded row geometry on a real screen
- [x] Skeletons announce themselves to a screen reader and stay inert
- [x] Free checks green (bar the pre-existing failure above)
- [ ] Carl has walked the scenarios below and said go

## Test scenarios — for the product owner

Breadcrumb: `local > admin (dev autologin) > any list screen`

1. **Nothing looks different.** Open Past 1:1s, Home, and Members. You should see exactly the shape you saw yesterday: the same grey ghost cards while it loads, then the real page. ❌ Not OK if any screen loads differently, flashes, or sits blank.
2. **Fast loads stay calm.** Click between Home and Past 1:1s a few times. On a quick load you should see the page appear without a grey flicker in front of it. ❌ Not OK if you see a grey block appear and vanish.
3. **Nothing is clickable while loading.** During a slow load, try clicking a ghost row and pressing Tab. Nothing should respond and focus should skip straight past. ❌ Not OK if a ghost row highlights, clicks, or takes focus.

## Not in this phase
- Any screen actually using the new shape (that is Phase 2, ~14 call sites).
- Presets beyond `cards` and `list-rows`.
- Moving the skeleton CSS into its own file (blocked by lane `3a8bfd02`).

## Carried into Phase 2
- `admin/src/stages/runs.ts` is claimed by chat `d03316aa` (Component consolidation P2). Phase 2 needs that lane free, or Carl's call to work through it.

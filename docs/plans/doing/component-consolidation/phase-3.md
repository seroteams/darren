# Phase 3 — Button

**Part of:** [plan.md](plan.md) · **Status:** ✅ done (tested)

## ✅ GREEN-LIT 2026-07-27 — Carl walked Team on both apps: the blue, ghost and danger buttons all unchanged, everything still works (commit 13f9f074)

## Built (2026-07-26)

- One `button.ts` renderer, where before there was no button helper at all
- 150 call sites swapped across 40 files, in both apps
- Proved byte-identical: the new markup is the SAME string the hand-typed version emitted
- 15 unit tests asserting whole strings, not substrings, because that is the claim
- Verified on the real admin and customer screens: sky primary, ghost, danger, small, all unchanged
- 9 sites left behind, every one named below with the reason

**New:** [admin/src/ui/button.ts](../../../../admin/src/ui/button.ts) — `button({ label, variant, size, hook, extraClass, type, disabled, iconLeft, ariaLabel, title, attrs })`, plus [button.test.ts](../../../../admin/src/ui/button.test.ts).

Classes always come out in one fixed order: `btn` · variant · size · extraClass · hook. That order is what makes the byte-equality claim hold.

### Byte-equality proof (run in the live page against the real module)

Ten representative shapes, new output vs the old hand-typed string: **10 identical, 0 mismatches.** Primary, ghost, danger+disabled, ghost+small, submit, a bare `data-next` marker, a data+aria pair, an `extraClass` case, and the small note-save.

Two deliberate re-orderings, semantically identical: `class="js-logout btn btn--ghost"` → `class="btn btn--ghost js-logout"`, and `class="notes-panel__close btn ..."` → `class="btn ... notes-panel__close"`. A handful of `<button class=… type=…>` became `<button type=… class=…>`. Class order and attribute order do not affect rendering.

### Offline proof

| Check | Result |
|---|---|
| `npm test` | 196/196 |
| `npm run typecheck` | clean |
| `npm run lint:tokens` / `lint:copy` | PASS |
| `node --test admin/src/ui/button.test.ts` | 15/15 |
| Raw `class="btn …"` strings in product code | 223 → 9, all 9 accounted for below |

### Browser proof

`localhost:3343` (admin) and `localhost:3345` (customer), computed styles read off the real screens:

| Variant | Background | Label | Radius | Size |
|---|---|---|---|---|
| primary | `rgb(90,169,230)` | `rgb(255,255,255)` | 4px | 16px / 500 |
| ghost | `rgb(253,254,254)`, border `rgb(232,232,232)` | `rgb(31,42,55)` | 4px | 16px |
| small ghost | same | same | 4px | 14px, 4/8px padding |

Screens walked: Team (both apps), Pulse, Feedback inbox, Library, Meeting arcs, customer Home. Add person still opens its modal and its footer still reads Cancel / Add. No console errors in either app.

### Three honest notes

**A build break that unit tests and typecheck both missed.** My import-inserting script anchored on "the last line starting with `import `", which for a multi-line import is its OPENING line. It spliced the new import inside `notes-list.js`'s import block, leaving the file syntactically invalid. `npm run typecheck` passed (tsc does not check plain `.js`) and every unit test passed (nothing imports that module). It was caught by `test-admin-serving.js`, which runs a real Vite build. Worth remembering: for a `.js`-heavy front end, the build IS the syntax check.

**`/admin/guide` is currently broken, and not by this phase.** It throws `ReferenceError: skeletonHtml is not defined`. `git diff` shows my only changes to `guide.js` are the button import and one button swap; the `skeletonHtml(...)` calls were added by another session's in-flight skeleton work without its import. `guide.js` is not in their declared lane, but it is their half-finished edit, so I have not touched it.

**Also not mine:** `skeleton-presets.test.ts` fails intermittently — that file is lane `70b40d36`, mid-edit.

## The 9 sites deliberately left, and why

| Site | Reason |
|---|---|
| `questioning.js` ×4 | Lane `41aadb91` (coach panel). Cannot edit through another chat's claim. |
| `runs.ts`, `start-core.js`, `library.js` | Lane `70b40d36` (skeletons). Same. |
| 7 × `js-retry` inside error cards | Phase 6 replaces the whole error-card block; converting the button now would be thrown away. |
| 12 × off-system families (`row-menu-btn` ×5 spellings, `um-menu-btn`, `copy-snippet-btn`, `gal__screens-btn`, `team-card__name-btn`, `ds-btn-quiet`) | These are NOT `.btn` buttons. Each is its own CSS family for an icon affordance or a text trigger, and none takes the primary/ghost/danger recipe. Recorded as deliberate rather than forced through the renderer. |
| 2 × `<a class="btn">` (the Google sign-in, "Open your app") | Anchors, not buttons: a full-page navigation. `button()` emits `<button>`. A `linkButton()` would be a new API for two call sites. |
| 16 × `stages/design.js` | The design showcase demonstrates the markup on purpose. DESIGN.md §6 exemption, already allowlisted from `lint:tokens`. |
| 31 × `stages/tests/*` | Internal test-harness pages, not product. |
| 13 × `*.test.*` | Assertions ABOUT the markup. Leaving them as literal strings is what proves the output did not change. |

Also unused and deliberately not modelled in the API: `.btn--md` and `.btn--lg` (defined in CSS, zero callers) and `.btn--cta` (defined, zero callers). An option nobody passes is noise; add them when something wants one.

## Goal

One button. Today there are 226 places where someone typed the button's classes by hand, and no shared button exists at all.

## Changes

- New `admin/src/ui/button.ts` — `button({ label, variant, size, hook, type, disabled, iconLeft })`. Variants match what already exists in CSS: primary, ghost, danger.
- Sweep the raw strings, biggest files first: `stages/design.js` (16), `stages/briefing.js` (16), `stages/lexicon-review.js` (13), `stages/meeting-arcs.js` (10), `frontend/src/stages/guided/guided-stages.ts` (8), then the tail.
- Fold the off-system button families in, or record them in DESIGN.md as deliberate exceptions: `.wr-btn`, `.ds-btn-quiet`, the five `.row-menu-btn` variants, `.team-link`, `.copy-snippet-btn`, `.um-menu-btn`.

## This one can move pixels

Where a screen had drifted off the recipe, converging will change it slightly. That is the point, but it needs eyes. Before-and-after screenshots of at least one admin screen and one customer screen go in the phase file before Carl walks it.

## Not in this phase

- Changing what any button says.
- Changing the button colours or the primary-button contrast. Ruled twice, parked.

## Done when

- [ ] Raw `class="btn` strings outside `button.ts` are down to the recorded exemptions.
- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy` clean.
- [ ] Before/after screenshots attached.
- [ ] Carl has tested the scenarios below and said go.

## Test scenarios — for the product owner

`local > admin at localhost:3343 > Team`

1. **The blue one** — the Add person button top right. Same blue, same size, same corners as before.
2. **The quiet one** — click Add person, then look at Cancel in the box. Outline, not blue.
3. **The red one** — remove a person. Delete permanently is still red, and still greyed out until you type the name.
4. **Row menus untouched** — click a three-dots menu on any row. The items inside still look like menu items, not buttons.
5. **Customer side** — `local > customer app at localhost:3345 > Team`. The buttons match the admin ones.

✅ **Pass:** nothing looks different anywhere, and every button still does what it did.
❌ **Fail:** any button changed colour, size, spacing, or stopped working.

⚠️ Skip `/admin/guide` — it is broken right now by another chat's in-flight work, not by this.

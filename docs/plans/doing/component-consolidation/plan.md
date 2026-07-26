# Component consolidation — one source per UI part

**Goal:** every repeated UI part (modal, button, card, empty state, chip, field, avatar, nav, router) has ONE owner module that every screen calls, with a lint guard that stops it drifting back.
**Driver:** Carl
**Created:** 2026-07-26
**Mockup:** https://claude.ai/code/artifact/200aff4b-61d2-48a8-accc-40145baac39a — awaiting approval
**Board:** https://claude.ai/code/artifact/7bc89958-58d5-42a4-8c6f-92cbac891cb8

## Done means

- Opening any modal in the app behaves identically: same Escape, same Tab wrap, same focus return.
- A button looks the same on every screen because there is one button, not 226 hand-typed copies.
- Empty screens ("no runs yet", "no team yet") all look like the same product.
- Changing the left nav is a one-file job, not two.
- `npm run lint:components` fails the build if anyone hand-rolls one of these again.
- Nothing on screen changed on purpose. Where a screen moves, it moved because it had drifted.

## Resolved before we start

- **CSS is not the problem.** 309 tokens in `admin/src/styles/design/tokens.css`, both Tailwind configs read them, `lint:tokens` already fails on raw hex. Only 2 CSS files repo-wide hold literal hex, both deliberate. This plan does not touch the token layer.
- **Components already are the house idiom.** `admin/src/ui/` has ~60 modules that are pure functions returning HTML strings, with ~30 co-located tests. This plan extends that layer. No framework, no new concept.
- **The two apps already share code.** `frontend/` cross-imports `admin/src` in 119 places; `frontend/src/boot-splash.js` is 9 lines re-exporting admin's. That is the precedent for Phase 7.
- **Drift is live, not theoretical.** `getFocusables` exists 5× with two different selector lists, so the tab trap already behaves differently between modals. `initialOf` exists 10× and `admin-pulse.ts:67` returns two letters where every other copy returns one.

## Phases

| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Modal shell | One `modal-shell.ts`; 9 dialogs refitted (3 had no keyboard trap at all), 5 `getFocusables` copies deleted, net -216 lines | ✅ |
| 2 | Small primitives | `avatar.ts`, `logo.ts`, `wireRetry` adopted in 5 screens, postcss config collapsed | 🔨 |
| 3 | Button | `button.ts`; 226 raw class strings swept; off-system button families folded in | ⬜ |
| 4 | Card + empty state | `card.ts` and `empty-state.ts`; 3 card bases and 14 empty-state families collapse | ⬜ |
| 5 | Chip + field | `chip.ts` (8 hand-rolled chip functions) and `field.ts` (3 parallel form systems) | ⬜ |
| 6 | Header + scaffold adoption | `pageHeader()` across 33 raw `<h1>`; `loadingHtml`/`errorCardHtml` in 5 stages. No new modules | ⬜ |
| 7 | Kill the app forks | `app-nav` and `router` stop being 67% byte-identical copies | ⬜ |
| 8 | The guard | `scripts/lint-components.js` + `npm run lint:components`; stale design docs fixed | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Lane collisions — check before the marked phases

`LANES.md` had six live claims at setup, several on this surface. Phases 2, 5 and 7 are sequenced late for that reason.

| Session | Holds | Blocks phase |
|---|---|---|
| `4b899314` | `frontend/src/router.js`, `admin/src/ui/session-topbar.js`, `design/primitives.css`, `design/app-nav.css` | 2 (logo), 5 (field), 7 (both) |
| `f1f7e175` / `97834757` | `admin/src/stages/test.js`, `admin/src/stages/start-welcome.ts` | 3, 4 |
| `b7b0c523` | `admin/src/stages/admin-user-detail.ts`, `design/admin-tables.css` | 2 (avatar), 3 |
| `41aadb91` | `admin/src/ui/coach-panel*.ts`, `admin/src/stages/questioning.js` | 3, 4 |

If a lane is still live when its phase comes up: tell Carl who holds it, do not edit through.

## Current state

**Phase 1 ✅ green-lit 2026-07-26** (commit `b7e4f74d`). Mockup approved 2026-07-26 (option A, no changes asked for). One `modal-shell.ts` now owns the backdrop, aria-modal, Escape, Tab trap, focus restore and backdrop click for all 9 dialogs. Share link, the account page and the stage-review overlay gained a keyboard trap they never had. Carl walked Add person and the Account page: Tab loops inside, Escape closes, focus returns, nothing looks different.

**Phase 2 🔨 next** — avatar + initials, the logo constant, `wireRetry` adoption, postcss collapse.

Baseline taken before Phase 1: `npm test` 191/191, `npm run typecheck` clean. After Phase 1: 194/194 and clean. Free checks only for this plan: `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy`. No paid OpenAI run is needed anywhere in these 8 phases, and none has been used.

**Lane note for Phase 2:** `admin/src/ui/screen-scaffold.ts` (the `wireRetry` half) is now held by session `70b40d36` (shape-matched skeletons), and `session-topbar.js` (the logo half) by `4b899314`. Both halves may have to wait; the avatar half is clear.

## Parked

Prior Carl rulings, not to be reopened by this plan:

- Dark mode (out of scope, ruled at design-consolidation close).
- Primary button contrast, white on sky at 2.5:1 (ruled twice, 2026-07-05 and 2026-07-25).
- Re-skinning untouched screens (standing rule is incremental adoption on touch).
- Flowbite 3.x (pinned at 2.5.2 to stay true to the Figma).
- Promoting the `.ds-*` showcase widgets app-wide (parked as too risky).
- Pixel-diff automation (manual eyeball-diff against `docs/screen-gallery/` is the rail).

Found while building, not in scope here:

- Closing the account page leaves focus on `<body>`, because the profile-menu item that opened it has already been removed from the DOM. Pre-existing; the shell would need an optional `returnFocusTo`.

Found during setup, not in scope here:

- `--type-h1` (32-44px) renders larger than `--type-display` (30-42px). The top of the type ladder is inverted. Flagged in DESIGN.md 2026-07-26 as a separate pass with screenshots.
- Phantom `--sero-emerald` / `--sero-rose` tokens that only render via fallbacks.
- 17 CSS files sit outside the `design.css` import barrel and get imported ad hoc by their stages.
- Widening `lint:copy` to `backend/` (144 em-dashed strings) is already owned by audit-fixes-jul-25 Phase 5.

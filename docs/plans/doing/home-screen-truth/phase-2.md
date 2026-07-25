# Phase 2 — One obvious way in

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal

A manager with nothing yet sees the invitation card with the one blue button inside it, instead of a three-step card with no way in and a button stranded in the far corner.

## Changes

**The accent budget, resolved by moving not adding.** The guard at `start-core.test.ts:59-60` counts `/class="btn js-/g` in the source and requires exactly 1; `:58` requires that literal to sit in `actionsHtml`. So keep the header literal at `start-core.js:41` byte-for-byte and, in the zero-run branch, `appendChild` **that same node** into a slot inside the first-run card, swapping its label to "Start your first 1:1". Consequences: the source count stays 1 so both existing assertions pass unchanged, exactly one accent element exists at runtime in exactly one place in every state, the `:201` click wiring stays bound (it binds the element, not a selector), and `syncAccentBudget()` at `:79-81` keeps working on the same node.

On the admin app the bench is present, `actionsHtml` is `""`, and there is no node to move, so the card gets no button. That is correct: the bench's own start button is that screen's accent and internal QA is not the first-run audience. Worth one comment line.

**A structural fix that must ship here.** The first-run card is currently injected *inside* `<ul class="run-list">` as an `<li class="start-firstrun-cell">` (`:95`). Once Phase 3 shows the card and a row together, `run-list--card` toggles on at `:88` and wraps a `.card-flat` inside a card. That is a flat DESIGN rule 10 violation, so fix it before it can happen:
- `start-core.js:46-50` — add a sibling `<section class="js-firstrun" hidden></section>` between the header and the recents section, and render the card there.
- Delete the `<li>` host and the `.start-firstrun-cell` rules in `admin/src/styles/design/start-stage.css`.
- Change the branch condition from `runs.length === 0` to `realRuns.length === 0`, where `realRuns` is just `runs` for now and gains its `!isDemo` filter in Phase 3. That makes Phase 3 a one-line change rather than a re-plumb.
- Delete the false comment at `:92-93` claiming the card carries a "press Enter / Start" hint. It does not.

**Copy**
- `admin/src/stages/intake-firstrun.ts:21-39` — `firstRunIntroHtml(opts = {})` gains an optional `actionSlot` flag rendering `<div class="intake-firstrun__action js-start-slot"></div>`. Default off, so `intake.js:570-580` is provably untouched.
- Add an honest expectation line about what the manager is about to type. **Not** a repeat of `welcome.ts`'s "in about two minutes", which is an unmeasured claim about the whole flow; do not double down on it on a second screen.
- Make the header lede state-aware. "Pick up where you left off, or start a new one." is false for someone with nothing to pick up. Same defect class as the row blob.

## Not in this phase

- The "Example" chip and anything reading `isDemo` (Phase 3).
- Any change to the intake screen's own copy or first-run card.

## Tests, written first

- `admin/src/stages/intake-firstrun.test.ts` — extend the existing copy contract: a default call renders no button and no slot (so intake is provably unchanged); `{ actionSlot: true }` renders the slot; the new line passes the existing no-exclamation-mark and 14px-floor loops and still never says "briefing".
- `admin/src/stages/start-core.test.ts` — new assertions: the first-run card is no longer rendered inside the `<ul>` (`start-firstrun-cell` gone); the empty branch keys on `realRuns`; the accent node is *moved* into `js-start-slot` rather than re-rendered as markup; the `:59-60` count is still exactly 1.
- `.intake-firstrun__action` uses tokens only, proven by `npm run lint:tokens`.

## Done when

- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy` all clean.
- [ ] A screenshot of the real rendered zero-run Home shows the button inside the card and nothing top-right.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner

Walk through these yourself. Next phase waits for your green light.
Where to click: `local > frontend app > register a new account > Home`

1. **The invitation has a way in** — a manager with no 1:1s sees "First time? / Your first prep, in three moves" with a blue button inside the card, and no button top-right. ❌ Not OK if two blue buttons appear anywhere on the screen.
2. **Both doors work** — click that button, and separately press Enter on Home. Both land you on the "Who are you prepping for?" step.
3. **The card stands down** — finish one prep. The card disappears, the blue button is back top-right, and the row appears under "Recent 1:1s". ❌ Not OK if a card appears inside another card.
4. **It fits a phone** — narrow the window to 375px. The card and its button fit, nothing scrolls sideways.

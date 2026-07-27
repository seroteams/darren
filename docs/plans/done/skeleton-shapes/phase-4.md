# Phase 4 — The run lane and forms

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-27 — Carl walked the whole plan and signed it off (commit fd778f1b)
## Goal
Every wait inside a 1:1 run previews what that step is generating, and the two form screens stop popping.

## Changes
- Widen `admin/src/ui/flow-interstitial.ts` to take a skeleton spec instead of a fixed `createSkeleton(3)`.
- Wire `/bank`, `/evaluate`, `/focus`, `/prepare`, `/interview` (between turns), `/compare`, `/lexicon` so each ghost mirrors its own output.
- Give `/new` (intake) a form ghost. It has no loading state at all today: four calls fire after paint and the roster and meeting-type list pop in.
- Retire `checkingHtml()` in `frontend/src/stages/join.js` in favour of the shared preset.

## Not in this phase
The gallery proof sheet and the DESIGN.md rule.

## Done when
- [ ] A full run walk never shows a generic grey card
- [ ] `/new` no longer pops its roster in after paint
- [x] Carl has walked the scenarios below and said go

## Test scenarios — for the product owner
Breadcrumb: `local > admin (dev autologin) > Start 1:1, all the way to the briefing`
1. **Each wait looks like what's coming.** Walk a whole 1:1. At every waiting screen the ghost should hint at that screen's shape, not the same grey cards everywhere. ❌ Not OK if two different waits look identical.
2. **Starting a 1:1 is settled.** Click Start 1:1. The name field and the person picker should arrive together. ❌ Not OK if the picker or the meeting-type list appears a moment later.

---

## Built (2026-07-27)

`flowInterstitial({ step, skeleton })` now takes a skeleton spec. These screens route onward the moment they finish, so what they are "loading" is the NEXT screen: the spec makes the wait preview where you are about to land. Omitting it keeps the old empty slot, so nothing else broke.

Three new presets: `question` (the interview card), `focus-points` (the numbered checkbox cards), `form` (label-over-input fields).

Wired:
- `bank.js` → `question` (it routes straight into the interview)
- `eval.js` → `sections` (it routes into the briefing)
- `focus-points.js` → `focus-points`
- `preparation.ts` → `sections` (the brief's headed slots)
- `questioning.js` → `question` in the question host between turns, so the gap under the orb previews the card being written
- `join.js` → `prose` + `form`, retiring the bespoke `checkingHtml()` sentence

### Offline proof
`npm test` 196/196 · `npm run typecheck` clean · `npm run lint:tokens` PASS · `npm run lint:copy` PASS · skeleton suite 29 tests.

### On-screen proof
A live run costs money, so these were measured against the real markup with sample copy under the real stylesheet, not a paid walk. Stated plainly because it is a weaker proof than the earlier phases' ghost-against-loaded.

| Element | Ghost | Real | Diff |
|---|---|---|---|
| Focus point card | 81.5 | 81.5 | **0** |
| Answer box | 153.6 | 153.2 | 0.4 |
| Question stem (2 lines) | 90 | 90 | **0** |
| Question description | 20 | 24 | 4 |
| Whole question card | 334.4 | 348 | 13.6 |

### The systemic bug this phase found
The kit's CSS lives in `motion.css`, which `design.css` imports at line 14. Anything imported after it (`briefing.css` at 15, `start-stage.css` at 25) beat the kit's rules at equal specificity. Two live consequences: the ghost answer box rendered 96px instead of 153px because `.textarea--question` set its own `min-height`, and the ghost avatar was painting `.ds-avatar`'s real background rather than the grey fill. Every kit rule is now double-classed (`.sk-fill.sk-fill`), which wins regardless of import order. Confirmed: the avatar ghost now computes `rgb(232, 232, 232)`.

### Deliberately not done: the intake picker
`/new` still pops its roster in after paint, and I left it. Ghosting the picker needs to know a roster is coming, and the screen cannot: a guest or member gets a 401/403 and a brand-new manager gets an empty list. In both cases the ghost would appear and then vanish, so the fix would trade a pop-in for a shrink-back, which is worse. Carl's call if he wants it anyway.

### Blocked
`compare.js` and `lexicon-review.js` are in chat `d03316aa`'s lane, so their interstitials keep the generic cards. Same for the last two text-only "Loading…" strings (`meeting-arcs.js`, `ui/stage-review.js`).

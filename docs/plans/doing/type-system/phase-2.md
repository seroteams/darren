# Phase 2 — The Meeting screen

**Part of:** [plan.md](plan.md) · **Status:** ✅ closed UNWALKED

## ✅ CLOSED UNWALKED 2026-07-30 — Carl lifted the walk gate mid-phase ("as this is a frontend, can you keep going?" then "lets go!"). He has NOT seen this screen. Commits `29b9d29f` + `b662b101`.

Proof stands in place of the walk: [proof/p2-meeting-screen.md](proof/p2-meeting-screen.md).

**One item genuinely waiting for his eyes:** the promises card ("Lock in what you two agreed") renders the same `.question-stem` class, so it changed too, from 36px Inter bold to 30px Bricolage semibold. It ships to the customer app as well as admin. Correct by the system, outside this phase's stated scope.

## Built (2026-07-30)

The screen renders **three** sizes where it rendered five. Census on the real running screen: Support tab `[14, 16, 30]`, Live scores tab `[14, 16, 30]`, phone `[14, 16, 20]`. `coach-panel.css` holds **zero** type declarations.

Reached the screen by importing the app's own `questioning.js` and calling its real `mount()` with one stubbed fetch, so the real stage module, real coach panel, real markup and real cascade were all in play. No paid call.

**The finding worth keeping:** the old `max-width: 62ch` on the coach prose **never applied**. 62ch at 17px is 664.9px and the column is 560px, so the cap was wider than the box it sat in. That is why the coaching text ran the full panel width and why the screen read badly. 46ch is the first measure narrower than the column.

**Two regressions caught by adversarial review, both fixed before close:** the phone stem landed on a rung *larger* than the recipe it replaced, because the old override read a token `mobile.css` re-points to 21.6px on phones; and the coach column shrank 96px because `.coach-host` had no width rule and shrink-wrapped to the new 46ch cap, breaking the 50/50 mirror. Details and measurements in the proof file.

**Offline proof:** 219/219, typecheck clean, both linters clean, guard `fonts 7/7` (was 13), `type 534/534` (was 560).

## Goal
Turn the screen Carl screenshotted from five text sizes into three, and prove the role pattern works on a real screen before rolling it out.

## Changes
`admin/src/styles/coach-panel.css` — 68 selectors, ending with **zero type declarations in the file**:

| What | Today | Becomes |
|---|---|---|
| Question stem | `32px` / `1.2` / `600` literals | `heading-xl` — 30/36 |
| Coach hint prose | `17px` / `1.55` / `62ch` | `body` — 16/24 + `46ch` (the mockup's recipe) |
| Live-score explanation | `15px` / `1.5` / `60ch` | `body` + `46ch` |
| Empty state | `15px` / `1.5` | `body` |
| Live-score label | `15px` / `600` | `label-strong` — 14/20 |
| Live-score delta | `15px` / `700` | `label-strong` + colour — separated by ink, not by 1px |
| Eyebrow | `14px` / `600` / `.08em` literals | `overline` |
| Support / Live-scores toggle, pills, meter thumb | weight literals | `label` / `label-strong` |
| Phone override at `:200` | `font-size: var(--type-h2)` | **deleted** — `type.css`'s breakpoint block handles it |

- `admin/src/styles/design/briefing.css:180-193` — half of this rule is dead (`.questioning-card .question-stem` never matches the coach-split screen) but its co-selector `.flow-section .question-stem` is live. Both move to `heading-xl` together, or the class has two different looks.
- `admin/src/stages/questioning.js` — drop the `leading-snug` class from the stem markup. It loses on specificity today and would fight the role tomorrow.

## Not in this phase
- Any other screen. This is the proof-of-pattern.
- The two remaining 30px literals in `admin-pulse.css` and `guided.css` — they belong to Phase 5's heading sweep.

## Done when
- [ ] `grep -c "font-size\|line-height\|font-weight\|letter-spacing" admin/src/styles/coach-panel.css` returns 0
- [ ] Exactly three rendered sizes on the screen — 30, 16, 14 — read off the real elements in the Browser pane
- [ ] A coach hint line is capped at 46ch, which sets as roughly **58 real characters** (`ch` is the width of a zero, so it overstates: do not expect to count 46)
- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy` clean
- [ ] Screenshots at 1440px and 390px saved to `proof/`, plus the mockup open beside it at the same width
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
**Setup:** `local > Start Sero.bat > localhost:3000 > Dev login: Manager > start a 1:1 > reach a question`

1. **The question reads calmer** — the question at the top should feel confident but not shouty. It drops from 32px to 30px, and the coaching text beside it comes up to match the rest. ❌ Not OK if the question now looks small or weak.
2. **The coaching panel is easier to read** — on the right, under **Support**, the "Listen for" text should break into shorter lines instead of running the full width of the panel. ❌ Not OK if lines still stretch right across, or if they are now so narrow they look cramped.
3. **Live scores still readable** — click **Live scores**. The score labels and the up/down figures should be clearly different from each other, but by weight and colour rather than by being slightly different sizes. ❌ Not OK if they now look like the same thing.
4. **On a phone** — open the same screen on your phone, or narrow the window right down. The question should shrink so you can still see the answer box without scrolling. ❌ Not OK if the question eats the screen.
5. **Side by side** — I'll put the original mockup next to a screenshot of the live screen. They should now read as the same quality. ❌ Not OK if the live one still looks busier.

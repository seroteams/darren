# Phase 2 — The three empty states

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-28 — Carl picked A off the built work (commit d14d6d76)
Closed **unwalked**, and without a screenshot: Carl signed off on the rendered-DOM and click
evidence in chat. He also took option A on the seeded-example finding below, accepting that a
brand-new signup does not reach the Team or Past 1:1s empty state.

## Built (2026-07-28)
`frontend/src/stages/team.ts`, `frontend/src/stages/members.ts` and `admin/src/stages/runs.ts`
carry the approved copy: each card now says what a filled screen holds, then how it fills up.
The manager's Past 1:1s card gains a ghost Start 1:1, so `wire()` moved from `querySelector` to
`querySelectorAll` (the singular form would have wired the header's button and left the card's
dead, the exact bug Team hit earlier). The member's Past 1:1s copy was rewritten in the same
voice but keeps no action, since a member cannot start a 1:1.

Offline: npm test 200/200, typecheck clean, lint:copy clean, lint:tokens clean.

Verified in the running app at localhost:3455 on a fresh manager account, by reading the live
rendered DOM and clicking through: all three cards show the new copy, and the card's ghost
Start 1:1 navigates to the prep screen ("Who are you prepping for?").

**Not verified: a screenshot.** The Playwright browser profile was held by a parallel chat all
session, and the Browser pane was not compositing frames, so no picture could be taken. The
proof above is real rendered text and real clicks, not a picture of the screen.

See plan.md's "Open question for Carl": a brand-new signup does not actually reach the Team or
Past 1:1s empty state, because an example person and example 1:1 are seeded.

## Goal
Team, Past 1:1s and Members each greet a new manager with a simple empty state that says what the page will hold, matching the approved mockup.

## Changes
- `frontend/src/stages/team.ts` — empty card copy per the approved mock (what appears here + the Add person action it already has).
- `admin/src/stages/runs.ts` — manager empty card copy per the mock (what a past 1:1 row will show + Start 1:1 action). Member copy untouched.
- `frontend/src/stages/members.ts` — empty card copy per the mock.
- Styling stays on the existing `card-flat` / eyebrow pattern — no new CSS unless the approved mock demands it.

## Not in this phase
- Ghost-row previews, sample data, or illustrations (parked).
- The member view of Past 1:1s.

## Done when
- [ ] `npm test`, `npm run typecheck`, `npm run lint:copy` clean.
- [ ] Screenshots of all three real rendered empty pages, matching the approved mock.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself.
1. **Team** — `local > customer app (localhost:3002) + zero-run manager > Team`. The empty state matches the mock: says who will appear here and offers Add person. ❌ Not OK if it still shows the old wording.
2. **Past 1:1s** — same login > Past 1:1s. Empty state matches the mock and offers Start 1:1.
3. **Members** — same login > Members. Empty state matches the mock.
4. **Nothing regressed for a veteran** — log in as your normal manager account with real 1:1s. All three pages still show their real lists, no empty cards.

# Phase 2 — The three empty states

**Part of:** [plan.md](plan.md) · **Status:** ⬜

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

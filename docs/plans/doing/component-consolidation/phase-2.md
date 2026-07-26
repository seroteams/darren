# Phase 2 — The initials avatar

**Part of:** [plan.md](plan.md) · **Status:** ✅ done (tested)

## ✅ GREEN-LIT 2026-07-26 — Carl walked Pulse and Feedback; the two-letter/one-letter split and the new Pulse reading (WB, KE) both accepted (commit 9058fa78)

## What changed about this phase, and why

The phase was originally scoped as four items. Reading the actual code cut it to one. Recorded here rather than quietly reshuffled:

| Item | Verdict |
|---|---|
| Avatar initials | **Done.** The real work, and it turned up a live bug. |
| Logo constant | **Moved to Phase 7.** Two of its four copies sit in `session-topbar.js` (lane `4b899314`) and `app-nav.js` (uncommitted work by another session). A dedup that leaves half the copies behind is worse than none, and Phase 7 already unforks `app-nav` — that is where this belongs. |
| `wireRetry` adoption | **Moved to Phase 6.** The audit said 5 non-adopters; there are actually 15+ places wiring `.js-retry` by hand. And swapping one line for one line is a wash: the real duplication is the **error card markup** around it, which is already Phase 6's job (`errorCardHtml`). Doing them together is one coherent sweep. `screen-scaffold.ts` is also mid-rewrite in lane `70b40d36`. |
| `postcss.config.js` collapse | **Dropped, not real duplication.** The two files are byte-identical, but each resolves `__dirname` to its own folder and points at its own `tailwind.config.js`. The identical text IS the correct local behaviour. Collapsing it would add indirection for nothing. |

## Built (2026-07-26)

- One `avatar.ts` replaces nine hand-written initials helpers
- It exports two deliberate forms: one letter for a person's avatar, two for a row in a list
- Fixed a live bug: a one-word name rendered "KK" on Team and "K" on Pulse, same person
- Real unit tests, not source guards, because these are pure string functions
- Verified on the live Pulse, Feedback, User management and profile badge

**New:** [admin/src/ui/avatar.ts](../../../../admin/src/ui/avatar.ts) — `initialOf()` (one letter) and `initialsOf()` (up to two), plus [avatar.test.ts](../../../../admin/src/ui/avatar.test.ts) (8 tests: 7 real unit tests + 1 no-copies guard).

**Adopted, 8 sites:** `stages/runs.ts`, `stages/start-core.js`, `stages/admin-user-detail.ts`, `stages/admin-feedback.ts`, `stages/admin-pulse.ts`, `ui/recap-header.ts`, `ui/profile-badge.js`, `frontend/stages/team-card.ts`.

**Left out, 1 site:** `ui/session-topbar.js` keeps its own copy — held by lane `4b899314`. One-line follow-up when that lane clears.

## The two families were real, and one of them disagreed with itself

The audit called this "10 copies of one helper, and Pulse is inconsistent". The code says something more precise:

- **One letter** was five near-identical copies of the same three lines. Pure duplication, no disagreement.
- **Two letters** was two copies with **different rules**. `admin-pulse.ts` took the first letter of each of the first two words; `team-card.ts` took the first letter of the first and last word.

So "one letter wins" (the original plan) would have been wrong: it would have changed every roster and table row for no reason. Both forms are kept, because a single person's avatar and a row in a list of people are genuinely different jobs. What is gone is the disagreement inside the two-letter form.

## ⚠️ One visible change, on internal screens, needs Carl's eye

The shared two-letter rule is first initial + last initial, the conventional one for people. Pulse used to take the first two words, so three-word names move:

| Name | Pulse before | Pulse now |
|---|---|---|
| Web Courses Bangkok | WC | WB |
| Loop Test Mgr | LT | LM |
| Test Manager 0715 | TM | T0 |
| Keep | K | KE |
| Daniel | D | DA |
| P2 Tester · QA Overnight Owner · User A | PT · QO · UA | unchanged |

For real people both rules agree ("Priya Raman" → PR). They only diverge on 3+ word names, where first+last is the correct reading ("Mary Jane Watson" → MW, not MJ). `Test Manager 0715` → `T0` is the ugly case, and it is a test account.

Say the word and Pulse goes back to first-two-words as its own named variant.

## Not in this phase

- Changing the avatar colours, size or shape. Only the letters inside changed.
- The six different avatar CSS families. Those collapse in Phase 4 with cards.

## Done when

- [x] `grep "function initialOf\|const initials ="` returns nothing outside `avatar.ts` (bar `session-topbar.js`, lane-blocked)
- [x] `npm test` 195/195, `npm run typecheck` clean, `lint:tokens` and `lint:copy` PASS
- [x] Checked on the live screens, no console errors
- [x] Carl has walked the scenarios below and said go

## Offline proof

| Check | Result |
|---|---|
| `npm test` | 195/195 (was 194/194) |
| `npm run typecheck` | clean |
| `npm run lint:tokens` / `lint:copy` | PASS |
| `node --test admin/src/ui/avatar.test.ts` | 8/8 |

One existing test needed a one-line fix: `runs.test.ts` sliced its source between `function aboutEntry` and `function initialOf`, and `initialOf` had moved out. The end marker is now `function groupLabel`, with an added assertion that the markers still exist so it fails loudly next time instead of silently slicing nothing.

## Browser proof (localhost:3343, admin)

| Screen | Avatar | Reads |
|---|---|---|
| Admin > Pulse (rows) | two letters | WB · PW · LM · PT · QO · T0 · KE · DA · UA |
| Admin > Feedback (rows) | one letter | C · D · D · D |
| Admin > User management > a user | one letter | A, for "Audit Manager" |
| Profile badge, top right | one letter | D, for "Dev Manager" |

No console errors. Team and Members were not walked on screen: this account has an empty roster, so there is nothing to render. Their change is one-word names only, proved by the unit tests and a one-line call swap in `team-card.ts`.

## Test scenarios — for the product owner

`local > admin at localhost:3343 > Admin > Pulse`

1. **Read the circles** — look down the Managers table. Every circle has two letters.
2. **Check the ones that moved** — "Web Courses Bangkok" now reads **WB** (was WC). "Keep" reads **KE** (was K). Tell me if you prefer the old reading.
3. **One person, one letter** — go to Admin > Feedback. Those circles have ONE letter, and so does the badge with your name top-right. That difference is deliberate: a person gets one letter, a row in a list gets two.
4. **Your own badge** — the circle top-right still shows your initial, unchanged.

✅ **Pass:** no empty circles anywhere, no circle showing the same letter twice ("KK"), and the two-letter/one-letter split above looks right to you.
❌ **Fail:** an empty or "?" circle on a real person, or a reading you dislike.

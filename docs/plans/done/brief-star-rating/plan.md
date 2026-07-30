# Brief star rating

**Goal:** A manager can score the prep brief out of 5 with one tap, and every score lands in Carl's Feedback inbox.
**Driver:** Carl
**Created:** 2026-07-30
**Mockup:** https://claude.ai/code/artifact/e9d9a80f-93df-4141-a679-3ec7a4443cb2 — awaiting Carl's nod

## Why now

Nothing currently tells us whether the prep brief is any good. The manager reads it, taps "Start 1:1 questions", and we never learn if it landed. During the validation stage that is the single most useful signal we could collect, and it is the one we are missing.

## Done means

- On the Prep screen, under the brief and above the buttons: "How good is this brief?" and five stars.
- One tap saves. It says "Thanks". A failed save never blocks the manager continuing.
- Guests count as well as signed-in managers.
- Every score shows in `/admin/feedback` as its own row type, with the score and a link through to that 1:1.
- A brief rating and a recap verdict on the same 1:1 both survive. Neither wipes the other.

## Decisions taken

| Decision | Choice | When |
|---|---|---|
| Scale | 5 stars, not 10 (reuses the control we already have) | Carl, 2026-07-30 |
| Admin home | Existing Feedback inbox, no new screen | Carl, 2026-07-30 |
| Comment box | None. One tap, then continue | Carl, 2026-07-30 |

## Resolved before we start

- **The Prep screen is one file for both apps.** `frontend/src/stages/preparation.ts` is loaded by `frontend/src/main.js:60` AND `admin/src/stage-loaders.js:28`. One edit covers customer and admin. No duplicate work.
- **The star control already exists.** `admin/src/ui/star-rating.js:11` `createStarRating()` is already 1 to 5, accessible, keyboard-operable. Reused as-is.
- **The run id to attach to is `store.sessionId`** (`preparation.ts:44`) — always present. NOT `store.preparationRunId`, which only lands after the SSE result event and is cleared on re-prep.
- **The collision trap.** `feedback.repo.ts:88-92` `upsertVerdict` updates *any* `feedback_notes` row matching `run_id`, with no kind filter and no unique constraint. Without a discriminator, a brief rating and a recap verdict on the same run silently clobber each other. Hence the new `kind` column, and both upserts scoping on `(run_id, kind)`.
- **The inbox was built for this.** `admin/src/ui/feedback-kinds.ts:4-5` says in its own header comment that a future kind is one map entry plus one branch. No renderer surgery.
- **`identityColumns()`** (`feedback.repo.ts:60`) already handles the dev-autologin non-uuid identity problem, so local taps will store rather than 500.

## Phases

| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Stars on the brief | The rating card on the Prep screen, saving to the database | ✅ |
| 2 | Scores in the inbox | Brief-rating rows in `/admin/feedback` with the score and a run link | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state

**✅ CLOSED 2026-07-30. Both phases green-lit, same day, £0 spent.**

- Mockup approved, then P1 signed off (commit `e21ed525`): he walked the prep brief, tapped the stars, and carried on into the questions.
- P2 signed off (commit `0d026aaa`): he rated a brief, opened the Feedback inbox, and followed the row through to the 1:1.

Nothing left open. Not yet pushed live: it ships on the next "go live".

Board: https://claude.ai/code/artifact/6de9e218-84d0-4ad7-b860-8998d3fc1e3c

Baseline taken before any edit: `npm test` 211/214, `npm run typecheck` clean. The 3 fails were one pre-existing design-guard violation in `admin/src/stages/test.js` (another session's lane), not this work. After Phase 1: 215/215.

Cost so far: nothing. The prep stream replays a cached brief, so Phase 1 was verified without an OpenAI call.

## Parked

- Trend view: average score, histogram, score-over-time. Deliberately cut — the inbox rows come first, a dedicated screen only earns its place once there is volume.
- A Pulse tile for the average brief score.
- Optional one-line comment alongside the stars.
- A rating on the recap brief as well as the prep brief.
- Rapid double-tap could in theory write two rows: both upserts are read-then-write with no unique index, matching the pattern the verdict tap has used since it shipped. Deliberately not hardened, since the worst case is a duplicate inbox row rather than lost data. Revisit if it ever actually happens.

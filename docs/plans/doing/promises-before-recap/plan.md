# Promises before the Recap — a dedicated agreement moment

**Goal:** When the questions end, the manager lands on one clear "lock in what you two agreed" screen — your promises and theirs, side by side — and only then gets the recap, which (on screen and in the PDF) shows what was actually agreed, not the engine's raw suggestions.
**Driver:** Carl
**Created:** 2026-07-19
**Mockup:** in-app, Carl's choice 2026-07-19 — the clickable walk at `/test → "Promises before the recap"` (admin/src/stages/tests/promises-before-recap.js); earlier artifact (https://claude.ai/code/artifact/43c1f81c-e2e8-403b-9d39-582e74f3d3ce) kept as reference. **Approved by Carl 2026-07-19** ("A and keep going").
**Board:** https://claude.ai/code/artifact/bbb24b13-18ea-452b-9fc7-3218e9b9e656

## Done means
- Finishing the questions lands on a full-screen Promises step: "You promise" and "{Name} promises" groups, editable, movable, one blue "Lock these in".
- The recap comes AFTER, opening with the celebration wash, and its "What to do next" shows the locked promises grouped by owner.
- The guest recap PDF carries the agreed promises with owner labels (falls back to engine suggestions when skipped).
- Reloading after locking never re-shows the promises step (today's confirm card does — bug fixed).
- The /test gallery "Promises loop" walk mirrors the real screen.

## Resolved before we start
- **No new runner stage.** Backend `inferStage()` can only resume into BRIEFING, and a new stage fans out into router/rail/loaders/tests. The Promises step is view 1 inside the BRIEFING stage; the recap is view 2.
- **Backend API unchanged.** `POST /sessions/:id/promises` already validates per-row owner + max 10 and is not auth-gated — guests can save like they answer questions. Only `snapshot()` gains a `promises` field.
- **Latent bug found:** `promisesConfirmed`/`promisesConfirmSkip` missing from `state.js` `initial` → leak across runs in one tab. Fixed in Phase 1.
- **Guests get the step too** (gate drops `store.user`); POST failure fails soft to local state so recap + PDF still show the list.
- **Empty engine suggestions:** step still shows with empty groups + add buttons (Carl confirms at mockup).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The moment | `promise-agree` two-group screen + view switch in briefing.js; promise-confirm deleted; state leak fixed | 🔨 |
| 2 | Memory & guests | snapshot + rehydrate plumbing; guest lane; recap "What you agreed" grouped band + copy-all | 🔨 |
| 3 | The PDF payoff | recap-pdf owner-grouped promises section | 🔨 |
| 4 | House in step | /test gallery walk mirrors the real screen; dependency sweep; trackers | 🔨 |

⬜ not started · 🔨 built, awaiting Carl's walk · ✅ done (tested)

## Current state
2026-07-19: design approved via the /test walk; Carl said "keep going" while out, so all four phases are BUILT in one stretch (commit pending his walk — statuses stay 🔨, never self-certified). Free proof: typecheck clean, npm test 157/157 (incl. new promise-agree / snapshot / recap-pdf / state-reset tests), real-module browser walk of every path (lock / skip / scripted / locked-empty / fail-soft). NOT yet proven: a pixel screenshot (Browser-pane capture stuck this session) and an actual downloaded PDF — both are Carl's QA scenarios. lint:tokens fails on 25 pre-existing violations (recap-pdf COLOR block + profile-badge.js), none from this diff. Next: Carl walks the consolidated scenarios, then phase-close.

## Parked
- Persisting the skip decision server-side (reload after skip re-shows the step once — accepted).
- Logged-in Save-as-PDF button (PDF stays guest-only for now).
- Engine guessing owners for suggestions (no-inference ruling — manager assigns owners, always).

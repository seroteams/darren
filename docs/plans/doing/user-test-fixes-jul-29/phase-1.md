# Phase 1 — Rating panel: kill the code-word leak

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The live-scores explanations always read as plain sentences. Internal code words like `[THREAD-DEFERRED-WINDDOWN]` never reach the screen.

## Changes
- `backend/api/services/sessions/session-streams.ts` — strip `[BRACKET-TAG]` markers from the note text at the two places it is sent to the browser: the live write (~line 505) and the reconnect replay (~line 304). The stored copy (`turnEntry.note`, ~line 413) stays raw, because engine checks legitimately read those tags.
- New/extended test in the mirrored test file: a tagged note reaches the stream clean; the stored turn entry keeps its tag.

## Not in this phase
- No engine or prompt changes — the tags are supposed to exist internally.
- No coach-panel edits (those files belong to another chat's lane today).

## Done when
- [ ] Unit test proves: streamed note has no bracket tags, stored note still does.
- [ ] `npm test` and `npm run typecheck` clean.
- [ ] Product owner has tested the scenario below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Clean explanations** — `local > npm run dev > localhost:3001 > start a 1:1`. Answer questions until the second-to-last one, watching Live scores. You should see plain sentences under each score. ❌ Not OK if any explanation ends with a `[WORD-IN-BRACKETS]` code.

# Phase 4 — Learning ledger

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Every ask from every run banks one structured row, and a "Pool quality" screen proves it: per question — how often asked, how often it earned a real note, split by origin.

## Changes
- `backend/db/schema.ts` — `question_asks` table (blockScores signal shape + runArtifacts no-FK rule): `id, session_key, org_id?, user_id?, person_id?, origin, meeting_type, turn, alias, question_name, stage, purpose, source, read, deltas jsonb, asked_at`; `UNIQUE(session_key, turn)`; indexes on alias/person_id/org_id/origin. Question text stored; answers NEVER.
- NEW `backend/db/question-asks-store.ts` — clone of `run-artifacts-store.ts` (sync facade, per-session promise chains, no-op without DATABASE_URL, warn-and-swallow, flush). Called from the three lanes right after `entry.read`; flush hooks in `server.ts:~749-754` + `cli.ts:~327-331`.
- Superadmin GROUP-BY-alias endpoint (asks, note_ratio, thin_ratio, per-origin split) + Pool quality admin stage per the approved mockup.

## Not in this phase
- No ranking/selection change in the engine — the ledger informs a FUTURE phase; generation stays as-is.

## Done when
- [ ] Store tests (no-op without DB, write ordering, idempotent upsert), lane write-shape test, endpoint test with injected rows; free checks green.
- [ ] After one persona run, `question_asks` holds one row per turn with the right origin/read — checked with a DB query, not the UI.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Every run banks** — run one persona from the test-engine page, then open Admin > Pool quality. Fresh rows appear, tagged QA, with read ratios. ❌ Not OK if the run finishes but the screen shows nothing new.
2. **Real runs bank too** — do a short manual run; Pool quality gains Internal/Real rows for those questions.
3. **The wrapper test** — pick any question in the list: you can see how many times it's ever been asked and how often it earned a real note. That's the "we're building data, not just wrapping an LLM" proof, on one screen.

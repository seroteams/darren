# Phase 2 — new runs carry personId

Zero frontend change — auto-create covers free-typed names.

## Work

1. [sessions.service.ts](../../../backend/api/services/sessions/sessions.service.ts) `start()`:
   - Accept optional `personId`; validate it belongs to caller (orgId + managerId) else 400.
   - When absent: best-effort auto-match-or-create a roster row from the trimmed name (normalized-name match against caller's active roster). Skip silently when DATABASE_URL unset (file-only dev keeps working, personId stays null).
2. `claim()` (same file): after stamping orgId/userId onto a guest run, run the same auto-match-or-create.
3. sessions.repo.ts `create()` gains personId; stamp `session.personId` top-level in state → persists to session-state.json + sessions.state jsonb mirror.
4. Mirrored tests in sessions.service.test.ts (test-first).

## Done when

- Starting a 1:1 with a free-typed name creates/reuses a roster row and the run's state file contains personId.
- The roster row appears in GET /team/people.

## QA scenarios

1. Start a run as Carl for "Priya" → session-state.json has personId; /team/people shows Priya.
2. Start a second run for "priya " (case/whitespace) → same personId, no duplicate row.
3. With DATABASE_URL unset, a run still starts (personId null, no crash).
4. Claim a guest run → roster row created for its ctx.name.

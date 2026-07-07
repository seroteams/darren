# Phase 2 — new runs carry personId

Zero frontend change — auto-create covers free-typed names.

## BUILT — awaiting Carl's walk (2026-07-05)

Design shift from the sketch below (recorded honestly): the roster resolution lives in
`peopleService.resolveForRun` and the **controller** awaits it BEFORE `service.start` —
the stamp rides `repo.create`, so there's no write-later race and the sessions service
stays sync (other tracks' tests untouched). `claim` stamps best-effort after ownership
transfers. Explicit `personId` in the start body must be the caller's own row (400
otherwise, resolved through the merge chain); the no-personId path never throws.

- **Bug caught by verifying the destination:** `serialize()` in session-persistence.ts
  is a whitelist — personId was stamped in memory but VANISHED from session-state.json.
  Fixed + pinned by new serializer tests (the parallel no-inference track hit the same
  gap with `outcomeCheck` minutes later).
- Test-first: 4 new resolveForRun cases + 2 start-stamping cases + 2 serializer cases.
- **Live-proven on a scratch API (:3042, $0 — invalid OpenAI key so prewarm can't spend):**
  free-typed start → personId in the state file on disk + roster row created; "  priya qa "
  → same person, roster stays 1 row; explicit personId honored; bogus personId → 400;
  anonymous guest run starts unlinked (orgId/personId null) and **claim** stamps userId +
  personId + roster row; no-DB API (:3043) starts fine with personId null. QA rows +
  run dirs + Neon mirrors all cleaned after.
- Checks: `npm test` **76/76** · typecheck clean.

## Work

1. [sessions.service.ts](../../../../backend/api/services/sessions/sessions.service.ts) `start()`:
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

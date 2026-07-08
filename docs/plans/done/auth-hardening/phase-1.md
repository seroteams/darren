# Phase 1 — Fence live sessions by company

**Part of:** [PLAN.md](plan.md) · **Status:** ✅ done — tested (offline 51/51 + live 2-company smoke 8/8) + green-lit

## Goal
A live session created by Company A can only be read or written by Company A. Anyone
else (another company, or anonymous) gets "not found" — never A's data.

## How (mirrors the runs wall from Phase 007/2)
Sessions already carry an `orgId` (stamped at start — `sessions.ts` `createWebSession`).
We just never check it on the way back in. The fix puts the check in the one place every
read and write already funnels through: the service's `requireExisting(id)`.

- Add an optional company arg to the lookup: `requireExisting(id, callerOrgId?)`.
  Rule (same as runs): if the session has an `orgId` set **and** the caller's company
  differs (including a null/anonymous caller), throw the existing `notFound` →
  the caller gets the same 404 as a missing session (no "exists but forbidden" leak).
  A session with `orgId === null` (anonymous-created / legacy) stays open — unchanged.
- Thread the caller's company from the controller, exactly like `runs.controller.ts`
  does: a `callerOrgId(c)` helper that reads it from the session cookie via `buildIdentity`.
- Cover **every** entry point in `sessions.controller.ts`:
  - reads: `snapshot`, `lexiconScope`, `roleProfile`, `preview`, `question`,
    `suggestAnswers`, `lexiconCandidates`
  - writes: `answer`, `back`, `notes`, `agendaCover`, `verdict`, `selectedFocus`,
    `lexiconDecisions`
  - SSE streams (call `service.require` directly): `focusPointsStream`,
    `preparationStream`, `bankStream`, `evaluationStream`, `planStream`

## Changes
- `backend/api/services/sessions/sessions.service.ts` — `requireExisting(id, orgId?)`
  ownership check; thread the optional org through the service methods that resolve a session.
- `backend/api/services/sessions/sessions.controller.ts` — add `callerOrgId(c)` helper;
  pass it into every read/write/stream lookup.
- Tests: `sessions.service.test.ts` (+ an org-fencing case mirroring `auth/org-data.test.ts`).

## Not in this phase
- Refusing anonymous callers outright (that's Phase 2 — here, an anonymous caller is
  simply blocked from *org-owned* sessions; legacy null-org sessions still work).
- Any UI change. This is server-side only.

## Done when
- [x] Cross-company access to a live session (read, write, and a live stream) returns 404.
  *(service-layer wall in `requireExisting`; 5 new unit tests cover own/other/anonymous/legacy/internal.)*
- [x] Same-company resume/answer works unchanged. *(own-company test + existing 51/51 suite green.)*
- [x] A legacy/anonymous (null-org) session still works. *(null-org test + start-without-org test.)*
- [x] `npm test` green (51/51), `npm run typecheck` clean (offline — no paid run needed).
- [x] Product owner delegated the QA to the agent; live 2-company smoke ran green → go.

## Test scenarios — for the product owner
Walk these yourself. Next phase waits for your green light.

1. **Cross-company is walled off** — Log in as Company A, start a 1:1 and copy the
   session link/id. In a separate browser (or after logging out and in as Company B),
   open that same session. You should see a "not found"/blocked state — **never** A's
   questions or answers. ❌ Not OK if B sees any of A's session content.

2. **Your own session still resumes** — As Company A, start a 1:1, answer a question or
   two, navigate away, come back to it. It should resume normally with your answers
   intact. ❌ Not OK if your own session now 404s.

3. **The live briefing stream still works for the owner** — As Company A, run a session
   through to the briefing/evaluation. The live "thinking → result" stream should behave
   exactly as before. ❌ Not OK if the stream errors for the rightful owner.

4. **Legacy/anonymous still works** — If you start a session without logging in (or via
   the dev one-click side-door), it should still run end to end. ❌ Not OK if a normal
   anonymous/dev session breaks.

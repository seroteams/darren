# Phase 1 — Quick fixes

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 built 2026-07-04 — awaiting Carl's QA

## Goal
Fix the four small real problems the audit confirmed, without changing any behaviour a user would notice.

## Changes
- `admin/src/state.d.ts` — add the three fields the TypeScript pages already use but the types file forgot: `myRunId`, `personKey`, `skipBriefingAnimation`.
- `backend/engine/question-generator.ts` — stop keeping its own private copy of the allowed-deltas list; derive it from the shared one in `queue-constants.ts` (bank questions still exclude 0 — with a comment saying that's on purpose).
- `backend/api/services/sessions/session-runtime.ts` — the session warm-up currently hides its failures completely; add a warning log so we can see when it fails.
- `.claude/settings.json` — remove permission rules pointing at `frontend/server/...` files deleted in the big reorg.

## Not in this phase
- Deleting any scripts or files (Phase 2).
- Touching escape/relTime helpers (Phase 3) or prompt builders (Phase 4).

## Done when
- [ ] `npm test` still 52/52 and both typechecks pass
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Nothing looks different** — open the admin app, log in, open Runs and click into a run, open Team and click into a person. Everything should look and work exactly as before. ❌ Not OK if any page errors or looks changed.
2. **A full practice run still works** — start a one-page run with a made-up person and let it get to the question bank. The bank questions should appear as normal. ❌ Not OK if the bank stage errors or hangs.
3. **Free checks are green** — I'll paste the `npm test` + typecheck results in the phase report; confirm they say 52/52 and no type errors.

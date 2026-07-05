# Phase 2 — Real Runs (the member's own past runs)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The **Runs** page shows the logged-in member their **own** finished runs — and never anyone else's. Clicking one opens a simple read-only view of that run's briefing.

## Why this needs backend work
Runs today are fenced by company (`orgId`) only, and every runs endpoint is admin-only ([runs.controller.ts](../../../backend/api/services/runs/runs.controller.ts)). There is no per-user attribution on a run. So we must (a) stamp the member's user id onto the run when it's created, and (b) add a member-safe endpoint that lists finished runs filtered to *that user*.

House rules: backend is **TypeScript, test-first** (red → green → refactor) and this is **security-sensitive** — run the `security-review` skill before calling it done, because we're opening a runs endpoint to non-admins for the first time.

## Changes
- **Attribute runs to the member** — when a session is created, record the caller's `userId` on the session/run state alongside the existing `orgId` ([sessions.service.ts](../../../backend/api/services/sessions/sessions.service.ts) / repo). Mirror the existing `orgId` plumbing.
- **Member-safe listing** — a service/repo read that returns finished runs filtered by **both** `orgId` and `userId` (their own only). Follow the `runOwnedByOrg` pattern in [run-history.ts](../../../backend/engine/run-history.ts) with a `runOwnedByUser` companion.
- **New endpoint** — `GET /api/v1/runs/mine` (or similar) in [runs.controller.ts](../../../backend/api/services/runs/runs.controller.ts): requires a logged-in user (not admin), derives `userId` + `orgId` from the session, returns only that user's finished runs. Existing admin endpoints stay admin-only, unchanged.
- **Read-only run read for members** — the run-detail read (briefing) also gated to the owning user, so a member can open their own run but not another's by id.
- **Frontend** — fill `admin/src/stages/runs.js` (from Phase 1) with the real list (name / role / date), wired to the new endpoint. Clicking a run opens a read-only briefing view. Empty state: "No runs yet — start one from Home."
- **Tests** — mirrored service/repo tests: a member sees only their own runs; another member's run and an admin's run are absent; anonymous is 401; by-id read of someone else's run is refused.

## Not in this phase
- Backfilling pre-Phase-2 runs (they have no owner, so they won't appear — parked).
- Rich member debrief / verdicts / exporting — read-only briefing is enough here.
- Any change to the admin Library.

## Done when
- [ ] A member's Runs page lists only runs they created.
- [ ] A member cannot see another member's or an admin's run — not in the list, and not by opening its id directly.
- [ ] Clicking a run opens a read-only briefing for that run.
- [ ] Admin Library and all existing runs endpoints behave exactly as before.
- [ ] Backend changes are test-first; `npm test` green; `security-review` run and clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **See my own run** — as member A, complete a prep run to a briefing. Go to **Runs**. You should see that run in the list. Click it → you see its briefing (read-only).
2. **Don't see others' runs** — as member B (same company), open **Runs**. You should **not** see member A's run. ❌ Not OK if A's run appears.
3. **Admin's runs stay private** — do an admin run, then check a member's Runs page. The admin run must **not** appear.
4. **No peeking by id** — as member B, try opening member A's run URL directly (`/run/<A's id>` or the members' run URL). You should be refused / bounced, not shown A's briefing.
5. **Empty state** — a fresh member with no runs opens **Runs** and sees a friendly "No runs yet" message with a way to start one.
6. **Admin Library unchanged** — open the admin **Library**. It still lists the company's runs exactly as before, with archive/review/copy all working.

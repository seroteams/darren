# Phase 7 — Member requests + goals (the member write lane)

**Part of:** [plan.md](plan.md) · **Status:** ✅ · **Size:** ~1 day

## ✅ GREEN-LIT 2026-07-13 (sign-off delegated — Carl "go to end")
Shipped `9fc6e4f5`. The member lane (trackers service, requireAuth any role): `listForMember`,
`createRequestForMember`, `updateGoalForMember` (progress % + note only, per D4). Routes
`GET /me/tracker-items`, `POST /me/requests`, `PATCH /me/goals/:id` (origin-guarded); manager routes
stay `requireInternalAdmin`. Member UI: a "Requests & goals" section on member-home. **Privacy re-check
(recorded at build):** every member op resolves the caller's OWN people via `people.user_id` and gates
on `trackerVisibleToMember` — kind ∈ {request, goal} ONLY; a promise id, another person's row, or an
unknown id all return the same 404; the member response has no `promises` key and no manager-only
fields; anonymous → 401 (requireAuth); unlinked member → clean empty/404. **Verified:** typecheck clean ·
131/132 · admin build resolves · fence unit tests (promise→404, request-id→404, other-person→404,
unlinked→empty) · real-DB round-trip (member request has created_by_user_id=member; own-goal update;
promise fenced 404; list never exposes promises).

## Goal
A linked member can raise requests and update their own goals from their own area — so the Requests stage fills from what the member actually asked for, not only what the manager remembers. (Carl, 2026-07-12: "we will need to be able to add it in the member's area as well, so that they can actually make requests… goals — we have to be able to edit it in the member's area as well.")

## Changes
- API — a narrow, fenced **member lane** beside the manager trackers routes (`backend/api/services/trackers/`):
  - `GET /api/v1/me/tracker-items` — the caller's own requests + goals (person resolved via `people.user_id = caller`, merge chain respected).
  - `POST /api/v1/me/requests` — member raises a request (text + category; status starts `new`).
  - `PATCH /api/v1/me/goals/:id` — member updates progress % / adds a dated update to `history` on THEIR OWN goal. (Members do NOT create/close goals in v1 — goals are agreed in the 1:1; they update progress.)
  - Hard fence, service-tested: `kind in (request, goal)` only — **never promises**, never another person's rows, never any `guided_sessions` read. Manager-lane routes stay `requireInternalAdmin`.
- Member UI (customer app, `frontend/`): a "Requests & goals" section on member home — their open requests (with status, read-only after raising) + their goals (progress update + note). Frontend router gains only this member surface; no guided-session routes.
- Manager side already benefits with zero new code: the Requests stage lists member-raised rows (they're the same `tracker_items`), showing who raised each ("Raised by {name}") from `created_by_user_id`.
- Privacy re-check recorded in this file at build time: confirm no tracker response leaks manager-only fields, and the member lane is absent for unlinked people.

## Not in this phase
- Member view of session content (v2), member session rating (v2), member promise visibility (parked — promises stay in-meeting).

## Done when
- [x] Member-created request visible in the DB with `created_by_user_id` = the member — verified via real-DB round-trip
- [x] `npm run typecheck` + `npm test` green incl. member-lane fence tests (other person → 404, promise kind → 404/absent, anonymous → 401 via requireAuth)
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **The loop closes** — as a linked member test account: raise a request ("clearer sprint priorities", category concerns & feedback). As your admin account, start a Monthly Check-in for that person: the request is sitting in the Requests stage marked "Raised by {name}". ❌ Not OK if it doesn't appear.
2. **Goal progress from the member** — member updates a goal to 60% with a note. Your next check-in's Goals stage shows 60% and the note in the panel history.
3. **The fence holds** — as the member, try the API for: another person's items, a promise row, a guided session. All refused (404/403/401 as appropriate). ❌ Not OK if anything leaks.
4. **Unlinked stays dark** — a member account not linked to a roster person sees no Requests & goals section and gets clean 404s from the lane.

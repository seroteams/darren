# Phase 5 — member link + "Your 1:1s"

## ⚠️ Privacy rule for this phase

Members see **list-only**: meeting type + date + which manager. NO notes, NO briefing, NO ratings, NO detail view. Manager notes are sensitive (no-inference ruling). Anything richer = Carl's call, parked as `member-run-visibility`.

## Work

1. people.service/repo: POST /api/v1/team/people/:id/link { userId } (target must be a user in the SAME org) + unlink; GET /api/v1/team/linkable-users (org users id/name/email; manager/admin only).
2. [run-history.ts](../../../backend/engine/run-history.ts): `listFinishedRunsAboutPerson(orgId, personIds)` — org-fenced walk filtered by state.personId ∈ set; minimal row: { id, meetingType, lastSeenAt, completedAt, managerName }.
3. runs.service.ts + runs.controller.ts + server.ts: GET /api/v1/runs/about-me (requireAuth, any role; resolves caller's linked people via peopleRepo.findByLinkedUser(userId, orgId)).
4. [team.ts](../../../admin/src/stages/team.ts) Tidy up: "Link to account…" picker per person.
5. [member-home.js](../../../admin/src/stages/member-home.js) + [runs.ts](../../../admin/src/stages/runs.ts): member home shows "Your 1:1s" from /about-me; remove the dead "Start a new session" button (403s today).

## Done when

- Carl links a seeded person to member@seroteams.com; logging in as the member shows those 1:1s (dates + types only); nothing cross-link, cross-org, or beyond the minimal row.

## QA scenarios

1. Link person → member login lists their 1:1s; unlink → list empties.
2. Member with no links → empty list (not an error).
3. Manager tries linking a user from another org → 400/404.
4. Member calls GET /team/people → 403; GET /runs/about-me returns only linked-person runs.
5. Response body spot-check: no notes/briefing/rating fields present.

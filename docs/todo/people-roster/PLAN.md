# People Roster — managers formally have members; 1:1s owned by that pair

**Started:** 2026-07-05 · **Owner walk required per phase** (Darren Method)

## Why

Carl asked "members should only see their own 1:1s — is Sero set up for that?"
Findings:
- The `/api/v1/runs/mine` fence works but is **creator-based** (org + userId of whoever *started* the run). Members can't start runs anymore, so a real member's list is empty — the demo list only looks full because `scripts/seed-runs.ts` hands all demo runs to the QA member account.
- **"1:1s about me" is impossible today**: the person in a 1:1 is free text inside session state. No roster, no person entity, no manager↔member link.
- **Tenancy is sound** (everything fenced by org_id) — no org-model change needed.

Carl picked: build the real thing. Managers get a roster of people; 1:1s link to a person record; a member linked to a person sees the 1:1s about them.

## Design (agreed)

- **New `people` table** (migration 0007): `id, org_id FK, manager_id FK users, name, role, seniority, user_id FK users NULLABLE (the member-account link), merged_into_id self-FK NULLABLE (merge = pointer, like alias chains), archived_at, timestamps`. Indexes on org_id / manager_id / user_id.
- **Session linkage:** top-level `personId` on session state (next to orgId/userId). NOT inside MeetingContext — pipeline/prompts unchanged. No new columns on sessions/runs tables.
- **Member read path:** new `GET /api/v1/runs/about-me` (leave `/runs/mine` creator-semantics alone).
- Roster double-fenced (orgId + managerId), same pattern as runs.

## Phases

| # | Phase | Status |
|---|---|---|
| 1 | [people table + roster service (backend only)](phase-1.md) | ✅ green-lit 2026-07-05 ("b GO", walk waived — live proof stands) |
| 2 | [new runs carry personId](phase-2.md) | 🔨 BUILT — awaiting walk |
| 3 | [backfill existing runs + fold in aliases](phase-3.md) | ✅ green-lit 2026-07-06 |
| 4 | [manager UI: person picker + roster-driven Team page](phase-4.md) | ⬜ |
| 5 | [member link + "Your 1:1s"](phase-5.md) | ⬜ |

## Current state

- 2026-07-05: plan approved by Carl (option B — "1:1s about me").
- **Phase 1 ✅ green-lit 2026-07-05 ("b GO" — walk waived by Carl, live proof stands).** Commit `4a762779`.
- **Phase 2 BUILT — awaiting Carl's walk** (details + live proof in phase-2.md). New runs + claimed guest runs stamp personId into state (disk + DB mirror) and auto-create roster rows; 76/76 tests, typecheck clean.
- **Phase 3 BUILT — awaiting Carl's walk (2026-07-06).** `scripts/backfill-people.ts` (dev-guarded, needs DATABASE_URL, `--dry-run`, idempotent) walks every run with orgId+userId+ctx.name, resolves the name through that manager's Team merges/renames to one canonical person, find-or-creates the roster row, and stamps personId into the run's session-state.json (atomic) + the DB mirror. The alias→name logic is a pure, unit-tested module (`backend/api/services/team/alias-resolve.ts`, 8 tests). Offline proof only: `npm test` **78/79** (the 1 fail is the pre-existing replay-regression baseline drift, not this work), root+admin typecheck clean, and the script's dev/DB guards fire. **The live dry-run + real run (QA scenarios 1–4) need Carl's Neon** — this cloud clone has no DATABASE_URL, so they're the walk.
- **Phase 3 ✅ green-lit 2026-07-06** — Carl walked the backfill (dry-run → real → idempotent re-run) against live Neon; distinct people rows, merged names on canonical persons. Commit `59a7558` (PR #8).
- **Phase 4 🔨 in progress (2026-07-06)** — Carl chose **roster-driven** Team (add names before any 1:1); split into 4a (Team + data) and 4b (intake picker).
  - **4a BUILT — awaiting walk:** Team page rewritten to list the real roster + join run stats by personId + "Add someone" + not-yet-met "Prep first 1:1"; Tidy-up rename/merge moved to the roster endpoints; person page re-keyed to personId; `run.personId` on the member run row; `buildRosterView` tested (5 new cases). `npm test` 78/79 (1 pre-existing fail), typechecks + admin build clean. Not browser-walked (cloud).
  - **4b next:** intake NAME substage person picker + start payload carries personId.

## ⚠️ Privacy decision (flagged, not silently decided)

What a member may see of a manager-prepped 1:1. Manager notes are sensitive (no-inference ruling). Phase 5 ships **list-only** (meeting type + date + manager) — no notes, no briefing, no ratings. Any member detail view is Carl's call → parked slug `member-run-visibility`.

## Parked

- Invitations wiring / email claim flow (table stays scaffolded; Phase 5 links existing org users via manual picker)
- Email auto-link at signup (needs people.email)
- Member detail view / redaction rules (`member-run-visibility`)
- Retiring alias endpoints + alias files (cleanup slug after Phase 4 soaks)
- Re-keying person-profile.ts continuity (org-global slugify(name)) to personId
- Multi-manager sharing / reassigning a person between managers
- Reseed `seed-runs.ts` so the QA member is a *linked person*, not the creator (after Phase 5)

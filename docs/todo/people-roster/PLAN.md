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
| 1 | [people table + roster service (backend only)](phase-1.md) | 🔨 BUILT — awaiting walk |
| 2 | [new runs carry personId](phase-2.md) | ⬜ |
| 3 | [backfill existing runs + fold in aliases](phase-3.md) | ⬜ |
| 4 | [manager UI: person picker + roster-driven Team page](phase-4.md) | ⬜ |
| 5 | [member link + "Your 1:1s"](phase-5.md) | ⬜ |

## Current state

- 2026-07-05: plan approved by Carl (option B — "1:1s about me").
- **Phase 1 BUILT — awaiting Carl's walk** (details + live proof in phase-1.md). Migration 0007 applied to Neon; endpoints live-proven on a scratch API incl. member 403 + fencing; 75/75 tests, typecheck clean.
- Next after green light: Phase 2 (new runs carry personId).

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

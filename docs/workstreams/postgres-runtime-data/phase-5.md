# Phase 5 — Small stores: the odds and ends

**Status:** ⬜ not started (blocked by Phase 4 green light)

## Why this phase

Role profiles, overlays, people aliases, guest cap, audit trail and learning-loop data are each
small and low-risk — batching them into one phase avoids five ceremony-heavy micro-phases.
After this, NO app data is file-only.

## What gets built (each: DB store + read/write cutover, echo kept)

| Store | Today (file) | Target table | Writer/reader to change |
|---|---|---|---|
| Role profiles | `content/data/role-profiles/<key>.json` | `role_profiles` (cache_key unique, doc) | `backend/engine/role-profile.ts` generate/load/list |
| Role-profile overlays | `<key>.overlay.json` | `role_profiles.overlay` column | `role-profile.ts` write/loadOverlay |
| Arc overlays | `content/data/arc-overlays/<slug>.json` | `arc_overlays` | `backend/engine/arc-overlay.ts` |
| People profiles | `content/data/people/<slug>/` | `people_profiles` (derived, stored) | `backend/engine/person-profile.ts` build/read |
| People aliases | `content/data/people-aliases/<userId>.json` | `people_aliases` (user_id unique) | `backend/api/services/team/team.repo.ts` |
| Guest daily cap | `content/data/guest-cap.json` | `app_state` key `guest-cap` | `backend/api/.../guest-cap.ts` |
| Superadmin audit | `content/data/audit/superadmin.jsonl` | `audit_log` (append-only) | `backend/api/.../superadmin-audit.ts` |
| Lexicon candidates | `content/lexicons/_suggested/<sessionId>.json` | `lexicon_candidates` | `backend/engine/lexicon/candidates-io.ts` (+ promote-core read) |
| Tester feedback | `content/data/feedback/feedback.jsonl` | `feedback_notes` (EXISTS) | verify writer dead, delete it |

Role-profile reads sit on the engine hot path (question-generator/planner/eval) — same treatment
as questions: hydrate/read-through cache keeping sync signatures where needed.

## Files

`backend/engine/role-profile.ts` · `backend/engine/arc-overlay.ts` · `backend/engine/person-profile.ts` ·
`backend/api/services/team/team.repo.ts` · guest-cap + superadmin-audit modules ·
`backend/engine/lexicon/candidates-io.ts` + `promote-core.ts` · new small stores in `backend/db/`
(one file per store, pattern-clone of `sessions-store.ts`, mirrored tests).

## Tests (written first)

- Each store: write → read round-trip; file echo still produced when echo on.
- Role-profile cache: existing (role,seniority) hit avoids regeneration (no extra LLM calls).
- Guest cap: increments, resets on date change, refuses over cap.
- Audit: one row per cross-company access.

## QA scenarios (Carl)

1. Edit manager vocab (role-profile overlay) and an arc overlay in the admin UI → restart the
   server with `content/data` temporarily renamed aside → the edits are still there (they came
   from the DB).
2. Guest cap still counts (a guest run increments it; cap refusal message unchanged).
3. Superadmin: open another company's view → an audit entry appears.
4. Lexicon suggestions flow works end-to-end on a run.

## Rollback

Per-store: each cutover is its own small commit; files still written under echo.

## Risks

- Role-profile regeneration accidentally triggered (costs an LLM call) → cache-hit test above.

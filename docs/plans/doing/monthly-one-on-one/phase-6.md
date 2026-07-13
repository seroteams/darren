# Phase 6 — Record template + list merge

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Size:** ~1 day

## Goal
A finished Monthly Check-in is viewable afterwards: the manager gets a one-page record, and the session appears in the existing run lists alongside interview runs. Members see only that it happened.

## Changes
- Record template (`frontend/src/stages/guided/record.component.ts`): `/guided/:id` renders the runner while in progress and the record once `completed_at` is set (same URL; replaces Phase 4's interim read-only view). Sections stacked (decision 17): Summary → six-block scores + trend vs previous (from `block_scores`) → promises/requests/goals as they ended → feedback (less/more/learn) → **private review last, badged "Private — never shared with {name}"**.
- List merge: new repo fn `listCompletedGuidedSlim(orgId, {personId?, managerId?})` → `{id, personId, personName, managerName, label:"Monthly Check-in", completedAt}`. The list services (manager run history, person-detail "Past 1:1s", member-home `getRunsAboutMe`) merge + date-sort guided rows with interview rows. The interview queries themselves are NOT modified; existing list tests stay green untouched; new merge behaviour gets its own tests.
- Member-home entries are metadata-only (date · "Monthly Check-in" · manager) and link nowhere in v1 (decision 19 — member content view stays v2).
- Clicking a Monthly Check-in in a manager list opens `/guided/:id` (the record).

## Not in this phase
- Member content view (v2 — spec parked in plan.md). Trend charts (the record shows tabular/inline deltas only). Member writes (Phase 7).

## Done when
- [ ] A finished guided session appears correctly date-sorted in all three lists (verify against the DB rows)
- [ ] `npm run typecheck` + `npm test` green — existing list tests UNCHANGED and green
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **One timeline** — finish a Monthly Check-in, then look at your run history and the person's "Past 1:1s": it sits date-sorted among interview runs, labelled Monthly Check-in. ❌ Not OK if it's missing or interview runs disappeared.
2. **The record** — click it: one page — summary on top, scores with the vs-last-time deltas, the trackers as they ended, feedback, and the private review at the bottom with its badge.
3. **Member sees only the fact** — as a linked member account, "Your 1:1s" lists the Monthly Check-in's date/type/manager, nothing clickable, no content. ❌ Not OK if any note, score, or summary is reachable.
4. **Old lists unharmed** — a manager with only interview runs sees their lists exactly as before.

# Phase 6 — Record template + list merge

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Size:** ~1 day

## Goal
A finished Monthly 1:1 is viewable afterwards: the manager gets a one-page record, and the session appears in the existing run lists alongside interview runs. Members see only that it happened.

## Changes
- Record template (`frontend/src/stages/guided/record.component.ts`): the `/guided/:id` route renders the runner while in progress and the record once `completed_at` is set (same URL). Sections stacked (decision 17): Summary → six-block scores + trend vs previous → promises/requests/goals as they ended → feedback (keep/more/less) → **private review last, badged "Private — never shared with {name}"**.
- List merge: new repo fn `listCompletedGuidedSlim(orgId, {personId?, managerId?})` → `{id, personId, personName, managerName, label:"Monthly 1:1", completedAt}`. The list services (manager run history, person-detail "Past 1:1s", member-home `getRunsAboutMe`) merge + date-sort guided rows with interview rows. The interview queries themselves are NOT modified; existing list tests stay green untouched; new merge behaviour gets its own tests.
- Member-home entries are metadata-only (date · "Monthly 1:1" · manager) and link nowhere in v1 (decision 19 — no member content template yet).
- Clicking a Monthly 1:1 in a manager list opens `/guided/:id` (the record).

## Not in this phase
- Member content view (v2 — spec parked in plan.md). Trend charts (tabular only).

## Done when
- [ ] A finished guided session appears correctly date-sorted in all three lists (verify against the DB rows)
- [ ] `npm run typecheck` + `npm test` green — existing list tests UNCHANGED and green
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **One timeline** — finish a Monthly 1:1, then look at your run history and the person's "Past 1:1s": it sits date-sorted among your interview runs, labelled Monthly 1:1. ❌ Not OK if it's missing or interview runs disappeared.
2. **The record** — click it: one page, summary on top, scores with trend, the trackers as they ended, feedback, and the private review at the bottom with its private badge.
3. **Member sees only the fact** — as a linked member test account, "Your 1:1s" lists the Monthly 1:1's date/type/manager with nothing clickable and no content. ❌ Not OK if any note, score, or summary is reachable.
4. **Old lists unharmed** — a manager with only interview runs sees their lists exactly as before.

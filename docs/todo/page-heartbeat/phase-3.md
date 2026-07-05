# Phase 3 — Tasks board reality check

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The build board can check itself against reality: a button that reports what actually landed since your last check and flags rows that look out of date. It warns — it never rewrites your statuses.

## Changes
- Heartbeat endpoint grows an `activity` view: commits since a given SHA (subjects + dates, from git) and the state of `docs/todo/` plan folders (active vs done)
- `admin/src/stages/tasks.js` — a **Check board** button: fetches activity since the last snapshot, shows "since your last check: N commits landed (…), plan X moved to done/" and flags board steps still marked *doing* with no matching activity, or plans in done/ whose board row isn't ✅
- Board `s` fields stay hand-set (standing rule) — this is a smoke detector, not an autopilot

## Not in this phase
- Auto-editing any board status
- Mapping every commit to a specific board step (best-effort by keywords/paths only, clearly labelled)

## Done when
- [ ] `npm test` green · no new typecheck errors
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **First check** — open /tasks, click **Check board**. You should see a snapshot saved + the current build SHA.
2. **It sees work land** — after I commit something, click again. You should see that commit listed in plain words. ❌ Not OK if it says "no changes".
3. **It smells a stale row** — with a plan folder in done/ whose board row isn't done, the check should flag it by name.

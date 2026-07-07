# Phase 1 — The manager rail

**Managers (paying customers) stop seeing the internal toolset.** They get: Home · New 1:1 ·
Team · Past 1:1s (+ the shared footer). Admin rail unchanged. Member rail unchanged.

## How
- `state.js`: new `isInternalAdmin(user)` — `admin` role only. (`isAdmin` keeps gating console
  *access* — managers still use the app; they just lose the workshop *rail*.)
- `router.js`: new `INTERNAL_ONLY` set + `isInternalStage()` — Library, Compare, Personas,
  Coaching phrases, Role words, Meeting arcs, Tasks, Universe, Guide. (START and REVIEW_RUN stay
  manager-reachable: their own dashboard + their own run reviews; backend fences the data.)
- `app-nav.js`: four manager-tagged rows (mghome/mgnew/mgteam/mgruns) reusing existing stages;
  `render()` picks the audience: internal admin → full rail, manager → manager rail, member →
  member rail. Active-highlight map now supports a stage lighting either audience's row.
- `main.js`: managers deep-linking / back-forwarding into an internal stage land on Home (START).
- Tests first (`node:test`): `state.test.js` (isInternalAdmin), `router.test.js` (isInternalStage).

## Backend endpoints managers can still hit (noted for a later gate, Carl's call)
The router wall is cosmetic; `/api/...` endpoints for library/personas/etc. that only check
login (not role) remain callable by a determined manager. Listed during build in PLAN.md Parked.

## QA scenarios (Carl walks)
- [ ] Log in as **admin** (you): rail identical to before — all groups, all rows.
- [ ] Dev quick-swap / log in as a **manager**: rail shows only Home · New 1:1 · Team · Past 1:1s + footer.
- [ ] As manager, type `/tasks` or `/library` in the address bar → you land on Home, no flash of the tool.
- [ ] As manager, run a full 1:1 prep (Home → New 1:1 → flow) — unchanged.
- [ ] As **member**: Home · Team · Past 1:1s rail unchanged.

**Green light = commit.**

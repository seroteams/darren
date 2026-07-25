# Phase 4 — Permissions and silent controls

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
A manager can no longer change an admin's role, and the controls people actually reach for answer back and are big enough to hit.

## Changes
- **Rank check on role changes (F16)** — `backend/api/services/members/members.service.ts`: `setRole` must refuse when the target is an `admin` and the actor is not. Today it accepts any target inside the org and only guards the last-active-lead case, so a plain manager can demote the account that runs the workspace. `deactivate` already guards superadmin emails; give `setRole` the same seriousness.
- **Hide what is not allowed** — `admin/src/ui/row-menu.ts` and the members table: a non-admin sees no role actions on an admin row at all. The backend refusal is the wall; this is so nobody is invited to hit it.
- **Add request answers back (F18)** — the member home requests form: an empty box gets a one-line message under the field, in the voice intake already uses ("Pick someone, or add a name to continue."). Today the button is enabled, does nothing, and says nothing. It is the member's only control.
- **Tap targets reach 44px (F9)** — grow the hit area without changing the look, using an inset `::before`. Measured today: row overflow menus 34×26, nav collapse 28×28, star ratings 25×24, account chip 28×22, filter checkboxes 18×18.

## Not in this phase
- Any change to who can invite people. That question moves when Team and Members merge in Phase 8.
- The `admin` / `manager` / `member` role names themselves.

## Done when
- [ ] A unit test proves `setRole` refuses a manager acting on an admin, and still allows a manager acting on a manager or a member
- [ ] A unit test proves an admin can still change anyone's role
- [ ] The refusal is verified against the API, not just the service function
- [ ] Signed in as a manager, the admin rows carry no role actions (read from the rendered menu)
- [ ] Every grown control measures at least 44×44 including its inset (numbers recorded)
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — to the product owner
Walk through these yourself. Next phase waits for your green light.

1. **A manager cannot touch an admin** — `local > customer (audit.manager) > Members`, open the "..." menu on the "Audit Admin" row. There should be no "Make manager" and no "Switch off access". ❌ Not OK if either is still offered.
2. **A manager can still manage a member** — same screen, open the "..." on "Audit Member". The normal actions should still be there and still work.
3. **An admin can still do everything** — `local > admin (audit.admin) > User management`, open a row menu. Full actions, unchanged.
4. **Add request says something** — `local > customer (audit.member) > Home`, leave the request box empty and tap "Add request". You should get a short line telling you what to do. ❌ Not OK if nothing happens.
5. **Add request still works properly** — type "more design review time" and tap it. The request should appear in the list.
6. **The small buttons are easier to hit** — `local > customer (audit.manager) > Team`, tap the "..." at the end of a row without aiming carefully. It should open. Same for the stars on a run detail.

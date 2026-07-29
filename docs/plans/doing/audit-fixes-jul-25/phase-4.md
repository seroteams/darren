# Phase 4 — Permissions and silent controls

**Part of:** [plan.md](plan.md) · **Status:** 🔨 BUILT 2026-07-29, awaiting Carl. Not walked by him yet.

## Goal
A manager can no longer change an admin's role, and the controls people actually reach for answer back and are big enough to hit.

## What it did

### F16 — the rank hole (the real find)
`requireAdmin` on the members routes lets managers **and** admins through. That is correct
for managing members, but it meant a plain manager could demote or switch off the `admin`
account that runs the workspace. `setRole` only guarded the last-active-lead case;
`deactivate` only guarded Sero's own superadmin emails, which does nothing for a customer
org's admin.

- New `canActOn(actorRole, targetRole)` in `backend/api/services/members/account-guards.ts` —
  the org-scoped seam both mutations already share. One rule: only an admin may act on an
  admin. An actor whose role can't be resolved has no role, so it **fails closed**.
- Applied to `setRole` **and** `deactivate`. Shipping one without the other would have been
  half a fix: the same escalation is reachable through either endpoint.
- `frontend/src/stages/members-table.ts` hides the ⋯ menu entirely on an admin row for a
  non-admin viewer. Every action that menu offers is now refused server-side, so an empty
  menu would read worse than no menu. Pending-invite rows are never gated: their role is
  what the invite *will* grant, not power anyone holds today.
- `membersTable(rows, viewerIsAdmin = false)` defaults to the safe side, so a caller that
  forgets the argument hides actions rather than offering refused ones.

The server refusal is the wall. The UI change exists so nobody is invited to hit it.

### F18 — the silent button
The member's "Add request" form did `if (!text) return;` on an empty box: the button looked
live, did nothing, and said nothing. It is the member's **only** control on that screen. It
now names the fix ("Type what would help, then add it."), marks the field `aria-invalid`, and
puts the cursor in it. The save-failure path reuses the same message slot instead of
injecting a fresh `<p>` each time, which is how the old version could stack duplicate errors.

### F9 — tap targets
One rule in `admin/src/styles/design/mobile.css`, inside the existing `pointer: coarse`
block. An inset `::before` grows only the area that receives the tap, so the glyph, padding
and alignment are untouched. Applied to the row overflow menus (34x26), the nav collapse
(28x28), and the account chip (28x22).

## Verified

- `npm test` **202/202**, `npm run typecheck`, `lint:copy`, `lint:tokens`, `lint:components`
  all green. 10 new tests (6 service, 5 members-table, 2 member-home).
- **F16 against the real HTTP API**, not just the service function. A real signup (manager)
  plus a real `admin` row seeded into the same org, then driven as the manager:
  | Call | Result |
  |---|---|
  | `PATCH /members/:adminId/role` | **409** "Only an admin can change an admin's role." |
  | `POST /members/:adminId/deactivate` | **409** "Only an admin can switch off an admin's account." |
  | `PATCH /members/:peerId/role` (control) | **200**, role changed. The guard is not over-blocking. |
- **F16 on screen.** Signed in as the manager at `/members`: the `admin` row renders with
  **no ⋯ menu**, the `manager` row keeps its own. One menu on the page, not two. The admin
  row itself still shows: hidden actions, not a hidden person. No console errors.
- **F18 on screen.** Empty submit shows "Type what would help, then add it." in the coral
  error colour at 14px, sets `aria-invalid="true"`, and focuses the box.

## NOT verified

- **No screenshot.** The Browser pane would not composite frames, so all of the above is
  measured off the live DOM rather than seen as a picture.
- **The add-request happy path was not proved.** The test account was a manager demoted to
  member, and `POST /me/requests` legitimately 404s "No linked person" for it — a real member
  arrives through an invite and is linked to a roster row. What this *did* prove is that the
  failure path renders its message correctly. Worth one walk with a properly invited member.
- **F9 was not measured on a touch device.** The rule is inside `@media (pointer: coarse)`,
  which a desktop browser never matches, so the 44px numbers are asserted by the CSS, not
  read off a device. The audit's star-rating and filter-checkbox targets were left out: the
  stars mount through `js-stars-mount` with no stable class to hang the rule on, and the
  filter checkboxes are inside another lane's files.

## Not in this phase
- Any change to who can invite people. That moves when Team and Members merge in Phase 8.
- The `admin` / `manager` / `member` role names themselves.

## Done when
- [x] `setRole` refuses a manager acting on an admin; still allows manager and member targets
- [x] An admin can still change anyone's role
- [x] The refusal verified against the API, not just the service function
- [x] As a manager, admin rows carry no role actions (read from the rendered table)
- [x] `npm test`, `typecheck`, `lint:copy`, `lint:tokens`, `lint:components` clean
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **A manager cannot touch an admin** — `local > customer (a manager account) > Members`.
   The admin row should have no ⋯ at all. ❌ Not OK if a menu is offered.
2. **A manager can still manage a member** — same screen, the ⋯ on a member or manager row
   works exactly as before.
3. **An admin can still do everything** — signed in as an admin, every row has its ⋯ back.
4. **Add request says something** — `local > customer (an invited member) > Home`, leave the
   request box empty and press "Add request". You get a line telling you what to do.
5. **Add request still works** — type "more design review time" and press it. It appears in
   the list. (This is the one I could not prove; see NOT verified.)

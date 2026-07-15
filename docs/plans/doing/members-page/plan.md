# Members page (Notion-style workspace members)

**Goal:** Replace the confusing per-person "give access / link an existing account" model with a standard SaaS Members page — one place to see who can log in, invite by email with a role, and manage them.
**Driver:** Carl
**Created:** 2026-07-15

## Done means
- **Adding to your team is name-only** (name + optional job/seniority) — no email, no invite in that modal. One job.
- A manager/admin has a **Members** screen: name · email · role · status (Active / Invited / Deactivated).
- **Inviting has ONE mechanism.** Its home is the Members page (one "Invite people" button, email + role). The Team card keeps a per-person **"Invite to log in"** shortcut that reuses the *same* flow, pre-linked to that person — so an email is never typed twice.
- Row actions change role, deactivate, revoke/resend.
- The **"Link an existing account" dropdown is gone**; the Team card shows a plain access status + that one shortcut.
- Everything is org-fenced — a manager only ever sees/manages their own workspace.

## UX principle (why it's shaped this way)
Two different jobs kept apart, per modern SaaS (Linear / Notion / Slack / Figma): **"add to my team" (lightweight, a name) ≠ "provision a login" (email + role)**. Invitations live in one home with a pending→active lifecycle; account creation is lazy / just-in-time. No duplicate invite surfaces, no double email entry.

## Resolved before we start (dug out of the code)
- **No database migration needed.** `invitations.person_id` is already nullable and `invitations.role` already exists (`backend/db/schema.ts`). Person-less org invites + role-on-invite are pure code.
- Accept currently hardcodes role `member` (`invites.service.ts:75`) — Phase 2 wires the stored role through.
- Members page lives in the **`frontend/`** app (where real managers are), mirroring `frontend/src/stages/team.ts`.
- Reuse: the invite engine (`backend/api/services/invites/*`) and the superadmin page's guards + UI (`admin/src/stages/admin-registered.ts`, `superadmin.service.ts`).

### Defaults locked (Carl can still change any)
1. Placement: `frontend/` only. 2. Old link endpoints: dormant first, delete last. 3. "Remove" = deactivate (reversible). 4. Invite roles offered: Manager / Member only (Admin stays internal). 5. Resend re-mints a fresh token.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Read-only Members list + nav | The screen exists — everyone + pending invites, read-only | ✅ |
| 2 | Invite with role | "Invite people" actually sends invites | ✅ |
| 3 | Row actions: role / deactivate | ⋯ menu works, with last-manager safety | ⬜ |
| 4 | Pending-invite: revoke / resend | Manage invites that haven't been accepted | ⬜ |
| 5 | Auto-match + Team-card cleanup | Old dropdown retired; card shows plain status | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 2 ✅ green-lit by Carl 2026-07-16** ("a"). "Invite people" now sends real invites with a chosen role (Manager/Member) — person-less `createForOrg` + role wired through `accept`, reusing the invite engine + email; new invite modal on the Members page. Offline proof: tests 22/22, typecheck clean. (Phase 1 ✅ 2026-07-15.) **Next: Phase 3 — Row actions (role / deactivate / reactivate).** The earlier "invite from Add box" checkbox is still to be dropped during the Phase 5 team.ts rework.

Baseline result: _(to record before Phase 1 — free checks only unless a paid run is truly needed)_

## Parked
- Merging the `people` roster and `users` accounts into one record (the "biggest" option) — rejected for now; would need a data migration and breaks account-less roster people.
- Showing Members in the internal `admin/` engine app too (parity) — only if wanted later.
- Hard-delete of org members by a normal admin — stays superadmin-only.

## Stage note
Flagged against the validation-stage "park big builds until Gate 1" rule; Carl green-lit knowingly (2026-07-15).

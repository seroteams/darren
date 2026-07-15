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
| 3 | Row actions: role / deactivate | ⋯ menu works, with last-manager safety | 🔨 |
| 4 | Pending-invite: revoke / resend | Manage invites that haven't been accepted | 🔨 |
| 5 | Retire the link dropdown + drop double-email | Old dropdown gone; Add = name-only | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phases 1–2 ✅ green-lit. Phases 3–5 🔨 built + committed 2026-07-16, awaiting Carl's one final walk** (batched on his "finish this, stop asking").
- **P3** — row ⋯ menu: change role, deactivate/reactivate, last-active-manager guard, session-kick, audit. Commit `e2b351e3`.
- **P4** — pending-invite revoke / resend (fresh token, old dies). Commit `c36fff01`.
- **P5 (adjusted)** — the confusing **"Link an existing account" dropdown is removed** from the give-access modal (the per-person invite is now just "invite by email" = the shortcut), and the **Add-someone double-email checkbox is removed** (Add = name only). Offline proof across P3–5: tests 36/36, typecheck clean.

Deferred to Parked (see below) to avoid churning files other sessions are editing: the invite-time **auto-match** (link an existing account by email instead of erroring at accept), the fuller Team-card chip redesign, and cleaning the now-dead add-person invite helper code.

Baseline result: _(to record before Phase 1 — free checks only unless a paid run is truly needed)_

## Parked
- **Invite-time auto-match** (P5 remainder) — when inviting an email that already has an org account, link `people.user_id` immediately + skip the token, instead of the invitee hitting "email already has an account" at accept. Deferred: the clean path touches `team.ts` which other sessions are editing.
- **Team-card chip redesign + dead-code cleanup** (P5 remainder) — the fuller read-only chip on the card, and removing the now-unused add-person invite helper (`inviteEmailError`, `PersonDraft.email/invite`) once `team.ts`/`add-person-*` are safe to commit.
- Merging the `people` roster and `users` accounts into one record (the "biggest" option) — rejected for now; would need a data migration and breaks account-less roster people.
- Showing Members in the internal `admin/` engine app too (parity) — only if wanted later.
- Hard-delete of org members by a normal admin — stays superadmin-only.

## Stage note
Flagged against the validation-stage "park big builds until Gate 1" rule; Carl green-lit knowingly (2026-07-15).

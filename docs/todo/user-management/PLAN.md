# User management

**Goal:** From the Registered screen, the superadmin can manage any registered user — change their role, deactivate/reactivate them, delete them, and issue a reset/invite link — with hard safety rules so no action can lock out an operator, wipe history, or leave a company leaderless.
**Driver:** Carl
**Created:** 2026-07-04

## Done means
- Every person on the Registered screen has a **Manage** button opening four plain actions.
- Change role, deactivate/reactivate, delete, and reset/invite all work end to end and persist.
- Guardrails hold server-side: no self-delete/deactivate, no touching a `SUPERADMIN_EMAILS` account, never leaving an org with zero active manager/admin.
- Every attempt (success, blocked, failed) is in the superadmin audit log; reset/invite tokens never are.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 0 | Safety and schema check | Read-only: confirm access, schema, `runs.userId` nullability, session/token facts — go/no-go | ⬜ |
| 1 | Change a user's role | `PATCH …/role` + Manage-menu role picker; last-manager demotion blocked | ⬜ |
| 2 | Deactivate / reactivate | `deactivatedAt` column + routes; login blocked + live sessions killed | ⬜ |
| 3 | Delete a user | `DELETE …/:id`; runs kept-but-orphaned; confirm dialog + guardrails | ⬜ |
| 4 | Reset password / invite | `POST …/reset-password`; single-use hashed expiring token → copyable link | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Folder scaffolded 2026-07-04, awaiting Carl's go to start Phase 0. **PG8 gets green-lit first** — this plan extends the same Registered/admin surface. No baseline yet (runs when a phase starts). Nothing built.

Phase 0 is read-only (no code, no cost); its findings — superadmin access, `users` schema, `runs.userId` FK/nullability, how sessions are revoked, the token pattern to reuse, and whether email-send infra exists — get written back into this section before Phase 1 starts.

## Parked
- Per-company manager-facing user management (customer-facing) — Carl chose superadmin-only for now.
- Bulk actions / CSV, add-a-user-manually from the console, edit name/email inline, move a user between companies.
- Email-templating polish (Phase 4 ships the minimum that proves the flow).

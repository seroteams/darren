# Phase 006 — Auth (passwords now, SSO-ready, org-on-signup)

## Goal (plain)
Give Sero a real front door: people can **register** and **log in** with strong password protection —
and because this is an **HR system**, signing up **creates an organisation** that the user belongs to.
Build it so Google/Microsoft sign-in can be added later without a rewrite.

## What you'll have when it's done
- **Register + login**, with passwords hashed using a current best-practice algorithm (**argon2id**, or
  bcrypt) — raw passwords are never stored.
- **Signup creates an organisation** and makes the first user its **owner**. Every user has an `org_id`
  and a **basic role** — `owner` / `admin` / `member` for now.
- **SSO-ready structure:** identity is decoupled from credentials. A separate `auth_identities` table
  holds the sign-in method (`provider = password` now; `google` / `microsoft` later), so adding SSO is a
  new row type, not a redesign.
- **Invitation scaffolding** (wired for later, not the full feature yet): an `invitations` table with the
  fields we'll need — `email`, `org_id`, `role`, `token`, `status`, `sent_at`, `expires_at`,
  `accepted_at` — so "invite a teammate / resend / expire" drops in cleanly later.
- **Auth middleware** guarding protected routes; sessions and runs **scoped to the user's organisation**.
- All built **test-first** (red → green).

## A grounding example (before → after)
- **Before:** open the app and you're straight in; anyone can see any run.
- **After:** register `darren@proptech.builders` → an organisation is created with you as **owner** →
  log in → you only ever see **your organisation's** runs. Later, you can invite a colleague into that org.

## The steps (to be detailed when this phase starts)
1. Finalise the `organizations` / `users` / `auth_identities` / `invitations` schema (with Phase 005).
2. Implement password hashing + register + login.
3. Issue and verify a login token/cookie; add the auth middleware.
4. Make signup create the org + owner; scope all tenant data by `org_id`.

## How we'll know it's done (full list in `99-qa-signoff.md`)
- Registering creates **a user AND an organisation** with that user as owner.
- Login works; a protected route is refused when logged out.
- Two different organisations cannot see each other's data.

## Note
Depends on Phase 005 (the `organizations` / `users` / `invitations` tables must exist first).

> **Status:** overview only. Detailed step files get written when we start this phase.

# Member invites — the join link (CLOSED 2026-07-06)

**Goal:** the missing last mile of member onboarding — a manager invites a roster person by
email, sends them a one-time join link, and accepting it creates their member account in the
manager's company, auto-links the roster row, and logs them straight into "Your 1:1s".
**Driver:** Carl ("finish it", all-in-one-thread) · **Branch/PR:** `member-onboarding-invites` / PR #8

## What landed (single phase, built + browser-proven same day)

- **Schema (migration `0008`):** `invitations` gains `token_hash` + `person_id` — the
  scaffolded Phase-006 table finally wired. ⚠️ **Run `npm run db:migrate` on live Neon before
  using invites there.**
- **Backend** (`backend/api/services/invites/`): service + repo + controller, 7 unit tests.
  Token rules (as specced in user-management P5): **single-use** (status flips on accept),
  **7-day expiry**, **sha256-hashed at rest** — the raw token exists only inside the returned
  link, never logged, never stored. Create is manager/admin + fenced to their own roster
  person; an email that already has an account gets a plain-words 400. Routes:
  `POST /team/people/:id/invite` (origin-guarded) · `GET /invites/:token` (public preview) ·
  `POST /invites/:token/accept` (public, origin-guarded, sets the login cookie like login).
- **Frontend:** Team → Tidy up gains **"Invite…"** on every unlinked person (email prompt →
  copyable link, privacy stated in the copy); new public **`/join/:token`** page (stage JOIN)
  shows "«manager» at «company» invited you", pins the email, asks name + password, and lands
  the new member on their "Your 1:1s".

## Proof

- Unit: 7 invite-service tests (hash-at-rest, expiry, single-use, cross-manager 404, dup
  email, short password) → suite **80/81** (1 pre-existing replay fail) · typechecks · both builds.
- **Playwright, 8/8 live** on a scratch stack ($0): mint from Tidy up → logged-out join page →
  accept → logged-in member home showing the 1:1 about them → about-me payload still minimal →
  member 403 on roster → **re-opened link is dead**. DB verified: token stored as 64-char hash,
  `people.user_id` linked. 4 screenshots delivered in chat (2026-07-06).

## Parked
- Real email delivery (Sero sends the invite itself) — alpha is copy-the-link.
- Invite revoke UI + a pending-invites list (the table's `status: revoked` is ready for it).
- Re-invite / resend flow; invite expiry surfacing on the Team page.

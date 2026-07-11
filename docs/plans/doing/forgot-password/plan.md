# Forgot Password — reset flow for all apps

**Goal:** A user who forgets their password can request an email link and set a new one — one flow for managers, members, and admin.
**Driver:** Carl
**Created:** 2026-07-11

## Done means
- On the login screen there's a "Forgot password?" link.
- Submitting your email sends a branded Sero reset email (from `seroapp.com`).
- The link opens a "set a new password" screen; setting it lets you log in with the new password.
- Old/used/expired links are refused; unknown emails still show the same "check your inbox" message (no account-existence leak).

## Resolved before we start
- **One shared login** (`admin/src/stages/login.js`, cross-imported by the customer app) → one reset UI serves both apps; admin is covered automatically.
- **Blueprint = the invitations flow** — public endpoint, `randomBytes(32)` token stored as `sha256` hash, expiring + single-use, emailed via the branded template. Reset = the same pattern minus account creation.
- **Live delivery solved** — Resend key is tied to `seroapp.com` (verified, sending enabled). Confirmed via a read-only domains check. Sender becomes `notifications@seroapp.com`.
- **Token in a path segment** `/reset-password/:token` (matches `/join/:token`, keeps the token out of query strings).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Backend reset flow | Token table + migration, 2 endpoints, reset email, seroapp.com sender | ✅ |
| 2 | Reset UI (both apps) | "Forgot password?" link + request/reset screens, wired into both apps | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ green-lit by Carl 2026-07-11 ("A") + committed.** Backend reset flow live in code: `password_reset_tokens` table (`0014`), `forgot-password` + `reset-password` endpoints, branded seroapp.com email, rate limit. Proven end-to-end on the real dev DB + a real email delivered to Carl's inbox. Offline: typecheck clean, 27/27 tests.
**Sender:** DECIDED seroapp.com — local `.env` switched; live `render.yaml` untouched (go-live needs the key in Render's dashboard).
**Next: Phase 2** — the "Forgot password?" link + request/reset screens, wired into both apps.
**Baseline (pre-work, free):** `auth.service.test.ts` 10/10; typecheck clean.

## Parked
- **Revoke existing login sessions on reset** (kick other devices after a reset) — good hardening, not needed for the first cut.
- **Purge sibling reset tokens** for the user when one is used (each is already single-use + 1h expiry).
- **"Set your password" for invited members with no password yet** — reset already works for them; no special copy for now.

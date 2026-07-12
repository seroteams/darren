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
| 2 | Reset UI (both apps) | "Forgot password?" link + request/reset screens, wired into both apps | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state — ✅ TRACK CLOSED 2026-07-12 (Carl: "this is good push it")
Both phases green-lit and merged to `main`; pushed live.
**Phase 1 ✅** — backend: `password_reset_tokens` table (`0014`), `forgot-password` + `reset-password` endpoints (origin-guarded, rate-limited, always-200 no enumeration), branded seroapp.com email. Proven end-to-end on the real dev DB + a real inbox email.
**Phase 2 ✅** — the "Forgot password?" link + request/reset screens, one UI shared by both apps, wired into both routers/loaders/boot. typecheck+build+browser all green; walked live by Carl on `:3000`. Merged via `2b38666e` (parked+restored 2 other sessions' WIP — nothing swept).
**Live email caveat:** delivery on the live site needs the seroapp.com key set as `EMAIL_API_KEY` in Render's dashboard (sync:false — not in git). `render.yaml` `EMAIL_FROM` already points at seroapp.com.

## Parked
- **Revoke existing login sessions on reset** (kick other devices after a reset) — good hardening, not needed for the first cut.
- **Purge sibling reset tokens** for the user when one is used (each is already single-use + 1h expiry).
- **"Set your password" for invited members with no password yet** — reset already works for them; no special copy for now.

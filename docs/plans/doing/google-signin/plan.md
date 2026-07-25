# Continue with Google

**Goal:** Anyone can log in or sign up to Sero with one click on their Google account, alongside the existing email + password door.
**Driver:** Carl
**Created:** 2026-07-25
**Mockup:** https://claude.ai/code/artifact/10f61fde-92e1-4724-a079-894ce38a20e2 — approved 2026-07-25

## Done means
- A "Continue with Google" button sits on the login and create-account screens in both apps.
- A brand-new Google user gets a fresh workspace (same as the signup form) and Carl gets the signup alert email.
- An existing account with the same email just logs in; their password keeps working too.
- An invited teammate using Google lands in the company that invited them, as a member.
- Live on sero-obwq.onrender.com, proven by a real Google sign-in walk.

## Resolved before we start
- Login/register are ONE set of files (`admin/src/stages/login.js` + `register.js`) imported by both apps — one edit serves both.
- The Google callback mints the exact same session cookie as password login (`auth.controller.ts:79-82`), so everything downstream (boot, `me()`, guards) is untouched. No new frontend routes needed.
- Server-side OAuth redirect flow with PKCE, zero new npm packages (Node 24 `fetch` + `node:crypto`). The strict CSP stays untouched — no Google JS SDK.
- Dev redirect URI is `http://localhost:3001/...` (API port direct); localhost cookies ignore ports, so the session reaches both Vite apps.
- `DEV_AUTOLOGIN` must be unset when testing locally — it bypasses the login screen entirely.
- Account ladder: google id match → login; email match → link (password untouched); pending invite → auto-join that company; unknown → fresh signup (alert + demo workspace fire like the form). Deactivated accounts stay blocked. `email_verified` must be true.
- Data: one migration, `users.google_sub` nullable + unique index. Direction (SSO) already board-approved 2026-07-04 (SERO_BOARD.md:258).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Backend flow (dark) | Google OAuth routes + migration, reachable by URL only; Carl's Google Cloud setup | ✅ |
| 2 | Buttons on the screens | "Continue with Google" on login + register, both apps, friendly error copy | 🔨 |
| 3 | Live rollout | Render env vars, consent screen to Production, live walk | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 1 ✅ GREEN-LIT 2026-07-25 (Carl walked fresh-signup + existing-link with real Google accounts; both verified in DB). Phase 2 (buttons on login/register) 🔨 started same day on Carl's "shall we go". Board: https://claude.ai/code/artifact/eedb318d-491e-4ea4-a1f5-1d9785652343 · Suite 185/185, typecheck + lint:copy clean. NOTE: STATUS.md not yet updated — lane held by another live chat (design-consolidation); fold in when it frees.

## Parked
- Google button on the invite-join page and the public welcome page (Carl chose login + signup first, 2026-07-25).
- Microsoft SSO (board note mentions it; needs its own column + flow later).
- "Unlink Google" / account-settings surface for connected sign-ins.

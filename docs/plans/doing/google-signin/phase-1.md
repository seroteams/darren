# Phase 1 — Backend flow (dark)

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl's QA

## Built (2026-07-25)
- Migration `0021_thankful_lockheed.sql`: `users.google_sub` + unique index (null-safe for every existing row).
- New module `backend/api/services/auth/google-auth.{service,controller,repo}.ts` + 2 test files (written first): PKCE + state/nonce handshake, claim validation (iss/aud/exp/nonce, `email_verified` required), the 4-branch account ladder, every failure a friendly `/login?error=...` redirect.
- Routes `GET /api/v1/auth/google/start` + `/callback` in server.ts (origin-guarded, shared auth rate limit); state cookie helpers in `middleware/cookies.ts`; `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` documented in `.env.example` + prompted by `render.yaml`.
- Offline proof: npm test 185/185 (29 new google-auth tests), typecheck clean, lint:copy clean. Baseline before work: 183/183 + typecheck clean.

## Goal
The whole Google sign-in flow works end to end locally, reachable only by pasting a URL — no buttons yet, nothing a user can see.

## Carl's setup first (about 10 minutes, one-off)

You create the Google side yourself (it is your Google account and a secret key; I never touch it):

1. Go to **console.cloud.google.com** and sign in with your Google account. Top bar → project picker → **New project** → name it **Sero** → Create.
2. Left menu → **APIs & Services → OAuth consent screen**. Pick **External** → Create. App name **Sero**, support email = your email, developer contact = your email. Save through the next screens — do NOT add any extra scopes (the basics are already included). On the Test users step, add your own Gmail/Google addresses you'll test with.
3. Left menu → **Credentials → Create credentials → OAuth client ID**. Application type **Web application**, name **Sero web**. Under **Authorized redirect URIs** add BOTH lines exactly:
   - `http://localhost:3001/api/v1/auth/google/callback`
   - `https://sero-obwq.onrender.com/api/v1/auth/google/callback`
   Leave "Authorized JavaScript origins" empty. Create.
4. A box shows a **Client ID** (ends in `.apps.googleusercontent.com`) and a **Client secret**. Open the file `.env` in the project folder and add two lines at the bottom, then save:
   ```
   GOOGLE_CLIENT_ID=paste-the-client-id-here
   GOOGLE_CLIENT_SECRET=paste-the-secret-here
   ```
   The secret stays in that local file only — never in git, never in chat.

## Changes
- One database migration: `google_sub` column + unique index on users (safe for every existing row).
- New backend module `backend/api/services/auth/google-auth.{service,controller,repo}.ts` + two test files (tests written first): start route builds the Google redirect (PKCE + state cookie), callback verifies everything, finds or creates the account (ladder in plan.md), mints the normal session cookie, redirects home. Every failure becomes a friendly `/login?error=...` redirect, never a broken page.
- Two routes in `server.ts` (`/api/v1/auth/google/start` + `/callback`), guarded + rate-limited like the other auth routes.
- State cookie helpers in `middleware/cookies.ts`; small exports from `auth.controller.ts` / `auth.service.ts` so nothing is copy-pasted.
- `.env.example` + `render.yaml` learn the two new variable names.

## Not in this phase
- Any visible button or screen change (Phase 2).
- Anything on Render / live (Phase 3).

## Done when
- [ ] `npm test` + `npm run typecheck` green, new tests cover the ladder, claim checks, cookies, missing-env, cancel and rate-limit paths
- [ ] The four scenarios below pass on Carl's machine
- [ ] Carl has tested and said go

## Test scenarios — for the product owner
Before you start: make sure `.env` has the two GOOGLE lines (setup above) and that `DEV_AUTOLOGIN` is NOT in `.env` (delete or comment the line if present). Start the app as usual (`npm run dev`).

1. **Fresh signup** — in your browser paste `http://localhost:3001/api/v1/auth/google/start` and pick a Google account Sero has never seen. You should land on `http://localhost:3002/` logged in, with the demo workspace there. ❌ Not OK if you get an error page or land logged out.
2. **Existing account links** — repeat with the Google account whose email matches one of your existing test accounts. You should land logged in as that same user, same company (no new company created). Afterwards, log out and check the password still works for it.
3. **Cancel** — repeat, but press Cancel on Google's screen. You should land back on the login screen (the address bar shows `error=google-denied`; the friendly wording arrives in Phase 2).
4. **Not configured** — put a `#` in front of the `GOOGLE_CLIENT_ID` line in `.env`, restart the app, paste the start URL again. You should bounce to the login screen with `error=google-unavailable`. Remove the `#` after.

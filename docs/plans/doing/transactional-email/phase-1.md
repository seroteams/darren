# Phase 1 — Admin "someone registered" alert

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT

## ✅ GREEN-LIT 2026-07-11 — Carl "a" (offline proof mine; live-send on Carl's confirmation)
Carl green-lit on the A option ("tested, good → commit + Phase 2"). Offline proof stood behind by me
(`npm test` 120/120, typecheck clean); the live email landing is Carl's own confirmation, flagged as such.

## Built (2026-07-11)
Code landed + proven offline (no paid runs). Files:
- `backend/engine/email-client.ts` (+ `.test.ts`) — Resend send helper, fetch+timeout+retry, `sendEmail` / `sendEmailQuietly`.
- `backend/api/services/notifications/notifications.service.ts` (+ `.test.ts`) — `notifyAdminOfNewRegistration`, recipients from `SUPERADMIN_EMAILS`, HTML-escaped body, empty-list no-op.
- `backend/api/services/auth/auth.controller.ts` — one fire-and-forget line in `register()`.
- `.env.example` + `render.yaml` — `EMAIL_API_KEY` (secret) + `EMAIL_FROM`.

Proof: `npm test` 120/120 (was 118, +2 new files, 9 new assertions), `npm run typecheck` clean. Live-send test is Carl's QA walk (needs Resend signup).

## Goal
Carl gets an email the instant anyone registers a new account — and it proves the whole email pipe works end to end.

## Changes
- **New** `backend/engine/email-client.ts` — the send helper. `sendEmail()` (throws) + `sendEmailQuietly()` (fire-and-forget, swallows + logs errors). POSTs to Resend, mirrors `ai-client.ts` (fetch + timeout + retry), reads `EMAIL_API_KEY` / `EMAIL_FROM` from env.
- **New** `backend/engine/email-client.test.ts` — mocked `fetch`: asserts URL, bearer header, body shape, retry-on-429, and that `sendEmailQuietly` never throws.
- **New** `backend/api/services/notifications/notifications.service.ts` — `notifyAdminOfNewRegistration(user)`: builds the subject/body, sends to everyone on `SUPERADMIN_EMAILS`, no-op if that list is empty.
- **New** `backend/api/services/notifications/notifications.service.test.ts` — injected fake sender: asserts recipients + body, and empty-allowlist = no send.
- **Edit** `backend/api/services/auth/auth.controller.ts` — one fire-and-forget line in `register()`, after the account is created, before the 201.
- **Edit** `.env.example` + `render.yaml` — add `EMAIL_API_KEY` (secret) and `EMAIL_FROM`.

## Not in this phase
- Invite emails (Phase 2), new-member alert (Phase 3).
- Any HTML styling beyond a plain, readable body.
- A retry queue / outbox — a failed send is logged and dropped.

## Done when
- [ ] Registering a new account triggers a real email to Carl's inbox (verified by receiving it, not by reading the code).
- [ ] With `EMAIL_API_KEY` unset, registration still succeeds (201) — email failure never blocks signup.
- [ ] Free checks green: `npm test` (new unit tests pass) + `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Prereq — Carl's one-time Resend setup (do before the live-send test)
1. Sign up at **resend.com** (GitHub or email).
2. **Add + verify `seroteams.com`** (Resend → Domains → Add Domain) — add the DNS records it shows (SPF/DKIM). Wait for **Verified** (minutes–hours). *For the very first test you can skip this and send from Resend's `onboarding@resend.dev` sandbox.*
3. **Create an API key** (Resend → API Keys) → this is `EMAIL_API_KEY`.
4. Pick a sender, e.g. `notifications@seroteams.com` → `EMAIL_FROM`.
5. Put both in local `.env`; add `EMAIL_API_KEY` in the Render dashboard (Environment) for live.

## Test scenarios — for the product owner
Walk through these yourself. Phase 2 waits for your green light.
1. **The alert arrives** — register a throwaway account (locally or on the live site). You should get an email titled like "New Sero signup: <name>" showing the person's name + email. ❌ Not OK if no email arrives within a minute (check the Render/console logs for a `[email-client]` warning).
2. **Signup never breaks on email** — with `EMAIL_API_KEY` intentionally blank, register again. The account should still be created and you should land in the app as normal. ❌ Not OK if registration errors or hangs.
3. **Only you get it** — confirm the email went to the address in `SUPERADMIN_EMAILS` (you), and not to the person who signed up.

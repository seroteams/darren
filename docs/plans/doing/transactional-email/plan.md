# Transactional Email

**Goal:** Sero can send email — starting with an admin alert every time someone registers, and real invite emails to invited members.
**Driver:** Carl
**Created:** 2026-07-11

## Done means
- Carl gets an email the moment anyone signs up (no more checking the DB).
- An invited member receives the join link by email — the manager stops copy-pasting it.
- A written catalogue of every email the product might send, split into ship-now vs park-until-validation.

## Resolved before we start
- **Provider:** Resend (native `fetch`, no SDK, free tier 3,000/mo). Carl signs up + verifies `seroteams.com`; steps in [phase-1.md](phase-1.md).
- **Send pattern:** mirror `backend/engine/ai-client.ts` (fetch + AbortController timeout + retry). New helper `backend/engine/email-client.ts`, fire-and-forget so email failure never breaks a request.
- **Admin recipient:** reuse the existing `SUPERADMIN_EMAILS` env var (= Carl). No new config.
- **Hook point (Phase 1):** `backend/api/services/auth/auth.controller.ts` `register()` — fire after the account is created, before the response. Keeps `auth.service.ts` pure.
- **No AI cost:** none of this touches OpenAI/Gemini. Baseline + proof use free `npm test` / `npm run typecheck` + one real Resend send (Resend's own free quota).

## Email catalogue
**Ship-now (plumbing — responds to a human action, doesn't manufacture return visits):**
1. New-signup alert → admin *(Phase 1)*
2. Invite email (join link) → invitee *(Phase 2)*
3. New-member-joined alert → admin *(Phase 3)*
4. Password reset → user *(later, only when a reset flow exists)*
5. Admin error/health alert → admin *(later)*

**PARKED until validation passes (engagement — pulls users back in, contaminates the unprompted-return metric):**
welcome/onboarding drip · "1:1 coming up" reminders · "you haven't run one in a while" nudges · weekly/monthly digest · "your run is ready" · marketing/product-update blasts.

> Rule: if the email's job is to *pull a user back in*, it's parked. If it *responds to something a human just did*, it can ship.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Admin "someone registered" alert | Email helper + admin gets a signup email | ✅ |
| 2 | Real invite email | Invited member receives the join link by email | ✅ |
| 3 | Admin "new member joined" alert | Admin gets an email when an invite is accepted | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phases 1 ✅ (`d8c44a66`) + 2 ✅ green-lit 2026-07-11 (Carl "a") + committed. **Phase 3 (admin "new member joined" alert) 🔨 next / building.** Offline proof through P2: 122/122 + typecheck clean; live delivery on Carl's confirmation.

## Parked
- Password-reset email — no reset flow exists yet; revisit when it does.
- Admin error/health alerts.
- All section-B engagement emails — only after the validation metric is read.
- DB-backed outbox / guaranteed delivery — not needed for low-stakes signal emails at this stage.

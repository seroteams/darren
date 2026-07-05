# Guest run — try Sero with no account, save at the end

**Goal:** A visitor with no account clicks "Try it — no account needed" on the login screen, runs a full 1:1 prep end to end, and after the briefing can save it by creating an account (or logging in) — the run becomes theirs. Carl sees every unclaimed guest run on a superadmin "Guest runs" screen.
**Driver:** Carl
**Created:** 2026-07-05

## Done means
- A logged-out visitor can start and finish a whole run from the login screen, no account anywhere.
- After the briefing they see "Want to keep this?" — register or log in, and the run lands in their Past 1:1s.
- A stranger can't burn the OpenAI budget: at most `GUEST_RUNS_PER_DAY` guest starts per day (default 10), on top of the existing per-IP limit.
- Carl has a superadmin **Guest runs** screen listing every ownerless finished run, with read-only briefings.

## Decisions (made 2026-07-05, don't re-litigate)
- **Audience now:** invited demos only — Carl shares the link. Not a public try-it page yet.
- **Guest runs stay ownerless** (`orgId:null, userId:null`) — NOT filed under Carl's org. The data wall stays clean; claiming stamps ownership later.
- **Unclaimed runs are kept forever** (alpha feedback gold). No expiry.
- **Claim security:** possession of the session id (128-bit random suffix, already the anonymous credential) is enough for the alpha. No extra token.
- **Board reversal:** SERO_BOARD's "anonymous-start: close before widening" is consciously reversed for invited guest demos; compensating controls = daily cap + IP limit + claim-only-ownerless. Reversal note lands in Phase 1.
- Full plan detail (verified file/function references): `C:\Users\User\.claude\plans\id-like-to-talk-toasty-coral.md` (session plan; the phase files below carry everything needed).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Backend: claim + daily cap | `POST /api/v1/sessions/:id/claim` + `GUEST_RUNS_PER_DAY` file-backed cap + board reversal note | ✅ |
| 2 | Guest lane frontend | "Try it — no account needed" on login → intake; logged-out boot/router lane; mid-run reload works | 🔨 |
| 3 | Save prompt + claim wiring | Briefing save card for guests → register/login → auto-claim → run in Past 1:1s | ⬜ |
| 4 | Superadmin "Guest runs" screen | List of ownerless finished runs + read-only briefing view, superadmin-only | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ green-lit 2026-07-05 ("A") · Phase 2 🔨 (guest lane frontend) building.**
Phase 1 record: baseline before touching: `npm test` 72/72 · typecheck clean.
Built test-first (5 cap tests + 4 claim tests, red→green); after: **73/73 · typecheck clean**. Live-proven at $0 on a
scratch API (:3011, garbage AI key, no DB): guest start 201 → second 429 with the exact plain message → restart keeps
the refusal (no fresh budget) → anonymous claim 401 → logged-in start uncapped → claim 200 + `session-state.json` on
disk really carries the new owner (destination checked) → re-claim idempotent. Prewarm failed honestly on the garbage
key (logged, $0). Scratch sessions + counter file deleted after.
⚠️ Commit note: a parallel session's commit `a241d13c` swept the claim service/controller/test edits in with its own
work (co-mingled tree, same hazard as before) — the remaining Phase-1 files are committed separately, honestly labelled
"built — awaiting walk". Not ✅ until Carl walks it.
Cost note: the only paid moment in the whole plan is ONE full guest walk in Phase 3 (~$0.35–0.60), and it waits for an explicit go.

## Parked
- Public try-it page hardening (CAPTCHA / access code / abuse monitoring) — when hosting lands and the door opens to strangers.
- Email verification for guest-created accounts.
- Expiry/cleanup of unclaimed guest runs.
- Guest feedback (feedback endpoint stays login-only).
- Copy tweak on the Guest runs screen if old pre-auth/QA ownerless runs clutter the list.

# Sero code audit — the agency engagement, Phase 1

**Date:** 2026-07-18 · **Scope:** whole codebase — security, backend + AI engine, database + hosting, both front-end apps · **Method:** four independent audit passes with evidence required for every finding; free checks only (no paid runs). Baseline before auditing: all 156 tests pass, typecheck clean.

---

## The verdict, in one box

> **Sero is in good shape — genuinely.** Passwords, sessions, company-to-company walls, and the AI cost controls are built the way a careful professional team would build them, and the audit confirmed it with evidence rather than vibes. **No emergency was found.** What the audit did find is a short list of gaps that are cheap to close now and expensive to discover later.
>
> **The top 3 things to fix:**
> 1. **If the live server ever loses sight of its database, it carries on silently** — saving customer data to a scratch disk that gets wiped on the next restart. One line of code turns that into a loud refusal to start.
> 2. **There are no backups.** No copy of the database, no written way to recover from an accident. A small script and a one-page how-to closes it.
> 3. **Anyone can guess passwords forever on the login screen.** Every other sensitive door already has a limiter — login doesn't. Reusing the existing pattern closes it.

**Per-area verdicts:**

| Area | Verdict | In a sentence |
|---|---|---|
| Security & logins | 🟢 Strong, 3 gaps | Passwords, reset links, invites, and company walls all done properly; login guessing, "log out my other devices", and how session keys are stored need tightening. |
| Backend & AI engine | 🟢 Strong, 4 gaps | Errors are honest, spend has a ceiling and a circuit breaker; but one typed answer can be lost on a restart, one hidden text-rewrite breaks our own honesty rule, and the $5 cap can miscount when two managers run at once. |
| Database & hosting | 🟢 Healthy, 2 real gaps | Schema and migrations are disciplined; the no-database silent fallback and the missing backups are the two that matter. |
| Both apps (admin + customer) | 🟢 Safe, 1 debt | No way found to sneak scripts into the screens (checked hard — the AI's own text is always defanged); the admin app's core screens are the untested/untyped debt we already knew about. |

---

## What's already solid (checked, not assumed)

- **Passwords & recovery** — stored scrambled (bcrypt), never logged or returned; reset links are single-use, expire in an hour, and reveal nothing about whether an email exists. Invite links follow the same discipline.
- **Company walls** — every read and write of sessions, runs, team and tracker data goes through an owner check; a manager from company A asking for company B's data gets the same "not found" as asking for gibberish. The cross-company leak fixed earlier (H-1) stayed fixed, and the superadmin door is a server-checked allowlist with an audit trail.
- **The AI can't run up a surprise bill** — each run has a $5 hard ceiling, calls time out at 30s, failures don't get re-billed, at most 4 calls run at once, and 5 failures in a row trip a 30-second breaker. Guest usage has a daily cap that survives restarts.
- **Model text is defanged before display** — every place the AI's words (or a user's words) are shown on screen goes through one central escaper; a sweep plus spot-checks of the riskiest screens found zero holes. The strict browser policy (no outside scripts) backstops it.
- **The database layer is disciplined** — every tenant table walled by org id with proper indexes, 19 migrations with no drift, nothing destructive, timeouts on every connection, and the local-machine-vs-live-database guard works as designed.
- **Failure honesty holds** — when the AI planner fails mid-meeting, the manager sees "the model hiccuped" and pays nothing, instead of a fake success. Emails that fail to send can never break a signup.

---

## Findings — ranked fix-list

Ordered by importance. Each is a yes/no for Phase 2 — tick the ones to fix.

### Fix first

**F1 · Live server survives losing its database — by silently using a scratch disk** — 🔴 High
If the live database address is ever missing (a cleared dashboard field is all it takes), the server boots happily and writes everything to disk that Render wipes on the next deploy. Every customer note since would be gone, and nothing would have looked wrong.
*Evidence:* `backend/db/env-guard.ts:69` skips its own check without a DB; `render.yaml:44` leaves the value dashboard-managed; boot only warns about the OpenAI key (`server.ts:111`). *Fix:* refuse to start live without a database — ~1 line.

**F2 · No backups, no recovery plan** — 🔴 High
Nothing anywhere makes a copy of the database or explains how to restore one. An accidental delete or a bad change has no undo.
*Evidence:* grep for backup/pg_dump/restore across docs, scripts and backend: nothing operational. *Fix:* small dump script + one-page restore doc; confirm what history Neon's tier keeps.

**F3 · Login allows unlimited password guessing** — 🟠 Medium (the known one — confirmed)
Password reset, session-creation and error reporting all have per-IP limits; login and register have none.
*Evidence:* `server.ts:181-182` bare routes vs the limited ones at `:190-205`. *Fix:* reuse the existing limiter pattern on both.

### Worth fixing soon

**F4 · Changing your password doesn't log out whoever stole your old session** — 🟠 Medium
The standard "I think I'm compromised" move — change password — leaves any stolen login cookie valid for up to 7 days.
*Evidence:* `auth.service.ts:108-123, 171-184` write the new hash but delete no sessions. *Fix:* drop the user's other sessions on change/reset.

**F5 · A manager's typed answer can vanish if the server restarts at the wrong moment** — 🟠 Medium
The answer is held in memory and only saved once the AI finishes its turn; a deploy or restart in that window loses it (and our own project notes say mid-turn restarts really happen).
*Evidence:* `sessions.service.ts:516-548` never persists; its sibling writes (notes, wrap-up) all do. *Fix:* ~1 line — save on receipt.

**F6 · The engine quietly rewrites the model's words — against our own honesty rule** — 🟠 Medium
One guard softens phrases like "defining signal" → "notable pattern" by silent find-and-replace, exactly what the no-silent-masking rule forbids — while the guard 70 lines below it does the same job the honest way (flag + log).
*Evidence:* `backend/engine/reviewer.ts:405-414` vs the honest pattern at `:486-499`. *Fix:* replace the rewrite with a logged flag; move softening into the prompt.

**F7 · The $5-per-run cap can miscount when two managers run at once** — 🟠 Medium
The spend tracker is one shared slot; two simultaneous runs can attribute one run's cost to the other — or to nobody, so a run's ceiling isn't enforced.
*Evidence:* `cost.ts:140-155` global; set/await/restore at `stream-helper.ts:158-185`, `session-streams.ts:344-383`. *Fix:* thread the tracker properly (AsyncLocalStorage or pass-through).

**F8 · Database-save failures for a live meeting are logged nowhere anyone looks** — 🟠 Medium
If mirroring a running session to the database keeps failing, the app carries on; the meeting exists only in memory and dies with the next restart. The failure is a console warning nobody sees.
*Evidence:* `db/sessions-store.ts:96-99, 137-140` warn-and-swallow. *Fix:* count failures, write to the error log the admin console reads; bounded retry.

### Tighten when convenient

**F9 · Session keys stored unscrambled in the database** — 🟡 Low-medium — reset and invite links are hashed at rest; the 7-day login key isn't, so a DB leak yields ready-to-use logins. *Evidence:* `auth.controller.ts:65-68`, `auth.repo.ts:125-158`. *Fix:* hash like the others.
**F10 · Login/register/logout skip the same-site check other doors have** — 🟡 Low — enables a "log you into my account" trick. *Evidence:* `server.ts:181-183` vs `origin.ts`. *Fix:* add the check.
**F11 · Rate limiters trust a spoofable header** — 🟡 Low — a caller choosing their own forwarded-IP resets their own limit. *Evidence:* `server.ts:72-76` first-hop. *Fix:* take the platform-appended hop.
**F12 · Pre-stream errors on live-meeting routes can leak raw internal messages** — 🟡 Low — the 5 SSE routes bypass the v1 error mask. *Evidence:* `router.ts:94-100`, `server.ts:619-637`. *Fix:* mask ≥500 in `sendError`.
**F13 · Expired login/reset rows pile up forever** — 🟡 Low — enforced at read, never deleted (compounds F9). *Fix:* periodic delete.
**F14 · Invite-link lookups scan the whole table** — 🟡 Low — `invitations.token_hash` has no (unique) index unlike its siblings. *Evidence:* `invites.repo.ts:90`, `schema.ts:294`. *Fix:* one migration.
**F15 · Two text sizes below the 14px floor** — 🟡 Low — Monthly Check-in record: 11px badge, 13px label. *Evidence:* `frontend/src/stages/guided/guided.css:97, 385`. *Fix:* raise to 14px.
**F16 · Browser alert() boxes for Team/Members errors** — 🟡 Low — jarring and some discard the real message. *Evidence:* `frontend/src/stages/team.ts:149-236`, `members.ts`. *Fix:* reuse the inline error card.
**F17 · Health check can't see a dead database** — 🟡 Low — a DB-dead instance still reports healthy. *Fix:* add an unlinked deep-check route for the release watch.

### On the record, not for Phase 2 (already-known roadmap debt)

- **Admin app's core screens untyped + untested** (briefing, questioning, intake, boot logic — the manager's daily path) → that IS Phase 003 of the main roadmap; the audit just confirms which files to convert first.
- **Three app-shell files hand-forked between the two apps** (main/router/nav — logout + recovery logic duplicated) → fold into Phase 003's conversion as a dedup step.
- **Single-instance assumptions everywhere** (in-memory sessions, limiters, job slots) → fine for today's one Render instance; revisit before ever scaling out. Same for auto-migrate-on-boot: keep migrations additive as policy.
- **Personal-data-security Phase 3 (log purge)** → still deploy-pending on its own track; audit found live-deploy disk echo already off, consistent with that plan.

---

## Scope honesty

Sampled, not exhaustive: of 312 dynamic-HTML sites the riskiest cross-user ones were verified individually, the rest swept by pattern; guided-sessions internals checked by pattern-consistency; no live server, database, or paid API was touched. Confidence ratings sit with each finding above.

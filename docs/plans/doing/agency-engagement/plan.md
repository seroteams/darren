# Agency engagement — audit, then harden

**Goal:** Sero gets what an outside agency would sell us — a full independent-style code audit, then the fixes it confirms — without paying anyone.
**Driver:** Carl (scoped 2026-07-18: audit + hardening; payments REMOVED entirely on Carl's word, same day)
**Created:** 2026-07-18
**Mockup:** none — no visual surface (audit report + backend hardening + a written plan)

## Done means
- A readable audit report exists with a verdict per area (security, backend, database, frontend) and evidence for every finding — no vague hand-waving.
- The confirmed fixes are live in the code and Carl has walked the proof (starting with: repeated wrong-password guesses get slowed down).

## Resolved before we start
- Survey already done (2026-07-18, this session): no billing code anywhere; auth solid but no login-attempt throttle and no 2FA; DB healthy (Postgres + Drizzle, env guard); admin app under-typed vs backend; security headers/origin fence/reset rate-limits already shipped by the personal-data-security track.
- Known open sibling track: personal-data-security Phase 3 (log purge) is deploy-pending — the audit should note it, not redo it.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The audit | Full code audit report (free, in-house, security-review discipline) with per-area verdicts + evidence | 🔨 |
| 2 | The hardening | Fix what the audit confirms — Carl said "do it all"; 16/17 landed, F16 half | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 2 built 2026-07-18 ("do it all"): 16 of 17 audit findings fixed in full, F16 half (message pass-through landed; the alert→toast visual swap parked for a screen-verified design pass). 156/156 tests (+3 new) + typecheck clean + live boot smoke (server starts, migration 0019 applied, /health/deep returns db:up). Awaiting Carl's walk of the phase-2 scenarios. Phase 1 audit report at docs/reports/2026-07-18-agency-audit.md. Board: https://claude.ai/code/artifact/1ee2e4ed-30d4-4928-b84f-6b565e727f07

## Parked
- Payments (Stripe) — REMOVED from this engagement entirely on Carl's word (2026-07-18). Not planned, not built. Revisit only if he raises it.
- 2FA — audit will note it; not in the hardening phase unless the audit raises its urgency.
- Admin console TS conversion + UI tests — real, but that's Phase 003 of the main roadmap, not this engagement.
- Enterprise-style monitoring/uptime work — revisit if the paid pilot lands.

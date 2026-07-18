# Agency engagement — audit, harden, payments-on-paper

**Goal:** Sero gets what an outside agency would sell us — a full independent-style code audit, the fixes it confirms, and a ready-to-go written plan for taking payment — without paying anyone.
**Driver:** Carl (scoped 2026-07-18: audit + hardening now; Stripe build parked until Gate 1 / his go)
**Created:** 2026-07-18
**Mockup:** none — no visual surface (audit report + backend hardening + a written plan)

## Done means
- A readable audit report exists with a verdict per area (security, backend, database, frontend) and evidence for every finding — no vague hand-waving.
- The confirmed fixes are live in the code and Carl has walked the proof (starting with: repeated wrong-password guesses get slowed down).
- A written Stripe payments plan sits ready to hand to any future session the day Gate 1 opens — no code built.

## Resolved before we start
- Survey already done (2026-07-18, this session): no billing code anywhere; auth solid but no login-attempt throttle and no 2FA; DB healthy (Postgres + Drizzle, env guard); admin app under-typed vs backend; security headers/origin fence/reset rate-limits already shipped by the personal-data-security track.
- Known open sibling track: personal-data-security Phase 3 (log purge) is deploy-pending — the audit should note it, not redo it.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The audit | Full code audit report (free, in-house, security-review discipline) with per-area verdicts + evidence | ⬜ |
| 2 | The hardening | Fix what the audit confirms — first item: login-attempt throttling | ⬜ |
| 3 | Payments on paper | Written Stripe integration plan (flow, screens list, effort, cost) — NO build | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Folder set up 2026-07-18. Waiting on Carl to read the phases and confirm before Phase 1 starts. Board: https://claude.ai/code/artifact/1ee2e4ed-30d4-4928-b84f-6b565e727f07

## Parked
- Stripe payments BUILD — parked until Gate 1 (validation pass bar) or Carl's explicit go. Phase 3 produces the plan only.
- 2FA — audit will note it; not in the hardening phase unless the audit raises its urgency.
- Admin console TS conversion + UI tests — real, but that's Phase 003 of the main roadmap, not this engagement.
- Enterprise-style monitoring/uptime work — revisit if the paid pilot lands.

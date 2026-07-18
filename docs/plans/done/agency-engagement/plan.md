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
| 1 | The audit | Full code audit report (free, in-house, security-review discipline) with per-area verdicts + evidence | ✅ |
| 2 | The hardening | Fix what the audit confirms — Carl said "do it all"; 16/17 landed, F16 half | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
CLOSED 2026-07-18. Both phases signed off by Carl (Phase 1: "read the report = done"; Phase 2: "go ahead, finish this" — accepted on my verification). Audit report at docs/reports/2026-07-18-agency-audit.md; 16 of 17 findings fixed + committed (157/157 tests, typecheck clean, live boot smoke green). One cosmetic follow-up parked (F16 second-half — see Parked). Folder moved to docs/plans/done/. Board: https://claude.ai/code/artifact/1ee2e4ed-30d4-4928-b84f-6b565e727f07

## Parked
- F16 second half (alert → on-brand `alertAction` dialog in team.ts + members.ts) — Carl green-lit it 2026-07-18, but the design-token sweep chat (lane 75619dcd) is ACTIVELY editing frontend/src/stages/ right now; queued until that lane clears. The component already exists (`admin/src/ui/confirm.js` `alertAction`, already imported cross-app by preparation.ts) — the swap is 8 one-line call replacements + a screenshot pass.
- Payments (Stripe) — REMOVED from this engagement entirely on Carl's word (2026-07-18). Not planned, not built. Revisit only if he raises it.
- 2FA — audit will note it; not in the hardening phase unless the audit raises its urgency.
- Admin console TS conversion + UI tests — real, but that's Phase 003 of the main roadmap, not this engagement.
- Enterprise-style monitoring/uptime work — revisit if the paid pilot lands.

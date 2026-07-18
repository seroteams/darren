# Phase 1 — The audit

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl's walk

## Built (2026-07-18)
Report landed at [docs/reports/2026-07-18-agency-audit.md](../../../reports/2026-07-18-agency-audit.md). Method: 4 independent audit passes (security/auth, backend+engine, database+hosting, both frontends), evidence required per finding, free checks only. Baseline: npm test 156/156, typecheck clean. Result: no emergency; 17 ranked findings (2 high — live-boot-without-DB fallback, no backups; 6 medium incl. the known login-throttle gap, a silent-masking house-rule violation in reviewer.ts, and a cost-cap race; 9 low), plus 4 on-the-record roadmap items. Zero XSS holes found in the sweep; company walls verified intact.

## Goal
A full, honest code audit of Sero — the thing the agency sells "from $30" — done in-house for free, with evidence behind every finding.

## Changes
- No product code changes. This phase only produces a report: `docs/reports/2026-07-XX-agency-audit.md`.
- Areas covered: security (login, sessions, who-can-see-what), backend (API + engine), database, both front-end apps, hosting/deploy.
- Method: the security-review skill's discipline — research before flagging, confidence-rated findings, no false alarms. Free checks only (reading code, `npm test`, `npm run typecheck`) — no paid runs.
- Each finding gets: what it is in plain words, how bad it is, the evidence (file), and the suggested fix.
- Ends with a fix-list ranked by importance — that ranked list becomes Phase 2's shopping list.

## Not in this phase
- Fixing anything (Phase 2).
- Anything payments (Phase 3).
- Re-doing the personal-data-security work — the audit notes its status, doesn't repeat it.

## Done when
- [ ] The report file exists with a verdict per area and at least the known items (login throttling, 2FA absence) either confirmed or cleared.
- [ ] Every finding names its evidence — no finding without a file behind it.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Read the summary** — open the report, read just the top verdict box. You should know in under a minute: is Sero in good shape, and what are the top 3 things to fix. ❌ Not OK if you finish it unsure what matters most.
2. **Spot-check a finding** — pick any one finding and read it. It should say what's wrong in plain words, how bad it is, and where the proof is. ❌ Not OK if any finding feels vague or evidence-free.
3. **The fix-list** — check the ranked list at the end. Each item should be something you could say "yes, fix that" to without needing a translator. ❌ Not OK if items read like engineer-to-engineer notes.

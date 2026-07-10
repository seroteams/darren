# Phase 3 — Positive validation checks

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT

## ✅ GREEN-LIT 2026-07-10 — Carl walked the QA scenarios ("A") · 4/4 tests, quiet against golden fixture, suite 114/114, $0

## Built (2026-07-10)
Landed:
- `backend/engine/golden-checks.ts` — new `runManagerBriefingGroundingChecks(briefing, ctx)` (+ export). Check 1: first name absent from all briefing prose. Check 2: **every** axis explicitly `not_read`. Undefined `read_status` (legacy fixtures) gets benefit of the doubt; fallback briefing skips check 2. Reuses `collectBriefingText()`.
- `backend/engine/golden-checks.grounding.test.ts` (new) — 4 cases: grounded passes; nameless + all-not_read fails both; empty name skips check 1; fallback skips check 2.

Offline proof: unit tests **4/4**; **quiet against the real golden fixture** (`priya_performance_quality_jun02` → 0 failures, no false alarm — the tightened check 2 was the fix); full suite **114/114**, typecheck **clean**, $0.

**Kept warn-level:** NOT wired into the live `evaluate()` blocking path — promotion to a hard gate stays Parked in plan.md.

## Goal
Add positive assertions to the briefing gate — not just banned-phrase detection — mirroring old Sero's "names the person / cites real data" scoring. Surfaces a weak briefing; never masks it.

## Changes
- [golden-checks.ts](../../../../backend/engine/golden-checks.ts): add `runManagerBriefingGroundingChecks(briefing, ctx)` returning a `failures[]` array (same shape as `runManagerBriefingBans`) — e.g. briefing references the person's first name; at least one axis read cites a real signal rather than `no_history`.
- **Conservative:** starts as a warn-level report, promoted to a hard gate only once it's quiet against existing fixtures.

## Not in this phase
- Making it a blocking gate in the live pipeline (warn-level first; promotion is Parked in plan.md).
- Any numeric 0–100 score (old Sero's rubric) — pass/fail failures[] only, matching the house pattern.

## Design note — checks APPROVED by Carl ("a", 2026-07-10)
`runManagerBriefingGroundingChecks(briefing, ctx)` → `failures[]` (mirrors `runManagerBriefingBans`). Two conservative checks:
1. **Names the person** — fails only when the person's first name (`ctx.name` split on whitespace) appears **nowhere** in the collected briefing prose. Skips when `ctx.name` is empty.
2. **Cites real data** — fails only when **every** axis is `read_status: "not_read"`. One read axis passes. Skips the fallback briefing (`generation_failed: true`).

Kept warn-level: the function + unit test land now; **not** wired into the live `evaluate()` blocking path (promotion Parked). Reuses `collectBriefingText()`. No numeric 0–100 score.

## Done when
- [ ] Exact checks agreed with Carl (listed here) before implementation.
- [ ] A grounded fixture briefing passes; a name-less / data-less one produces failures (unit test).
- [ ] Runs quiet (no failures) against existing golden fixtures — no false alarms.
- [ ] `npm test` green, `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Catches a weak briefing** — I run `npm test`; a fixture briefing with no person's name and all `no_history` axes produces the expected failures. ❌ Not OK if it passes silently.
2. **Passes a good briefing** — a grounded fixture (names the person, cites a real score) produces zero failures. ❌ Not OK if a good briefing gets flagged.
3. **No false alarms on real fixtures** — the check runs clean against the existing golden fixtures. ❌ Not OK if it lights up on briefings we already accept.

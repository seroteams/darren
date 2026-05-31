# Remaining backlog — archived execution board

**Status:** All batches complete (2026-06-01, audit v20).  
**Live tracker:** [`log-fix-audit.md`](log-fix-audit.md) (100 IDs, 0 open).  
**Workstream board:** [`PLAN.md`](../PLAN.md).

This file is **historical** — it recorded batches H–N while the May sprint landed. Do not add new work here; flip rows in `log-fix-audit.md` instead.

---

## Verify commands (still useful)

| Check | Command |
|---|---|
| Engine loop | `npm run eval` |
| Opener routing | `node scripts/test-opener-routing.js` |
| Drill cap | `node scripts/test-drill-cap.js` |
| Lexicon pipeline | `node scripts/test-lexicon.js` |
| Lexicon batch | `node scripts/batch-l-verify.js` |
| Regression fixtures | `node scripts/batch-m3-verify.js` |
| Batch replay | `node scripts/batch-m4-verify.js` |
| Toby offline replay | `node scripts/batch-m5-verify.js` |
| Manual QA checklist | `node scripts/manual-qa-verify.js` |
| Multi-type sweep | `node scripts/sweep.js` |
| Smoke | `npm run smoke` |

Sweep report (2026-05-31): [`done/sweep-report-2026-05-31.md`](done/sweep-report-2026-05-31.md).

---

## Batch completion log

| Batch | Scope | Date |
|---|---|---|
| H | Housekeeping, Carl scenario, PLAN sync | 2026-05-30 |
| I | Planner wind-down (FX-11/12) | 2026-05-30 |
| J | Briefing + questioning UI (FX-24/25/32) | 2026-05-30 |
| K | Axis cluster (FX-26/27/28) | 2026-05-30 |
| L | Lexicon pipeline (G1–G5, LF-1, FX-40) | 2026-05-30 |
| M1–M5 | Batch verify + regression fixtures | 2026-05-30 – 2026-06-01 |
| N | reviewrun spec, dig-deeper, pricing tier | 2026-06-01 |

Full batch tables preserved in git history (pre-2026-06-01 version of this file).

# Next-session kickoff prompt

Paste the block below into a fresh Claude Code session to pick up the work.
Written 2026-07-01, grounded in a code-verified audit (not just the trackers).
Regenerate this when the active phase changes.

---

```text
Fresh start on Sero. First, read STATUS.md, docs/todo/009-ready-to-share/PLAN.md, and
CLAUDE.md so you pick up the house rules before acting — Darren Method (one phase at a
time; I walk the QA and green-light before the next; you never self-certify), cost control
(NO OpenAI/paid runs — gate/smoke/eval/live replays — without my explicit yes + a rough
cost first; default to free: npm test, offline fixtures), plain language, and end each reply
with the Recap card + an "In simple terms:" line.

Where we are (verified against the actual code on 2026-07-01, not just the trackers):
- Production phases 001–007 are genuinely done.
- 008 (security) is folded into the ACTIVE plan, 009, as its Phase 1.
- 009 Phase 1's code floor is built + tested: null-org escape hatch closed, data fenced by
  org+role, AI keys server-only. npm test 52/52, typecheck clean (offline).

ACTIVE WORK — finish 009 Phase 1. Three open items, all free/offline:
  1. DB null-org audit — query the real database (needs DATABASE_URL) for any existing rows
     with a null org_id in sessions/runs, BEFORE real staff data flows. Report actual counts;
     don't infer from code. (Verify the destination, not the routing.)
  2. Anonymous session-start decision — keep the anonymous start path (never stamping real
     data) or close it? Give me 2–3 options with a recommendation.
  3. Then hand me Phase 1's QA scenarios for sign-off.
Do #1 first (read-only), report, and wait. One step at a time.

QUEUED for right after Phase 1 (don't start these yet — just know they're next):
- Clear the QA pile (009 Phase 4): several features are BUILT + live but never QA-ticked —
  member-nav P1, frontend-admin-split P1, stage-data-tabs, sent-preview, repo-tidy P1/P2,
  todo-board-rebuild P3 (backend), tracker-consolidation P1, briefing-grounding-fixes P1.
  Walk me through each to tick or cut.
- Decide see-before-sent: its Phase 1 code was lost in the monorepo reorg (marked done but
  not in the tree) — rebuild, fold into sent-preview, or cut.
- 008 human-expert security review: waived for the alpha, deferred — book before widening
  past 2–3 friendly managers.

Start by reading the trackers, then run the DB null-org audit and report back.
```

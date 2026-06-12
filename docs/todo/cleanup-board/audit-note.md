# Phase 1 audit note — git state + gate failure (2026-06-12, late evening)

## Git state: clean, all explained

The scary working tree from earlier tonight (10 modified / 286 deleted / ~388 untracked) no longer exists — the active engine-trust-gates session committed all of it during the evening:

| Commit | When | What |
|---|---|---|
| `ee018b5` | tonight | Phase 1: session-isolate the question pool |
| `bb49e7c` | 19:09 | Phase 2: honest thread-follow stems |
| `cd581a7` | 20:51 | Phase 3: grounding gate for planner questions |
| `9936c89` | 20:51 | Question pool churn + CLAUDE.md cost rule |

The churn breakdown (from `9936c89`'s message, verified against its stat): 286 exact-duplicate question yamls pruned by `npm run rebuild-question-index` (each had an identical surviving twin), new generated bank questions from this week's runs, planner runtime artifacts moved under `questions/_runtime/`, one new cached role profile, one how-it-works HTML doc, and a new **CLAUDE.md cost-control rule** (paid runs need Carl's explicit per-run go-ahead, smallest-thing-that-proves-the-point).

- `git status` now: clean except `docs/todo/cleanup-board/` (this project).
- Stashes: the 2 known old ones (`cleanup/remove-dead-ai-handoff-core`, `design-system-foundation`). Standing rule: don't pop.
- `logs/**` is gitignored with a May keep-set (`.gitignore:29-35`) — that's why tonight's 26 run folders don't dirty the tree.

## Gate failure: root cause = API credit ran out mid-evening

Timeline (2026-06-12, local time):

1. **19:01–19:08 — gate ran GREEN.** `logs/gate/2026-06-12T12-08-46-558Z/result.json` = **PASS, 8 ok / 0 regressed / 0 error**. Eight complete sessions (`logs/june/2026_Jun12_19-01…19-08`), each with full cost.json, ~$0.33–0.37 apiece (e.g. `2026_Jun12_19-08-b082c5b5/cost.json`: $0.3284, 14 calls) — **≈ $2.80 total, and it bought a passing verdict.**
2. **19:13–19:19 — gate ran again and ERRORED.** `logs/gate/2026-06-12T12-18-27-732Z/result.json` = ERROR, all 8 cases `pipeline incomplete (exit 1)`. 18 session folders were created (attempt + retry per case); **every one stops at `00b-role-profile` — a $0 cache hit — with no cost.json.** I.e. every pipeline died at its *first real OpenAI call* (01-focus-points).

**Why credit exhaustion and not a code bug:** the identical code and scenarios passed 8/8 ten minutes earlier; none of the new trust-gates code runs before stage 01; and the failure is exactly at the API-call boundary, uniformly, on 18 consecutive attempts. The green run's ~$2.80 most plausibly drained the remaining balance. The errored run itself cost ~$0.

**Correction to earlier worry:** the $2.80 was *not* wasted on a run with no verdict — it produced the PASS that validated engine-trust-gates Phases 1–3. The errored run was free.

**To confirm:** OpenAI billing dashboard. **Cheap re-check once topped up:** `node scripts/gate.js --only <case>` ≈ $0.35 (per the new CLAUDE.md cost rule — explicit go-ahead first).

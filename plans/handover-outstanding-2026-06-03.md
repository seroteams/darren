# Handover — outstanding tasks

**Version:** v1
**Created:** 2026-06-03
**Author:** light-ops
**Source of truth for IDs:** [`plans/log-fix-audit.md`](log-fix-audit.md) v10
**Sequence board:** [`plans/remaining-backlog.md`](remaining-backlog.md) (batches H–N)

## Read first

1. [`HANDOFF.md`](../HANDOFF.md) — two-machine git protocol + role split (light-ops vs heavy-ops).
2. [`PLAN.md`](../PLAN.md) — shared workstream board.
3. [`CLAUDE.md`](../CLAUDE.md) — behavioral guardrails (simplicity, surgical edits, verify-loop).

`git pull --rebase` before starting. Commit before switching machines. `plan:` prefix for plan-file commits.

## State as of this handover

Audit v10 says 21 non-DONE rows. Two of those (**FX-11, FX-12**) are actually satisfied in current code but audit rows are stale. Net real work = 19 items + 1 audit-hygiene flip.

**Audit stats line is wrong.** [`log-fix-audit.md:163-169`](log-fix-audit.md) claims OPEN 18 / total 28-ish. Real table count: 13 OPEN + 4 PARTIAL + 3 PLANNING + 1 REVIEW = 21. Recount when you touch it.

## Verified findings (don't re-investigate)

| Item | Finding | Evidence |
|---|---|---|
| FX-11 wind-down taper | LANDED at prompt level. Rule fires `remaining_budget <= 2`, not just `=1`. | [`prompts/plan-turn.md:308`](../prompts/plan-turn.md) "Wind-down taper (hard)" + line 22 |
| FX-12 late-Q invitational | LANDED. "last 2 turns... open and invitational, not stop/checklist". | [`prompts/plan-turn.md:149`](../prompts/plan-turn.md) |
| LF-1 auto-run reviewer | STILL OPEN. `/candidates` fires on lexicon-screen load, NOT auto at session end after stage-05 eval. | [`frontend/server/handlers/lexicon.js:34`](../frontend/server/handlers/lexicon.js) |

FX-11/FX-12 prompt rules are present → flip both audit rows to 🧪 REVIEW (eval-verification only, folds into FX-44 run). Do NOT re-edit the prompt for these.

---

## The 19 outstanding items

### Group 1 — Verification only (rules already shipped)
**Owner:** mixed · **Batch M**

| ID | Task | Done when |
|---|---|---|
| FX-44 🧪 | Re-run May-24 batch harness on current prompts | score vs `logs/may/2026_May24_batch/quality-report.json`; ANALYSIS.md table |
| FX-11/FX-12 | Confirm taper/invitational pattern in that same eval | wind-down friction reduced vs May25/May27 deep-runs |

Harness source: `batch-data.zip` (work-computer eval+self-edit, 26 runs, score 0.820→0.839). Predicted ranges + worst-case run_ids in `quality-report.json` → `worst_dimensions`.

### Group 2 — Planner runtime decision
**Owner:** heavy-ops (contested file — light-ops must not edit)

| ID | Task | Gate |
|---|---|---|
| FX-08 📋 | Drill-cap runtime enforcement | (A) keep prompt-only (`plan-turn.md` cap rules exist + `computeConsecutiveDrillCount` at [`src/queue-manager.js:73`](../src/queue-manager.js) is correct) vs (B) hard-strip `planner_added`+same-stage from `new_queue` when `consecutive_drill_count >= 2` |

Trigger: run 2026_May25_14-23 had 4 consecutive friction probes; model ignored the hard prompt rule. Prompt reinforcement alone may not hold.

### Group 3 — Axis cluster (ONE arc, product call required)
**Owner:** product + heavy-ops · Treat as single redesign, not 3 one-offs. See [`plans/toby-run-fix/deferred-h.md`](toby-run-fix/deferred-h.md) "axis scoring model redesign".

| ID | Issue |
|---|---|
| FX-26 🔴 | Scores react to typing not meaning ("fine" → -1) |
| FX-27 🔴 | User sees no value in ratings — gate: (A) explainer copy (B) cut axis UI (C) fix scoring only |
| FX-28 🔴 | Clarity should have dropped before a certain Q |

**Acceptance:** behavior doc + ≥1 log replay showing improved axis read; FX-27 gate decision recorded in audit.

### Group 4 — UI polish
**Owner:** light-ops (typography) / heavy-ops (layout)

| ID | Task | Files (likely) |
|---|---|---|
| FX-24 🟡 | Reminders copy-paste affordance + eval contract (label already changed; affordance+contract missing) | briefing stage, `prompts/final-evaluation.md`, eval handler |
| FX-25 🟡 | Briefing 2-col / typography | `frontend/client/src/stages/briefing.js`, `design.css` |
| FX-32 🟡 | Questioning text size bump | questioning stage + CSS |
| FX-37 🔴 | Dig-deeper button alongside next-question (deferred H1) | UI control |

**Acceptance:** visual check in dev server (`/run` skill); no regression on briefing reveal sequence.

### Group 5 — Lexicon cluster
**Owner:** heavy-ops · Plan refs: [`plans/toby-run-fix/phase-6-g-lexicon.md`](toby-run-fix/phase-6-g-lexicon.md), [`plans/lexicon-finish.md`](lexicon-finish.md)

Diagnostic first (read-only), then fix:

| ID | Task | Pointer |
|---|---|---|
| G1 🔴 | Diagnose speaker source in extraction prompt | `prompts/review-session-for-lexicon.md` |
| G2 🔴 | Diagnose parser dropping candidates | [`src/lexicon-reviewer.js:243-296`](../src/lexicon-reviewer.js) |
| G3 🔴 | Implement fix from G1/G2 findings | depends on G1/G2 |
| G4 🔴 | Soften candidate floor (no filler padding on weak runs) | `prompts/review-session-for-lexicon.md` |
| G5 🔴 | Toby **lexicon** regression fixture (≠ existing prep fixture) | `scenarios/regression/` |
| LF-1 🔴 | Auto-run reviewer after stage-05 eval (not only screen load) | trace → `lexicons/_suggested/<sessionId>.json` |
| FX-40 📋 | In-scope zero-candidate UX | gate: (A) hide stage when 0 candidates (B) loosen reviewer filter (C) fix copy. Reviewer returns clean `{suggestions:[]}` at [`src/lexicon/review-core.js:71`](../src/lexicon/review-core.js) |
| LF-5 🔴 | Scope: design/lead/growth-only vs all roles | design call; audit recommends (B) open `shouldReview` |
| LF-6 🔴 | Promote button in app | optional; out of scope unless felt need |

**Already landed (verified v10):** LF-2 candidates endpoint, LF-3 keep→YAML, LF-4 promote script.

**Acceptance:** Design-Lead+Growth session → non-empty candidates OR intentional empty w/ good UX; Keep→candidate yaml; promote script moves to canonical; G5 fixture in replay.

### Group 6 — Infra
**Owner:** work-machine

| ID | Task |
|---|---|
| FX-43 📋 | `reviewrun` skill output spec — define deliverable: summary template, sharpening questions, link to audit IDs |

---

## Suggested order

```text
audit flip FX-11/FX-12 (light-ops, 1 file)   ← do first, cheap
  → FX-44 + FX-11/12 verify (Batch M1/M2)
  → FX-08 gate (heavy-ops)         ┐ parallel
  → UI polish FX-24/25/32/37 (Group 4) ┘
  → Lexicon G1/G2 diagnose → G3/G4/G5/LF-1, then FX-40/LF-5 gates
  → Axis cluster (Group 3) after product gate
  → FX-43 infra
```

## Verification tooling

- Replay: `node scripts/replay-scenario.js toby_growth_lead --fixtures-only` (must stay green after any prompt edit).
- Opener routing: `scripts/test-opener-routing.js`.
- UI: `/run` skill → dev server visual check.
- Prompt-only fixes: grep new rule line into prompt + diff next `logs/<month>/<run>/` against the row's "Seen in" log.

## When an item lands

1. Flip row in [`log-fix-audit.md`](log-fix-audit.md), bump version, **recount stats** (they're currently stale).
2. Mark batch done in [`remaining-backlog.md`](remaining-backlog.md) completion log w/ date + commit hash.
3. Update status in [`PLAN.md`](../PLAN.md); details live in the plan files, not PLAN.md.

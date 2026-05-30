# Remaining backlog — consolidated execution plan

**Version:** v1  
**Caveman version:** full  
**Source of truth for IDs:** [`plans/log-fix-audit.md`](log-fix-audit.md) v9 (95 IDs, 64 done)  
**Created:** 2026-05-30 after FX-34/41 landed + full plan sweep

## Caveman version

Audit says 21 open, 5 partial, 4 planning, 1 review. This file groups them into batches with owners and gates so nothing gets lost. Master ID table stays in `log-fix-audit.md`; this is the **sequence board**.

## Changelog

- v1 (2026-05-30): Initial consolidation from audit v9, stale `PLAN.md` diff, `lexicon-finish.md`, Toby phase 6–7, May-24 batch notes, and local uncommitted WIP inventory.

---

## Status snapshot (audit v9)

| Status | Count |
|---|---|
| ✅ DONE | 64 |
| 🔴 OPEN | 21 |
| 🟡 PARTIAL | 5 |
| 📋 PLANNING | 4 |
| 🧪 REVIEW | 1 |

**Do not duplicate the full ID table here.** Flip rows in `log-fix-audit.md` when batches land; add a changelog line + recount stats.

---

## Decision gates (pick before coding)

| Gate | IDs | Options | Owner |
|---|---|---|---|
| Drill cap | FX-08 | (A) prompt-only keep relying on `plan-turn.md` (B) runtime strip in `queue-manager.js` when `consecutive_drill_count >= 2` | heavy-ops |
| Lexicon in-scope empty state | FX-40 | (A) hide stage when zero candidates (B) loosen reviewer filter (C) fix copy only | heavy-ops |
| Lexicon scope | LF-5 | (A) stay design/lead/growth-only (B) open `shouldReview` to all roles | heavy-ops |
| Axis ratings | FX-27 | (A) add explainer copy (B) hide/cut axis UI (C) leave, fix scoring only | product + heavy-ops |
| reviewrun output | FX-43 | Define skill deliverable: summary template, sharpening questions, link to audit IDs | work-machine |

---

## Batch H — Housekeeping (do first)

**Owner:** light-ops · **Risk:** low · **Blocks:** nothing

| # | Task | Notes |
|---|---|---|
| H1 | Refresh [`PLAN.md`](../PLAN.md) feedback backlog vs audit v9 | N1–N4, items 5/6/8 marked open there but done in audit |
| H2 | Audit hygiene pass: flip **LF-2, LF-3, LF-4** to ✅ if still accurate | Code appears landed: `GET /api/lexicon/candidates`, `POST /api/lexicon/decisions`, `scripts/promote-candidates.js` |
| H3 | Commit or discard local WIP (see § Uncommitted WIP below) | Do not mix with feature batches |
| H4 | Fix [`scenarios/003-carl-mid-design-growth.json`](../scenarios/003-carl-mid-design-growth.json) schema | Wrong shape: `meetingType`/`notes`, missing `answers[]` — smoke-test incompatible |

**Acceptance:** PLAN.md matches audit; audit LF rows accurate; WIP either committed on named branch or reverted; Carl scenario parses + resolves `meeting_type`.

---

## Batch I — Planner wind-down cluster

**Owner:** heavy-ops · **IDs:** FX-11, FX-12 (related) · **Files:** `prompts/plan-turn.md`

| ID | Issue | Done when |
|---|---|---|
| FX-11 🟡 | Wind-down taper last **2** turns, not only budget=1 | Rule visible in prompt; May25/May27 deep-run pattern reduced in next eval |
| FX-12 🔴 | Late questions sound like stop, not open | Overlaps FX-11; closers stay invitational |

**Optional same batch:** FX-08 if gate → runtime drill cap (`src/queue-manager.js`).

**Acceptance:** `node scripts/replay-scenario.js toby_growth_lead --fixtures-only` green; manual read of wind-down rules in prompt.

---

## Batch J — UI polish (feedback #10, #11)

**Owner:** light-ops (typography) / heavy-ops (layout) · **IDs:** FX-24, FX-25, FX-32

| ID | Issue | Files (likely) |
|---|---|---|
| FX-24 🟡 | Reminders copy-paste affordance + eval contract | briefing stage, `prompts/final-evaluation.md`, eval handler |
| FX-25 🟡 | Briefing 2-col / typography | `frontend/client/src/stages/briefing.js`, `design.css` |
| FX-32 🟡 | Questioning text size | questioning stage + CSS |

**Acceptance:** visual check in dev server; no regression on briefing reveal sequence.

---

## Batch K — Axis cluster (product call required)

**Owner:** heavy-ops · **IDs:** FX-26, FX-27, FX-28

| ID | Issue |
|---|---|
| FX-26 🔴 | Scores react to typing not meaning ("fine" → -1) |
| FX-27 🔴 | User doesn't see value in ratings |
| FX-28 🔴 | Clarity should have dropped before certain Q |

**Note:** Deferred in [`plans/toby-run-fix/deferred-h.md`](toby-run-fix/deferred-h.md) as "axis scoring model redesign" — treat as one arc, not three one-offs.

**Acceptance:** defined behavior doc + at least one log replay showing improved axis read; FX-27 gate decision recorded in audit.

---

## Batch L — Lexicon pipeline (Phase 6 + lexicon-finish)

**Owner:** heavy-ops · **Plan refs:** [`plans/toby-run-fix/phase-6-g-lexicon.md`](toby-run-fix/phase-6-g-lexicon.md), [`plans/lexicon-finish.md`](lexicon-finish.md)

### Diagnostic first (read-only)

| ID | Task |
|---|---|
| G1 🔴 | Diagnose speaker source in `prompts/review-session-for-lexicon.md` |
| G2 🔴 | Diagnose parser drops in `src/lexicon-reviewer.js` |

### Then fix

| ID | Task |
|---|---|
| G3 🔴 | Implement fix from G1/G2 findings |
| G4 🔴 | Soften candidate floor — no filler padding |
| G5 🔴 | Toby **lexicon** regression fixture (≠ existing prep fixture) |
| LF-1 🔴 | Auto-run reviewer after stage 05 eval (not only on lexicon screen load) |
| FX-40 📋 | In-scope zero-candidate UX (after gate) |

**Already landed (verify in H2):** LF-2 candidates endpoint, LF-3 keep → YAML, LF-4 promote script.

**Out of scope for L unless felt need:** LF-6 promote button in app.

**Acceptance:** Design Lead + Growth session → non-empty candidates OR intentional empty with good UX; Keep → candidate yaml; promote script moves to canonical; G5 fixture in replay.

---

## Batch M — Verification & regression (Phase 7 + FX-44)

**Owner:** mixed · **Plan ref:** [`plans/toby-run-fix/phase-7-replay.md`](toby-run-fix/phase-7-replay.md)

| # | Task | IDs |
|---|---|---|
| M1 | Re-run May-24 batch harness on current prompts | FX-44 🧪 REVIEW |
| M2 | Compare to `logs/may/2026_May24_batch/quality-report.json` predicted ranges | ANALYSIS.md table |
| M3 | Pin worst-case runs as regression fixtures | Priya `547a1f92-945`, Lin `6ae9ead8-32f`, Ahmed `835c2df0-e23` per ANALYSIS.md |
| M4 | Wire `scenarios/batch/` into replay harness (optional consumer) | future; personas landed FX-41 ✅ |
| M5 | Full live Toby replay (not just `--fixtures-only`) | FX-17 follow-through |

**Acceptance:** FX-44 → ✅ or explicit fail notes; at least one new regression JSON under `scenarios/regression/`; batch score deltas documented.

---

## Batch N — Infra & deferred product

**Owner:** work-machine / deferred · **Do after L or explicit ask**

| ID | Task |
|---|---|
| FX-43 📋 | `reviewrun` skill output spec |
| FX-37 🔴 | Dig-deeper button (deferred H1) |
| Pricing WIP | Land [`plans/update-openai-pricing-2026-05-27.md`](update-openai-pricing-2026-05-27.md) if models.json drift intentional |

---

## Suggested execution order

```text
H (housekeeping)
  → I (planner wind-down)     ─┐
  → J (UI polish)              ├─ can parallel if different machines
  → M1–M2 (FX-44 verify)       ─┘
  → L (lexicon) after G1/G2 diagnosis
  → K (axes) after product gate
  → M3–M5 (regression fixtures + live replay)
  → N (deferred / infra)
```

---

## Uncommitted WIP inventory (2026-05-30)

Not in audit. Resolve in batch H3 before starting feature work on `main`.

| Area | Files | Plan ref |
|---|---|---|
| Model tier switch | `config/models.json`, `data/openai-models.json` | `update-openai-pricing-2026-05-27.md` |
| Planner skip shortcut | `src/queue-manager.js` | May25 run finding (related FX-08) |
| New question YAMLs | `questions/q_*.yaml`, `questions/_index.json` | unknown — confirm intent |
| May 27 logs | `logs/may/2026_May27_*` | runtime artifacts — usually don't commit |
| Server session edits | `frontend/server/handlers/plan.js`, `session-persistence.js`, `sessions.js` | inspect before commit |

---

## How to use this file

1. Pick a batch letter; work only that batch's table in one pass.
2. When batch lands: update rows in `log-fix-audit.md`, bump audit version, recount stats.
3. Mark batch done here with date + commit hash in changelog below.
4. [`PLAN.md`](../PLAN.md) workstream "Remaining backlog" points here — edit status there, details here.

## Batch completion log

| Batch | Status | Date | Commit |
|---|---|---|---|
| H | done | 2026-05-30 | (pending commit) |
| I | pending | — | — |
| J | pending | — | — |
| K | pending | — | — |
| L | pending | — | — |
| M | pending | — | — |
| N | pending | — | — |

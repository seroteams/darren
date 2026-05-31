# Remaining backlog — consolidated execution plan

**Version:** v1  
**Caveman version:** full  
**Source of truth for IDs:** [`plans/log-fix-audit.md`](log-fix-audit.md) v13 (95 IDs, 73 done)  
**Created:** 2026-05-30 after FX-34/41 landed + full plan sweep

## Caveman version

Audit says 21 open, 5 partial, 4 planning, 1 review. This file groups them into batches with owners and gates so nothing gets lost. Master ID table stays in `log-fix-audit.md`; this is the **sequence board**.

## Changelog

- v1 (2026-05-30): Initial consolidation from audit v9, stale `PLAN.md` diff, `lexicon-finish.md`, Toby phase 6–7, May-24 batch notes, and local uncommitted WIP inventory.
- v2 (2026-05-30): Batch I landed — FX-11/FX-12 wind-down + closer craft in `prompts/plan-turn.md`. Audit v11 stats.
- v3 (2026-05-30): Batch J landed — FX-24/25/32 briefing + questioning UI polish. Audit v12 stats.
- v6 (2026-06-01): Everything-not-done plan — git commit, pricing verified, M5 + manual QA scripts, FX-54 thread mirror, engine loop (`npm run eval`).

---

## Status snapshot (audit v19)

| Status | Count |
|---|---|
| ✅ DONE | 92 |
| 🔴 OPEN | 0 |
| 🟡 PARTIAL | 0 |
| 📋 PLANNING | 0 |
| 🧪 REVIEW | 0 |

**Do not duplicate the full ID table here.** Flip rows in `log-fix-audit.md` when batches land; add a changelog line + recount stats.

---

## Decision gates (pick before coding)

| Gate | IDs | Options | Owner |
|---|---|---|---|
| Drill cap | FX-08 | ✅ runtime strip in `queue-manager.js` | heavy-ops |
| Lexicon in-scope empty state | FX-40 | (A) hide stage when zero candidates (B) loosen reviewer filter (C) fix copy only | heavy-ops |
| Lexicon scope | LF-5 | ✅ path B — all role families | heavy-ops |
| Axis ratings | FX-27 | (A) add explainer copy (B) hide/cut axis UI (C) leave, fix scoring only | product + heavy-ops |
| reviewrun output | FX-43 | Define skill deliverable: summary template, sharpening questions, link to audit IDs | work-machine | ✅ `plans/reviewrun-output-spec.md` |

---

## Batch H — Housekeeping (do first)

**Owner:** light-ops · **Risk:** low · **Blocks:** nothing

| # | Task | Notes |
|---|---|---|
| H1 | Refresh [`PLAN.md`](../PLAN.md) feedback backlog vs audit v9 | N1–N4, items 5/6/8 marked open there but done in audit |
| H2 | Audit hygiene pass: flip **LF-2, LF-3, LF-4** to ✅ if still accurate | Code appears landed: `GET /api/lexicon/candidates`, `POST /api/lexicon/decisions`, `scripts/promote-candidates.js` |
| H3 | Commit or discard local WIP | ✅ 2026-06-01 — session work committed |
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

## Batch K — Axis cluster (product call required) ✅ DONE 2026-05-30

**Owner:** heavy-ops · **IDs:** FX-26, FX-27, FX-28

**FX-27 gate:** path A — explainer copy (not hide/cut UI).

| ID | Fix |
|---|---|
| FX-26 | Shallow gate zeros **all** deltas; filler words ("fine", "ok"); prompt shallow-vs-neutral split |
| FX-27 | Explainer under axis bars (questioning + briefing); tooltip copy |
| FX-28 | Misalignment → clarity `-1`; signature expand; coverage inject clarity at turn 4+ when untouched |

**Verify:** `node scripts/batch-k-verify.js` (includes May27 turn-5 proxy).

---

## Batch L — Lexicon pipeline (Phase 6 + lexicon-finish) ✅ DONE 2026-05-30

**Owner:** heavy-ops · **Plan refs:** [`plans/toby-run-fix/phase-6-g-lexicon.md`](toby-run-fix/phase-6-g-lexicon.md), [`plans/lexicon-finish.md`](lexicon-finish.md)

**Diagnosis:** Zero candidates were mostly scope gating (`shouldReview` required Lead seniority — Toby is Expert) plus bi-weekly sessions correctly out-of-scope. No parser drop-off.

| ID | Task | Status |
|---|---|---|
| G1 | Speaker source in prompt | ✅ normalized transcript + `<transcript_reading>` |
| G2 | Parser drops | ✅ closed — gate was the issue |
| G3 | Fix from diagnosis | ✅ design+growth+lead\|expert; expert→lead file mapping |
| G4 | Soften candidate floor | ✅ Quality floor block in prompt |
| G5 | Toby lexicon fixture | ✅ `toby_lexicon_growth.json` + `scripts/batch-l-verify.js` |
| LF-1 | Auto-run after eval | ✅ `kickLexiconReview` in `evaluation.js` |
| FX-40 | Empty-state UX | ✅ path C — clearer copy + `skipped` reason |

**Verify:** `node scripts/batch-l-verify.js` (offline); `node scripts/batch-l-verify.js --live` (6 suggestions on Toby May24 log).

**LF-5:** ✅ path B — all role families on growth + lead/expert.

---

## Batch M — Verification & regression (Phase 7 + FX-44)

**Owner:** mixed · **Plan ref:** [`plans/toby-run-fix/phase-7-replay.md`](toby-run-fix/phase-7-replay.md)

| # | Task | Status |
|---|---|---|
| M1 | Re-run May-24 batch harness on current prompts | ✅ FX-44 |
| M2 | Compare to quality-report predicted ranges | ✅ 2026-05-30 (live sweep 10/10) |
| M3 | Pin worst-case runs as regression fixtures | ✅ 2026-05-30 |
| M4 | Wire `scenarios/batch/` into replay harness | ✅ 2026-06-01 |
| M5 | Full live Toby replay | ✅ 2026-06-01 offline (`batch-m5-verify.js`; `--live` when API key set) |

**M3 fixtures:** `priya_biweekly_qspec` (547a1f92-945), `lin_biweekly_thread` (6ae9ead8-32f), `ahmed_growth_delta` (835c2df0-e23)

**Verify:** `node scripts/batch-m3-verify.js` · regenerate: `node scripts/generate-m3-regression.js`

**M2 report:** `logs/may/2026_May24_batch/m2-comparison-report.json` — live sweep 10/10 personas (~12 min). Aggregate: qspec 0.951, thread 0.473, delta 0.988, overall 0.804. All three target dims beat May-24 baseline; thread follow still below predicted 0.55–0.75 band; overall below 0.829 baseline. Verify: `node scripts/batch-m2-verify.js` or `--live`.

---

## Batch N — Infra & deferred product

**Owner:** work-machine / deferred · **Do after L or explicit ask**

| ID | Task |
|---|---|
| FX-43 📋 | `reviewrun` skill output spec | ✅ `plans/reviewrun-output-spec.md` |
| FX-37 🔴 | Dig-deeper button | ✅ Go deeper + Shift+Enter in questioning |
| Pricing WIP | Land [`plans/update-openai-pricing-2026-05-27.md`](update-openai-pricing-2026-05-27.md) | ✅ verified in tree (`config/models.json` tiered gpt-5.4) |

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
| H | done | 2026-05-30 | 3ff04b2 |
| I | done | 2026-05-30 | — |
| J | done | 2026-05-30 | — |
| M1 | done | 2026-05-30 | — |
| L | done | 2026-05-30 | — |
| K | done | 2026-05-30 | — |
| M3 | done | 2026-05-30 | — |
| M2 | done (live) | 2026-05-30 | — |
| M | done | 2026-06-01 | — |
| N | done | 2026-06-01 | — |

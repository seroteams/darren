# Log fix audit — every issue, every status

**Version:** v2
**Caveman version:** full
**Plan location note:** harness wrote here at `~/.claude/plans/`; per memory rule should be moved to `darren/plans/` after exit.

## Changelog
- v1: initial table. Pulled from 13 May `notes.md` + batch `2026_May24_batch/` + feedback memory + `PLAN.md` + `plans/cool-okay-so-peppy-thimble.md` + `plans/lexicon-finish.md`. (+220 lines)
- v2 (2026-05-30): audit verification pass — flipped 15 items from 🔴 OPEN to ✅ DONE after grep + Read confirmation. Items confirmed done: A1 (no `.replace("{{` left), B2/B3 (axes.js seed+tooltip), D1–D5 (queue-manager compute fns + plan-turn rules), E1/E2 (openers reshuffled), FX-15 (CALIBRATION line 190), FX-16 (persona grounding line 125), FX-17 (replay-scenario.js + scenarios/regression/toby_growth_lead.json), C7 (same fixture). Stats recounted. (+18/−15 lines)
- v3 (2026-05-30): cheap-wins batch. FX-31 + FX-33 confirmed already done in current code. FX-09/FX-10/FX-13/FX-14 landed as additions to `prompts/plan-turn.md` — two question_craft bullets ("Length cap (hard)", "Don't echo the stem") and two new planning_rules ("Honor open commitments" #11, "Context-aware urgency" #12). Replay fixtures still green. Stats: DONE 30→36, OPEN 55→49. (+8/−6 lines)
- v4 (2026-05-30): prep-batch verification — opened cluster A (C1-C5, FX-19, FX-20, FX-21, FX-22) and confirmed ALL already implemented in `prompts/preparation.md` (`<opening_question_rules>`, `<listen_for_rules>`, `<good_outcome_rules>`, `<suggested_action_rules>`, `<good_outcome_rules>` scope cap) and `prompts/generate-focus-points.md` (Shape rule + Banned phrases + Voice check). FX-21 marked OBSOLETE — `aboutYou` field no longer in output_contract. Zero code/prompt edits needed. Stats: DONE 36→45 (+9), OPEN 49→40. (+9/−9 lines)
- v5 (2026-05-30): cluster-B + F-series + B1 verification. Cluster B (C6, A2, A3) all ALREADY DONE in `src/preparation.js` (validateBrief regex tables + retry) and `src/ai-client.js` (`assertNoUnresolvedPlaceholders` at callAI + `findUnresolvedPlaceholderFields` in parseAIJson). B1 already done — `bank.js:21-24` auto-advances on `ready`. FX-30 covered by A2. F-series sweep: F1/F2 demoted to PARTIAL (soft rules exist but lack hard 4-gram check / banned-verbs list); F3 still OPEN. Stats: DONE 45→51, OPEN 40→32, PARTIAL 5→7. (+8/−8 lines)

## Context
User asked: "go through every log, make list of all that needs fixing, check if done, output table with IDs so I can choose what we fix."

Sources crawled:
- 13 `logs/may/*/notes.md` files (May 16–27 2026)
- `logs/may/2026_May24_batch/` (eval/self-edit harness, 26 runs, 4 systemic findings)
- `logs/april/*` — checked, no `notes.md` files exist (Apr runs predate notes capture)
- Memory feedback files (14 items)
- `PLAN.md` workstreams (7)
- `plans/cool-okay-so-peppy-thimble.md` v4 (Toby run, 30+ granular IDs A1–G5 + deferred)
- `plans/lexicon-finish.md` v1 (5 steps)

Deduplication: collapsed repeats across runs into one row; "Seen in" column shows run frequency. Items already tracked under existing plan IDs preserve those IDs (A1, D2 etc). New items get `FX-NN`.

## Status legend
- ✅ DONE — landed in code/prompts
- 🟡 PARTIAL — partly addressed, gap remains
- 🔴 OPEN — not started
- 📋 PLANNING — owner deciding approach
- 🧪 REVIEW — landed, awaiting verification

---

## Table — every fix, every status

### A. Prompts — openers & question bank

| ID | Issue | Seen in | Status | Pointer |
|---|---|---|---|---|
| FX-01 | "Most like yourself recently?" opener strange/creepy for Growth&career arc | May18-21:53, May24, May27-09:10 | ✅ DONE (=N2, =E1) | `questions/_openers.json:215` — growth removed from meeting_types |
| FX-02 | Growth-native opener missing ("Before we get into specifics…") | May24 | ✅ DONE (=E2) | `questions/_openers.json:219` `q_open_growth_lookforward` |
| FX-03 | "What's been nourishing in your life?" cheesy, no real person asks | May16-21:30, May27-09:10 | 🔴 OPEN | opener bank prune |
| FX-04 | Opener disconnected from arc — "communication challenges" / "strategic impact REALLY?" | May24, May27-08:48 | 🔴 OPEN | overlaps D1, prompt grounding |
| FX-05 | Energy-read question not linked to meeting type | May17-12:53 | 🔴 OPEN | `prompts/generate-questions.md` |
| FX-06 | Early set question "anything to cover" (would push to 9 q's) | May17-12:53 | 🔴 OPEN feature ask | new opener slot |
| FX-07 | Opener picker regression test | — | 🔴 OPEN (=E3) | `tests/opener-routing.test.js` |

### B. Prompts — arc / flow / planner

| ID | Issue | Seen in | Status | Pointer |
|---|---|---|---|---|
| D1 | Surface meeting arc + `remaining_stages` to planner | batch (plan_thread_follow bimodal), May24, May27 | ✅ DONE | `src/queue-manager.js:90-101` + `prompts/plan-turn.md:225` |
| D2 | Arc-stage budget rule (jump to next unserved stage if turns low) | May17-12:53, May24, May25 Q7 deep, May27 Q6 deep | ✅ DONE | `prompts/plan-turn.md:234` "Arc-stage budget rule (hard)" |
| D3 | Snap-back rule after strong growth/clarity (no re-queue seed openers) | May18 (= feedback_questioning_flow_breaks) | ✅ DONE | `prompts/plan-turn.md:235` "Snap-back after growth/clarity signal" |
| D4 | Same axis-purpose clarifier capped at 2 turns | May24 (annoying same Q after positive) | ✅ DONE | `prompts/plan-turn.md:236` "Wellbeing clarifier cap (hard)" |
| D5 | Off-arc drill capped 1 turn unless hint=deepen | May25 4-drill streak, May24 Q6 promotion tangent | ✅ DONE | `prompts/plan-turn.md:237` "Off-arc tangent cap" |
| FX-08 | Drill cap **runtime** enforcement (strip same-stage planner_added when count≥2) | May25 | 📋 PLANNING | `src/queue-manager.js` (heavy-ops decision) |
| FX-09 | Honor "I'll share my view" promises | May18 | ✅ DONE (=feedback #7) | `prompts/plan-turn.md` planning_rules #11 "Honor open commitments" |
| FX-10 | Don't repeat the question stem in follow-up | May18 | ✅ DONE (=feedback #6) | `prompts/plan-turn.md` question_craft "Don't echo the stem" |
| FX-11 | Winddown taper across last 2 turns (not just budget=1) | May18, May25 Q7 deep, May27 Q6 deep | 🟡 PARTIAL (=feedback #8) | `prompts/plan-turn.md` |
| FX-12 | Sounds like stop-question not open at late stage | May17-12:53 | 🔴 OPEN | overlaps FX-11 |
| FX-13 | Context-aware urgency: don't ask report about manager-imposed deadline | May25 | ✅ DONE | `prompts/plan-turn.md` planning_rules #12 "Context-aware urgency" |
| FX-14 | Length cap on planner-added clarifiers ≤18 words | May27-08:48 long-winded Q, May24 "okay but long" | ✅ DONE (=E4) | `prompts/plan-turn.md` question_craft "Length cap (hard)" |
| FX-15 | plan_delta_accuracy 0.50 — stop defaulting to neutral | batch | ✅ DONE | `prompts/plan-turn.md:190` CALIBRATION line |
| FX-16 | question_specificity 0.37 ceiling — persona grounding | batch | ✅ DONE | `prompts/generate-questions.md:125` "Ground in persona" |
| FX-17 | Replay Toby transcript, diff turn sequence | — | ✅ DONE (=D6) | `scripts/replay-scenario.js` fixture + arc + live checks; runs green on `--fixtures-only` |

### C. Prompts — preparation / focus points

| ID | Issue | Seen in | Status | Pointer |
|---|---|---|---|---|
| C1 | Non-accusatory opening rule (forbid "What specific [problem]") | May24 | ✅ DONE | `prompts/preparation.md:37-61` `<opening_question_rules>` |
| C2 | Private concern reframe (manager blunt → coaching tone) | May24, May27-08:48 | ✅ DONE | `prompts/preparation.md:48` "Private concern reframe" |
| C3 | `listenFor` names behavioural tells, not focus labels | May24 stupidly obvious | ✅ DONE | `prompts/preparation.md:63-72` `<listen_for_rules>` |
| C4 | `goodOutcome` role/seniority specific | May24, May27-08:48 "badly spoken" | ✅ DONE | `prompts/preparation.md:74-82` `<good_outcome_rules>` |
| C5 | `suggestedAction` pre-or-in-meeting only, never post | May24 follow-up-in-one-month | ✅ DONE | `prompts/preparation.md:84-92` `<suggested_action_rules>` |
| C6 | Prep validator enforces C1–C5 | — | ✅ DONE | `src/preparation.js:36-207` regex tables (ACCUSATORY/NEGATIVE_EVAL/PARAPHRASE/LEVEL_MARKERS/POST_MEETING) + retry path line 244 |
| C7 | Toby regression scenario + replay script | — | ✅ DONE | `scenarios/regression/toby_growth_lead.json` |
| FX-18 | `coreIssue` ≤28 words, one sentence | May17, May18 | ✅ DONE | `prompts/preparation.md` (feedback #5) |
| FX-19 | Focus-point `reason` non-human, corporate, AI-slop | May23, May27-08:48, May27-15:26 | ✅ DONE (=N4) | `prompts/generate-focus-points.md:22-28` Shape rule + Banned phrases + Voice check |
| FX-20 | Focus-point relevance unclear ("not sure why this is relevant") | May27-15:26 | ✅ DONE | same rules as FX-19 |
| FX-21 | "About you" reads like AI mistake is manager's fault | May17-12:53 | ✅ OBSOLETE | `aboutYou` field no longer exists in output_contract |
| FX-22 | Scope of outcomeGoal too big for one meeting | May17-12:53 | ✅ DONE | `prompts/preparation.md:34` "Not a multi-meeting arc..." rule |
| FX-23 | Preparation validator 1x retry on failure | May25 | ✅ DONE | `src/preparation.js` 2026-05-27 |

### D. Briefing / evaluation

| ID | Issue | Seen in | Status | Pointer |
|---|---|---|---|---|
| F1 | Briefing bullet ≠ paraphrase of headline (≥4 word overlap fails) | May24 "stood out repeats" | 🟡 PARTIAL | `prompts/final-evaluation.md:90` "Restatement test" rule exists but no hard 4-gram check |
| F2 | `brutal_truth_manager` names plan-shaped next move | May24 "about you = mute advice" | 🟡 PARTIAL | `prompts/final-evaluation.md:130-133` softer "what to deepen" rule; no banned-verbs list yet |
| F3 | Growth-meeting brutal truths name career evidence from transcript | May24 | 🔴 OPEN | `prompts/final-evaluation.md:122-135` needs Growth-specific evidence rule |
| F4 | N-gram overlap validator on briefing fields | — | 🔴 OPEN | `src/briefing.js` |
| FX-24 | Actions/Reminders over watch_for (copy-pasteable) | May18 | 🟡 PARTIAL (=feedback #11) | label changed; affordance + contract missing |
| FX-25 | Briefing typography messy; allow 1/2+1/2 layout | May18 | 🟡 PARTIAL (=feedback #10) | UI |
| FX-26 | Wellbeing/engagement scores reacting to typing not meaning ("fine" → -1) | May24 | 🔴 OPEN | axis classifier sensitivity |
| FX-27 | Don't see value in those ratings | May18, May24 | 🔴 OPEN | axis UI explainer / cut |
| FX-28 | Missing axis signal (clarity should have dropped before Q) | May27-08:48 | 🔴 OPEN | axis trigger |
| FX-29 | Eval shallow-gate enforcement (`<read_quality_gate>`) | May25 | ✅ DONE | `prompts/final-evaluation.md` 2026-05-27 |

### E. UI / frontend

| ID | Issue | Seen in | Status | Pointer |
|---|---|---|---|---|
| A1 | `.replace` → `.replaceAll` template substitution (placeholder bug, `{{NAME}}`) | May24 | ✅ DONE | grep `\.replace\("\{\{` returns zero hits in `src/` |
| A2 | Output guard against unresolved placeholders in parseAIJson | — | ✅ DONE | `src/ai-client.js:159-194` `findUnresolvedPlaceholderFields` throws in `parseAIJson` |
| A3 | Prompt-log assertion for unresolved tokens at send | — | ✅ DONE | `src/ai-client.js:67-80` `assertNoUnresolvedPlaceholders` called at top of `callAI` |
| B1 | Auto-skip Question bank stage (no click) | May24 | ✅ DONE | `frontend/client/src/stages/bank.js:21-24` auto-advances on `ready` event |
| B2 | Axis seed renders neutral at -1, not red | — | ✅ DONE | `frontend/client/src/ui/axes.js:86-97` neutral pill on seed+empty history |
| B3 | Axis baseline tooltip "Seeded at <N>. Moves with answers." | — | ✅ DONE | `frontend/client/src/ui/axes.js:68` title attr |
| FX-30 | Formatting garbage "line1 line2 line3 line4 line5" | May25 | ✅ DONE | covered by A2 placeholder guard in `parseAIJson` |
| FX-31 | Long em-dashes everywhere — filter before render | May16-20:43 | ✅ DONE | `escape()` strips `[—–]` to `,` in briefing/preparation/questioning/focus-points/lexicon-review stages |
| FX-32 | Text too small in questioning | May18 | 🟡 PARTIAL (=feedback #10) | typography bump |
| FX-33 | "What we will cover" header duplicated on focus-points | May18-21:53 | ✅ DONE (=N1) | `frontend/client/src/stages/focus-points.js:11-15` single canonical eyebrow+h1 |
| FX-34 | Post-briefing CTA "Complete 1:1" → lexicon picker page | May18 | 🔴 OPEN (=N3) | briefing CTA + next route |
| FX-35 | Notes carry `question_alias`/stem not just timestamp | May18 | 🔴 OPEN (=feedback #9) | `frontend/server/handlers/notes.js` + `frontend/client/src/ui/notes-panel.js` |
| FX-36 | "Using my notes" — typo/spelling corrections unused | May27-08:48 | 🔴 OPEN | notes pipeline |
| FX-37 | Dig-deeper button alongside next-question | May24 | 🔴 OPEN deferred (=H1) | UI control |
| FX-38 | Focus points unselected default (selection inverted) | May16, May17, May18 | ✅ DONE (=feedback #4) | UI |
| FX-39 | UI consistency canon (eyebrow+h1, sentence-case, "Continue") | — | ✅ DONE (=feedback #14) | UI canon |

### F. Lexicon

| ID | Issue | Seen in | Status | Pointer |
|---|---|---|---|---|
| G1 | Diagnose speaker source in extraction prompt | May17, May25 | 🔴 OPEN diagnostic | `prompts/review-session-for-lexicon.md` |
| G2 | Diagnose parser dropping candidates | May17, May25 | 🔴 OPEN diagnostic | `src/lexicon-reviewer.js:243-296` |
| G3 | Fix based on G1/G2 finding | — | 🔴 OPEN TBD | depends on G1/G2 |
| G4 | Candidate floor rule softened (don't pad weak runs) | May25 | 🔴 OPEN | `prompts/review-session-for-lexicon.md` |
| G5 | Toby lexicon regression fixture | — | 🔴 OPEN | `scenarios/regression/` |
| FX-40 | Lexicon empty-state UX (hide stage OR loosen filter OR fix copy) | May17-12:53, May25 | 📋 PLANNING | `src/lexicon/review-core.js:71` + frontend |
| LF-1 | Auto-run reviewer at end of session → trace JSON | — | 🔴 OPEN | `lexicons/_suggested/<sessionId>.json` |
| LF-2 | Web endpoint `GET /lexicon/candidates` reads trace | — | 🔴 OPEN | backend |
| LF-3 | POST keep-click appends to candidates YAML | — | 🔴 OPEN | backend |
| LF-4 | `scripts/promote-candidates.js` diff + interactive | — | 🔴 OPEN | CLI |
| LF-5 | Scope decision: design-only vs all roles | — | 🔴 OPEN design call | recommend B |
| LF-6 | Promote button in app | — | 🔴 OPEN optional | UI |

### G. Infra / ops

| ID | Issue | Seen in | Status | Pointer |
|---|---|---|---|---|
| FX-41 | Persona scenarios not in repo (batch used 26 unsaved personas) | batch | 🔴 OPEN | `scenarios/` |
| FX-42 | Logs tracked in git | — | ✅ DONE | commit `90d7b0d` |
| FX-43 | Pipeline review workflow output spec | — | 📋 PLANNING | reviewrun skill |
| FX-44 | Batch-run learnings adoption (EVOLVED-DIFF hunks layered with FX-09/FX-10) | batch | 🧪 REVIEW | `prompts/generate-questions.md`, `prompts/plan-turn.md` |
| FX-45 | Axis seeds (-1/-1/0/0) | — | ✅ DONE (=feedback #12) | defaults |
| FX-46 | Plan format conventions (version/caveman/changelog) | — | ✅ DONE (=feedback #1) | `plans/*` |
| FX-47 | Plan location convention (`darren/plans/`) | — | ✅ DONE (=feedback #2) | HANDOFF.md |
| FX-48 | Plans framed as suggestions not directives | — | ✅ DONE (=feedback #13) | `plans/*` |
| FX-49 | No mid-run questions policy | — | ✅ DONE (=feedback #3) | policy |

---

## Quick stats (post v5 cluster-B + F-series + B1 verification)
- Total IDs: 95
- ✅ DONE: 51 (incl. 1 OBSOLETE)
- 🟡 PARTIAL: 7
- 🧪 REVIEW: 1
- 📋 PLANNING: 4
- 🔴 OPEN: 32

## Verification (how to test once items land)
- Replay last failing run through `scripts/replay-scenario.js` once it exists.
- For prompt-only fixes, grep new rule lines into prompt file + diff next `logs/<month>/<new-run>/` against the row's `Seen in` log to confirm regression cleared.
- Phase-3 prep fixes verified via existing `src/preparation.js` validator + manual read of `01b-preparation/response.json`.
- UI fixes verified by running app per `/run` skill.

## Next move (for user)
Pick IDs from this table. User decides scope; this plan does not pre-commit to a sequence.

> **Reference doc (93/100 done, 0 open) — active work lives in [SERO_BOARD.md](../../../SERO_BOARD.md).**

# Log fix audit — every issue, every status

**Version:** v20
**Caveman version:** full
**Plan location note:** harness wrote here at `~/.claude/plans/`; per memory rule should be moved to `darren/plans/` after exit.

## Changelog
- v1: initial table. Pulled from 13 May `notes.md` + batch `2026_May24_batch/` + feedback memory + `plan.md` + `plans/cool-okay-so-peppy-thimble.md` + `plans/lexicon-finish.md`. (+220 lines)
- v2 (2026-05-30): audit verification pass — flipped 15 items from 🔴 OPEN to ✅ DONE after grep + Read confirmation. Items confirmed done: A1 (no `.replace("{{` left), B2/B3 (axes.js seed+tooltip), D1–D5 (queue-manager compute fns + plan-turn rules), E1/E2 (openers reshuffled), FX-15 (CALIBRATION line 190), FX-16 (persona grounding line 125), FX-17 (replay-scenario.js + scenarios/regression/toby_growth_lead.json), C7 (same fixture). Stats recounted. (+18/−15 lines)
- v3 (2026-05-30): cheap-wins batch. FX-31 + FX-33 confirmed already done in current code. FX-09/FX-10/FX-13/FX-14 landed as additions to `prompts/plan-turn.md` — two question_craft bullets ("Length cap (hard)", "Don't echo the stem") and two new planning_rules ("Honor open commitments" #11, "Context-aware urgency" #12). Replay fixtures still green. Stats: DONE 30→36, OPEN 55→49. (+8/−6 lines)
- v4 (2026-05-30): prep-batch verification — opened cluster A (C1-C5, FX-19, FX-20, FX-21, FX-22) and confirmed ALL already implemented in `prompts/preparation.md` (`<opening_question_rules>`, `<listen_for_rules>`, `<good_outcome_rules>`, `<suggested_action_rules>`, `<good_outcome_rules>` scope cap) and `prompts/generate-focus-points.md` (Shape rule + Banned phrases + Voice check). FX-21 marked OBSOLETE — `aboutYou` field no longer in output_contract. Zero code/prompt edits needed. Stats: DONE 36→45 (+9), OPEN 49→40. (+9/−9 lines)
- v5 (2026-05-30): cluster-B + F-series + B1 verification. Cluster B (C6, A2, A3) all ALREADY DONE in `src/preparation.js` (validateBrief regex tables + retry) and `src/ai-client.js` (`assertNoUnresolvedPlaceholders` at callAI + `findUnresolvedPlaceholderFields` in parseAIJson). B1 already done — `bank.js:21-24` auto-advances on `ready`. FX-30 covered by A2. F-series sweep: F1/F2 demoted to PARTIAL (soft rules exist but lack hard 4-gram check / banned-verbs list); F3 still OPEN. Stats: DONE 45→51, OPEN 40→32, PARTIAL 5→7. (+8/−8 lines)
- v6 (2026-05-30): F-batch landed (F1-F4). Added hard 4-gram headline/bullet overlap ban in `prompts/final-evaluation.md` `<summary_bullets_rule>`, tightened growth-specific `brutal_truth_manager` rules with banned generic verbs + required next-move nouns + transcript evidence in `<brutal_truth_rules>`, and added `fourGramOverlap()` warning validator in `src/reviewer.js` (logs `validation.issues` on overlap). Replay fixtures still green. Stats: DONE 51→55, PARTIAL 7→5, OPEN 32→30. (+12/−4 lines)
- v7 (2026-05-30): openers polish batch (FX-03/04/05/06/07) landed. Removed `q_open_nourishing`, added `q_open_anything_to_cover` (three meeting types), grounded `pickOpener` eligibility to meeting-arc anchor stage, added meeting-type-aware energy-read rule in `prompts/generate-questions.md`, and shipped standalone regression script `scripts/test-opener-routing.js` (including intentional-break fail check). Replay fixtures still green. Stats: DONE 55→60, OPEN 30→25. (+8/−8 lines)
- v8 (2026-05-30): notes batch (FX-35/36) landed. Notes panel now posts `question_alias` + `question_stem`; notes handler persists both fields; evaluation stage now formats captured notes as `[HH:MM @ alias] stem - text` with legacy-field fallback. FX-36 marked verified (no stale-text bug): submit path reads live textarea value, so browser-accepted spelling corrections flow downstream. Replay fixtures still green. (+5/−5 lines)
- v9 (2026-05-30): routing + scenarios batch (FX-34/41) landed. FX-34 kept existing `Complete 1:1` -> `LEXICON_REVIEW` routing and added scope-aware skip using `GET /api/lexicon/scope` so out-of-scope sessions finish cleanly to intake. FX-41 added `scenarios/batch/` with 10 reconstructed May-24 persona fixtures plus `_index.json` + `README.md`. Replay fixtures still green. Stats: DONE 62→64, OPEN 23→21. (+4/−4 lines)
- v10 (2026-05-30): Batch H housekeeping pass. Refreshed `plan.md` backlog state against audit, flipped LF-2/LF-3/LF-4 to DONE after code verification (`GET /api/lexicon/candidates`, decisions -> candidate YAML, `scripts/promote-candidates.js`), and fixed Carl scenario schema to canonical smoke-test shape. Replay fixtures still green. Stats: DONE 64→67, OPEN 21→18. (+6/−6 lines)
- v11 (2026-05-30): Batch I planner wind-down. Added `<wind_down_rule>` (2-turn taper at `remaining_budget <= 2`), `<closer_craft>` (open invitational closers), extended thread-follow wind-down limit, and final-turn closer reword allowance. FX-11/FX-12 → DONE. Replay fixtures still green. Stats: DONE 67→69, PARTIAL 5→4, OPEN 18→17. (+38/−8 lines)
- v12 (2026-05-30): Batch J UI polish. Reminders copy buttons + paste-ready eval contract (`watch_for_rules`), briefing 2-col grid + typography, questioning stem/textarea size bump. FX-24/FX-25/FX-32 → DONE. Replay fixtures still green. Stats: DONE 69→72, PARTIAL 4→0, OPEN 17 unchanged. (+120/−40 lines est.)
- v13 (2026-05-30): Batch M1 FX-44 verification. Added `scripts/batch-m1-verify.js`; prompt hunks verified; proxy scores on post-adoption Toby log beat May-24 baseline on all 3 target dims. Report: `logs/may/2026_May24_batch/m1-rerun-report.json`. FX-44 → DONE. Stats: DONE 72→73, REVIEW 1→0. (+200 lines est.)
- v14 (2026-05-30): Batch L lexicon pipeline. G1/G2 diagnosis: zero candidates caused by `shouldReview` excluding Expert seniority (Toby) + bi-weekly out-of-scope (Carl); no parser drop-off. G3: expanded scope to design+growth+lead|expert, expert→lead file mapping, normalized transcript/eval for prompt. G4 quality floor; LF-1 post-eval kick; FX-40 empty-state copy; G5 `toby_lexicon_growth.json` + `scripts/batch-l-verify.js`. Stats: DONE 73→80, OPEN 17→10, PLANNING 4→3. (+400 lines est.)
- v15 (2026-05-30): Batch K axis cluster. FX-26/27/28 → DONE. Stats: DONE 80→83, OPEN 10→7. (+250 lines est.)
- v16 (2026-05-30): Batch M3 regression fixtures. Pinned Priya/Lin/Ahmed May-24 worst runs as `scenarios/regression/*.json` + `scripts/batch-m3-verify.js`. Report: `logs/may/2026_May24_batch/m3-regression-report.json`. Stats: OPEN 7 unchanged (infra batch, no new audit IDs). (+600 lines est.)
- v17 (2026-06-01): Old-log open-issue pass before log prune. Merged `OLD-LOG-OPEN-ISSUES.md` NEW-A..D → FX-50..FX-53. Evidence from May31 Carl runs (+ `14-43-c197a1ea` regenerate). Stats: Total 95→99, OPEN 7→11. (+4 rows)
- v18 (2026-06-01): FX-43 done — `plans/reviewrun-output-spec.md` + skill audit crosswalk. Stats: PLANNING 3→2, DONE 83→84.
- v20 (2026-06-01): FX-54 thread-follow mirror rule + engine loop foundation (`prompt-version`, `rules`, `npm run eval`). Stats: Total 99→100, DONE 92→93.
- v19 (2026-06-01): Session backlog landed — FX-08, FX-37, FX-50–53, LF-5, LF-6 → DONE. Stats: DONE 84→92, OPEN 11→0, PLANNING 2→0.

## Context
User asked: "go through every log, make list of all that needs fixing, check if done, output table with IDs so I can choose what we fix."

Sources crawled:
- 13 `logs/may/*/notes.md` files (May 16–27 2026)
- `logs/may/2026_May24_batch/` (eval/self-edit harness, 26 runs, 4 systemic findings)
- `logs/april/*` — checked, no `notes.md` files exist (Apr runs predate notes capture)
- Memory feedback files (14 items)
- `plan.md` workstreams (7)
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
| FX-03 | "What's been nourishing in your life?" cheesy, no real person asks | May16-21:30, May27-09:10 | ✅ DONE | `questions/_openers.json` (`q_open_nourishing` removed) |
| FX-04 | Opener disconnected from arc — "communication challenges" / "strategic impact REALLY?" | May24, May27-08:48 | ✅ DONE | `src/opener.js` anchor-stage eligibility filter (`getArc` first-stage gate) |
| FX-05 | Energy-read question not linked to meeting type | May17-12:53 | ✅ DONE | `prompts/generate-questions.md` "Energy-read framing per meeting type." |
| FX-06 | Early set question "anything to cover" (would push to 9 q's) | May17-12:53 | ✅ DONE | `questions/_openers.json` `q_open_anything_to_cover` |
| FX-07 | Opener picker regression test | — | ✅ DONE (=E3) | `scripts/test-opener-routing.js` |
| FX-52 | Questioning opener too informal ("Tell me about your week, the real version") | May31 | ✅ DONE | `questions/_openers.json`, `prompts/generate-questions.md` tone lint |

### B. Prompts — arc / flow / planner

| ID | Issue | Seen in | Status | Pointer |
|---|---|---|---|---|
| D1 | Surface meeting arc + `remaining_stages` to planner | batch (plan_thread_follow bimodal), May24, May27 | ✅ DONE | `src/queue-manager.js:90-101` + `prompts/plan-turn.md:225` |
| D2 | Arc-stage budget rule (jump to next unserved stage if turns low) | May17-12:53, May24, May25 Q7 deep, May27 Q6 deep | ✅ DONE | `prompts/plan-turn.md:234` "Arc-stage budget rule (hard)" |
| D3 | Snap-back rule after strong growth/clarity (no re-queue seed openers) | May18 (= feedback_questioning_flow_breaks) | ✅ DONE | `prompts/plan-turn.md:235` "Snap-back after growth/clarity signal" |
| D4 | Same axis-purpose clarifier capped at 2 turns | May24 (annoying same Q after positive) | ✅ DONE | `prompts/plan-turn.md:236` "Wellbeing clarifier cap (hard)" |
| D5 | Off-arc drill capped 1 turn unless hint=deepen | May25 4-drill streak, May24 Q6 promotion tangent | ✅ DONE | `prompts/plan-turn.md:237` "Off-arc tangent cap" |
| FX-08 | Drill cap **runtime** enforcement (strip same-stage planner_added when count≥2) | May25 | ✅ DONE | `src/queue-manager.js` `enforceDrillCap` + `scripts/test-drill-cap.js` |
| FX-09 | Honor "I'll share my view" promises | May18 | ✅ DONE (=feedback #7) | `prompts/plan-turn.md` planning_rules #11 "Honor open commitments" |
| FX-10 | Don't repeat the question stem in follow-up | May18 | ✅ DONE (=feedback #6) | `prompts/plan-turn.md` question_craft "Don't echo the stem" |
| FX-11 | Winddown taper across last 2 turns (not just budget=1) | May18, May25 Q7 deep, May27 Q6 deep | ✅ DONE (=feedback #8) | `prompts/plan-turn.md` `<wind_down_rule>` |
| FX-12 | Sounds like stop-question not open at late stage | May17-12:53 | ✅ DONE | `prompts/plan-turn.md` `<closer_craft>` |
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
| FX-50 | Focus-point cards too verbose (want title + one sentence) | May31 | ✅ DONE | `prompts/generate-focus-points.md`, `src/generate.js`, `focus-points.js` |
| FX-51 | Prep opener too hard-edged for bi-weekly (need disarming tone) | May31 | ✅ DONE | `prompts/preparation.md`, `src/preparation.js` bi-weekly rules |

### D. Briefing / evaluation

| ID | Issue | Seen in | Status | Pointer |
|---|---|---|---|---|
| F1 | Briefing bullet ≠ paraphrase of headline (≥4 word overlap fails) | May24 "stood out repeats" | ✅ DONE | `prompts/final-evaluation.md:92` "4-gram overlap hard rule" in `<summary_bullets_rule>` |
| F2 | `brutal_truth_manager` names plan-shaped next move | May24 "about you = mute advice" | ✅ DONE | `prompts/final-evaluation.md:136-138` growth/career next-move + forbidden verbs + required nouns |
| F3 | Growth-meeting brutal truths name career evidence from transcript | May24 | ✅ DONE | `prompts/final-evaluation.md:139` growth-specific evidence requirement in `<brutal_truth_rules>` |
| F4 | N-gram overlap validator on briefing fields | — | ✅ DONE | `src/reviewer.js:125-166` `fourGramOverlap()` + `validation.issues` warning log |
| FX-24 | Actions/Reminders over watch_for (copy-pasteable) | May18 | ✅ DONE (=feedback #11) | `prompts/final-evaluation.md` `<watch_for_rules>` + `briefing.js` copy rows |
| FX-25 | Briefing typography messy; allow 1/2+1/2 layout | May18 | ✅ DONE (=feedback #10) | `briefing.js` + `design.css` `.briefing-grid--pair` |
| FX-26 | Wellbeing/engagement scores reacting to typing not meaning ("fine" → -1) | May24 | ✅ DONE | `applyShallowGate` zeros all deltas; filler patterns in `isShallowAnswer`; prompt shallow-vs-neutral |
| FX-27 | Don't see value in those ratings | May18, May24 | ✅ DONE (=path A) | Questioning + briefing explainer copy; axis tooltips |
| FX-28 | Missing axis signal (clarity should have dropped before Q) | May27-08:48 | ✅ DONE | `detectClarityMisalignment` + coverage inject + prompt misalignment type |
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
| FX-32 | Text too small in questioning | May18 | ✅ DONE (=feedback #10) | `questioning.js` + `design.css` `.question-stem`, `.textarea--question` |
| FX-33 | "What we will cover" header duplicated on focus-points | May18-21:53 | ✅ DONE (=N1) | `frontend/client/src/stages/focus-points.js:11-15` single canonical eyebrow+h1 |
| FX-34 | Post-briefing CTA "Complete 1:1" → lexicon picker page | May18 | ✅ DONE (=N3) | `frontend/client/src/stages/briefing.js` scope-check click handler + `frontend/server/handlers/lexicon.js` scope endpoint + `frontend/server/server.js` route |
| FX-35 | Notes carry `question_alias`/stem not just timestamp | May18 | ✅ DONE (=feedback #9) | `frontend/client/src/ui/notes-panel.js:75-88`, `frontend/server/handlers/notes.js:25-51,132-147`, `frontend/server/handlers/evaluation.js:7-33` |
| FX-36 | "Using my notes" — typo/spelling corrections unused | May27-08:48 | ✅ DONE (verified) | `frontend/client/src/ui/notes-panel.js:73` submit reads live `textarea.value.trim()`; no stale-state correction gap found |
| FX-37 | Dig-deeper button alongside next-question | May24 | ✅ DONE | `questioning.js`, `plan-turn.md` `<user_drill_request>`, `answer.js`/`plan.js` |
| FX-38 | Focus points unselected default (selection inverted) | May16, May17, May18 | ✅ DONE (=feedback #4) | UI |
| FX-39 | UI consistency canon (eyebrow+h1, sentence-case, "Continue") | — | ✅ DONE (=feedback #14) | UI canon |
| FX-54 | Thread-follow too weak in live sweep (0.473 vs 0.55–0.75 band) | M2 | ✅ DONE | `plan-turn.md` mirror-the-answer hard rule; verify via `npm run eval` + next live sweep |
| FX-53 | Focus-points Regenerate broken / unreliable | May31-14:43 | ✅ DONE | `focus-points.js` stageTick + `handlers/focus-points.js?regenerate=1` |

### F. Lexicon

| ID | Issue | Seen in | Status | Pointer |
|---|---|---|---|---|
| G1 | Diagnose speaker source in extraction prompt | May17, May25 | ✅ DONE | `normalizeTranscriptForReview` + prompt `<transcript_reading>` in `review-session-for-lexicon.md` |
| G2 | Diagnose parser dropping candidates | May17, May25 | ✅ DONE | Root cause: `shouldReview` gate (Expert excluded), not parser — see G3 |
| G3 | Fix based on G1/G2 finding | — | ✅ DONE | `src/lexicon.js` `resolveLexiconScope` + `isLexiconReviewScope`; `review-core.js` |
| G4 | Candidate floor rule softened (don't pad weak runs) | May25 | ✅ DONE | `prompts/review-session-for-lexicon.md` Quality floor block |
| G5 | Toby lexicon regression fixture | — | ✅ DONE | `scenarios/regression/toby_lexicon_growth.json` + `scripts/batch-l-verify.js` |
| FX-40 | Lexicon empty-state UX (hide stage OR loosen filter OR fix copy) | May17-12:53, May25 | ✅ DONE (=path C) | `frontend/client/src/stages/lexicon-review.js` + `skipped` reason from API |
| LF-1 | Auto-run reviewer at end of session → trace JSON | — | ✅ DONE | `frontend/server/handlers/evaluation.js` `kickLexiconReview` |
| LF-2 | Web endpoint `GET /lexicon/candidates` reads trace | — | ✅ DONE | `frontend/server/handlers/lexicon.js` (`candidates` -> `generateSuggestions`) |
| LF-3 | POST keep-click appends to candidates YAML | — | ✅ DONE | `frontend/server/handlers/lexicon.js` (`decisions` -> `commitDecisions`) |
| LF-4 | `scripts/promote-candidates.js` diff + interactive | — | ✅ DONE | `scripts/promote-candidates.js` |
| LF-5 | Scope decision: design-only vs all roles | — | ✅ DONE | path B — all role families on growth + lead/expert (`src/lexicon.js`) |
| LF-6 | Promote button in app | — | ✅ DONE | `lexicon-review.js`, `promote-core.js`, `/api/lexicon/promote` |

### G. Infra / ops

| ID | Issue | Seen in | Status | Pointer |
|---|---|---|---|---|
| FX-41 | Persona scenarios not in repo (batch used 26 unsaved personas) | batch | ✅ DONE | `scenarios/batch/` (10 persona JSONs + `_index.json` + `README.md`) |
| FX-42 | Logs tracked in git | — | ✅ DONE | commit `90d7b0d` |
| FX-43 | Pipeline review workflow output spec | — | ✅ DONE | `plans/reviewrun-output-spec.md`, `.claude/skills/reviewrun/SKILL.md` |
| FX-44 | Batch-run learnings adoption (EVOLVED-DIFF hunks layered with FX-09/FX-10) | batch | ✅ DONE | `scripts/batch-m1-verify.js` + `logs/may/2026_May24_batch/m1-rerun-report.json` |
| FX-45 | Axis seeds (-1/-1/0/0) | — | ✅ DONE (=feedback #12) | defaults |
| FX-46 | Plan format conventions (version/caveman/changelog) | — | ✅ DONE (=feedback #1) | `plans/*` |
| FX-47 | Plan location convention (`darren/plans/`) | — | ✅ DONE (=feedback #2) | HANDOFF.md |
| FX-48 | Plans framed as suggestions not directives | — | ✅ DONE (=feedback #13) | `plans/*` |
| FX-49 | No mid-run questions policy | — | ✅ DONE (=feedback #3) | policy |

---

## Quick stats (post v20 engine loop)
- Total IDs: 100
- ✅ DONE: 93 (incl. 1 OBSOLETE)
- 🟡 PARTIAL: 0
- 🧪 REVIEW: 0
- 📋 PLANNING: 0
- 🔴 OPEN: 0

## Verification (how to test once items land)
- Replay last failing run through `scripts/replay-scenario.js` once it exists.
- For prompt-only fixes, grep new rule lines into prompt file + diff next `logs/<month>/<new-run>/` against the row's `Seen in` log to confirm regression cleared.
- Phase-3 prep fixes verified via existing `src/preparation.js` validator + manual read of `01b-preparation/response.json`.
- UI fixes verified by running app per `/run` skill.

## Next move (for user)
Pick IDs from this table. User decides scope; this plan does not pre-commit to a sequence.

**Execution sequence (archived):** batches H–N completed 2026-06-01; see [`plans/done/remaining-backlog.md`](done/remaining-backlog.md) for verify commands only.

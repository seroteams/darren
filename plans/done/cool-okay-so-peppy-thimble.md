# Plan — Fix issues raised in run 2026_May24_21-46-1eb839fd

**Version:** 4 · **Caveman:** full

## Context

Run `logs/may/2026_May24_21-46-1eb839fd` (Toby · Expert UX Designer · Growth & career plan). User left 20 timestamped notes across Preparation, Questioning, Briefing, Lexicon. v1 plan grouped into 9 fat units; v3 splits into ~30 small numbered issues across 7 phases, each with single acceptance criterion. Phase 8 (dig-deeper button, scoring redesign, big UI work) deferred — first-pass scope is A1 → G5.

Goal: every issue handed to executor should fit one PR, have one observable pass/fail, and one regression hook. No mixed concerns inside an issue.

## Issue index (notes.md → phase)

| Note ts | Stage | Issue summary | Phase |
|---------|-------|---------------|-------|
| 21:47:18 | Prep | `{{NAME}}` literal in coreIssue + goodOutcome | 1 |
| 21:54:58 | Prep | Opening question generic | 3 |
| 21:55:19 | Prep | listenFor obvious | 3 |
| 21:55:55 | Prep | goodOutcome generic | 3 |
| 21:56:17 | Prep | suggestedAction premature | 3 |
| 21:59:18 | Question | Question Bank stage visible | 2 |
| 21:59:46 | Question | "Most like yourself" opener creepy | 5 |
| 22:00:46 | Question | Wellbeing seed reads as drop | 2 |
| 22:00:58 | Question | ✅ keep — good follow-up | — |
| 22:03:57 | Question | Wasted clarifier after positive answer | 4 |
| 22:06:23 | Question | "18 months" off-arc for Growth | 4/5 |
| 22:18:48 | Question | Q6 lost arc | 4 |
| 22:21:56 | Question | No advance/deepen control | 8 (deferred) |
| 22:23:23 | Question | Clarifier too long | 5 |
| 22:27:38 | Question | ✅ keep — final closer | — |
| 22:28:07 | Brief | ✅ keep — headline | — |
| 22:28:16 | Brief | Bullet 1 echoes headline | 6 |
| 22:28:28 | Brief | ✅ keep — understanding paragraph | — |
| 22:28:53 | Brief | `brutal_truth_manager` is mute | 6 |
| 22:29:11 | Lexicon | Zero candidates extracted | 7 |

---

## Phase 1 — Placeholder bug (HARD BUG, light-ops)

### A1 — `.replace` → `.replaceAll` across template substitution
- **Problem:** [src/preparation.js:39](src/preparation.js#L39) and sibling files use `String.replace()` (single-occurrence). Prompts contain duplicate tokens (e.g. `{{NAME}}` at [prompts/preparation.md:34](prompts/preparation.md#L34) and [:70](prompts/preparation.md#L70)); only first gets substituted; model echoes literal.
- **Files:** `src/preparation.js`, `src/queue-manager.js`, `src/generate.js`, `src/question-generator.js`, `src/lexicon-reviewer.js`, `src/briefing.js` (audit any caller of `fs.readFileSync(PROMPT_PATH)`).
- **Change:** swap every `.replace("{{X}}", val)` to `.replaceAll("{{X}}", val)`.
- **Acceptance:** grep `\.replace\("\{\{` returns zero hits across `src/`.
- **Regression:** add `scenarios/regression/toby_growth_lead.json`; assert `01b-preparation/response.json` contains no `{{` substring.
- **Risk:** none — `replaceAll` exists since Node 15; project already on modern Node.

### A2 — Output guard against unresolved placeholders
- **Problem:** even after A1, a future prompt edit can re-introduce a token. No safety net.
- **Files:** `src/ai-client.js` (response post-processing) OR `src/preparation.js` validator path.
- **Change:** in the parseAIJson path, throw if any string field matches `/\{\{[A-Z_]+\}\}/`. Log offending field name + stage.
- **Acceptance:** unit test: feed a fake response with `"{{NAME}}"` inside any field → parser throws with field name in message.
- **Risk:** low — only fires on actual leak.

### A3 — Prompt-log assertion for unresolved tokens at send time
- **Problem:** prompt itself can ship with unresolved tokens (the upstream cause of issue 1).
- **Files:** `src/ai-client.js` `callAI` (or wherever `system + user` get assembled).
- **Change:** before sending, scan `system + user` for `/\{\{[A-Z_]+\}\}/`. Throw with token name. Block the request.
- **Acceptance:** unit test: feed a template missing one substitution → callAI throws with the token name listed.
- **Risk:** false positives if any prompt intentionally documents a `{{TOKEN}}` literal (none currently; add an `<!-- literal -->` escape if needed later).

---

## Phase 2 — Visible flow cleanup (light-ops UX)

### B1 — Auto-skip "Question bank" intermediate stage
- **Problem:** [frontend/client/src/stages/bank.js:13](frontend/client/src/stages/bank.js#L13) shows a full-screen "Question bank / Start the 1:1" gate. User reads it as a wasted click.
- **Files:** `frontend/client/src/stages/bank.js`, `frontend/client/src/state.js` (STAGES enum).
- **Change:** on SSE `ready` event, auto-advance to `QUESTIONING`; keep the orb visible during generation but drop the CTA. If generation already complete when stage mounts, skip render entirely.
- **Acceptance:** click-through from prep to first question requires zero clicks at bank stage; no flash of "Start the 1:1" button.
- **Risk:** low — STAGES enum reference removal needs grep sweep.

### B2 — Axis seed renders as neutral, not −1
- **Problem:** wellbeing/engagement seed at −1 ([feedback_axis_starting_values.md](memory)), but UI displays the −1 as a red badge — user interpreted "I am fine" as having dropped wellbeing.
- **Files:** `frontend/client/src/ui/axes.js`.
- **Change:** when `score === seed && history.length === 0`, render neutral pill (grey, no minus sign). On first delta, switch to colored badge with delta arrow.
- **Acceptance:** load fresh run; wellbeing pill shows neutral state, not "−1".
- **Risk:** none — purely cosmetic.

### B3 — Axis baseline tooltip
- **Problem:** even with neutral display, user may want to know why wellbeing is "behind" growth/clarity.
- **Files:** `frontend/client/src/ui/axes.js`.
- **Change:** hover tooltip on each axis chip: "Seeded at <N>. Moves with answers."
- **Acceptance:** hover any axis chip → tooltip appears with seed value.
- **Risk:** none.

---

## Phase 3 — Prep quality (heavy-ops, prompt + validator)

### C1 — Non-Accusatory Opening Rule
- **Problem:** the generated opener "What specific communication challenges have you faced recently that might impact your transition to a lead role?" reads as accusatory — leads with the concern as a deficit Toby must defend. Opener may target the manager's concern, but must not sound like an accusation.
- **Files:** [prompts/preparation.md:31](prompts/preparation.md#L31).
- **Change:** rule additions — "openingQuestion MAY reference the manager's concern but must not frame it as a deficit. Forbid accusatory shapes: 'What specific [problem] have you…', 'Why haven't you…', 'Where have you fallen short on…'. Prefer probing or forward shapes: 'How are you thinking about X', 'What would moving forward on X look like', 'Where do you see X stretching you next'."
- **Acceptance:** re-run Toby scenario; openingQuestion does not match the banned shape regexes; does not contain words "fallen short", "failing", "weakness", "impact your transition".
- **Risk:** model may over-soften and lose specificity — keep concern reference allowed, ban only the deficit framing.

### C2 — Private Concern Reframe Rule (was: "must not restate")
- **Problem:** the briefing is *by the manager FOR the manager* — private concerns are valid content. The actual issue is wording. "communication methods suck" appeared in the opener as "communication challenges" — that's raw paraphrase, not coaching language. Manager's blunt notes should be converted into useful conversational handles, not echoed.
- **Files:** [prompts/preparation.md:31](prompts/preparation.md#L31).
- **Change:** rule — "When the opener references a concern from the manager's notes, convert raw wording into coaching language. Don't paraphrase ('challenges'), don't echo ('communication issues'). Reframe as a forward question about the underlying skill or behaviour. Example: notes 'communication methods suck' → opener 'How do you want your communication to land differently as you take on bigger scope?'"
- **Acceptance:** Toby re-run; openingQuestion references communication (the concern is preserved) but uses no negative-evaluation noun ("issues", "challenges", "problems", "weakness"); contains a forward verb ("want", "land", "stretch", "move", "build").
- **Risk:** low — preserves manager intent, just shapes the wording.

### C3 — listenFor must name behavioural tells, not focus labels
- **Problem:** "whether he acknowledges communication challenges / if they have a plan / whether he has received feedback" — each item is a paraphrase of a focus point. Zero new information for the manager.
- **Files:** [prompts/preparation.md:32](prompts/preparation.md#L32).
- **Change:** require each `listenFor` item to name a *behavioural cue* (silence, redirect, specific noun, named project or person, time word). Forbid the verbs "acknowledges", "has a plan to", "has received".
- **Acceptance:** Toby re-run; all three listenFor items contain at least one proper noun OR observable behaviour verb (`deflects`, `pivots`, `names`, `avoids`, `mentions`).
- **Risk:** model may invent fake proper nouns — validator should reject names not present in notes.

### C4 — goodOutcome must be role/seniority-specific
- **Problem:** "agreed on one specific communication skill to focus on improving this quarter" reads identically for a junior, mid, or expert. No level signal.
- **Files:** [prompts/preparation.md:34](prompts/preparation.md#L34).
- **Change:** require goodOutcome to name (a) a level-specific artefact OR (b) a scope boundary appropriate for the seniority. For Expert→Lead transitions specifically: must name leadership-shaped outcome (e.g. "definition of what 'leading design' means at lead level", "one project he'd own end-to-end").
- **Acceptance:** Toby re-run; goodOutcome contains either the seniority word or a level-distinguishing noun phrase from a fixed list (`lead`, `owns end-to-end`, `scope`, `decision authority`, etc.).
- **Risk:** list may overfit; keep additive.

### C5 — suggestedAction must be pre-meeting OR in-meeting, never post-meeting
- **Problem:** "Set a follow-up meeting in one month to review progress" — the 1:1 hasn't happened yet; nothing to follow up on.
- **Files:** [prompts/preparation.md:35](prompts/preparation.md#L35).
- **Change:** constrain to two shapes: (a) "Before the 1:1, …" (prep work the manager does) or (b) "During the 1:1, …" (in-meeting move). Forbid "schedule", "set up follow-up", "next month", "next quarter".
- **Acceptance:** Toby re-run; suggestedAction starts with "Before" or "During" (or equivalent imperative); no future scheduling verbs.
- **Risk:** model may twist phrasing to bypass — validator does the check.

### C6 — Prep validator: enforce C1–C5
- **Problem:** prompt rules are aspirational; without validator, regressions slip.
- **Files:** [src/preparation.js:55-122](src/preparation.js#L55-L122) `validateBrief`.
- **Change:** add checks for each new rule (banned word lists, behavioural-verb requirement, scheduling-verb ban, focus-point n-gram overlap on openingQuestion). Surface failures via existing `issues` array.
- **Acceptance:** unit tests — one failing fixture per rule produces the matching `issues[]` entry.
- **Risk:** validator runs but doesn't block — current code only logs. Keep that semantic.

### C7 — Toby regression scenario
- **Problem:** every prep change risks silent regression. No fixture today.
- **Files:** `scenarios/regression/toby_growth_lead.json` (new).
- **Change:** capture exact inputs from this run (`01-focus-points/inputs.json`); add a runner script `scripts/replay-scenario.js` that calls the prep + planner + eval stages and diffs against expected-not-to-contain assertions (C1–C5 checks).
- **Acceptance:** `node scripts/replay-scenario.js toby_growth_lead` exits 0 only when all checks pass.
- **Risk:** medium — new script surface; keep diff narrow (assertions only, no full-output match — LLM nondeterminism).

---

## Phase 4 — Conversation architecture (heavy-ops, planner)

### D1 — Surface meeting arc to planner explicitly
- **Problem:** [prompts/plan-turn.md](prompts/plan-turn.md) sees arc stages but [src/queue-manager.js](src/queue-manager.js) doesn't track *which stages remain unserved*.
- **Files:** [src/queue-manager.js](src/queue-manager.js) (extend `computeArcProgress`), [prompts/plan-turn.md](prompts/plan-turn.md).
- **Change:** compute `served_stages: Set<stage_id>` from prior turns; pass `remaining_stages: stage_id[]` to plan-turn prompt as new input variable.
- **Acceptance:** plan-turn `inputs.json` for any turn shows `remaining_stages` array matching arc minus served.
- **Risk:** low.

### D2 — Arc-stage budget rule
- **Problem:** planner can spend 3 turns on `anchor`-stage clarifiers, exhausting the 9-turn budget before reaching `aspiration` and `gap`.
- **Files:** [prompts/plan-turn.md](prompts/plan-turn.md).
- **Change:** rule: "If `turns_remaining ≤ remaining_stages.length`, pick a question from the next un-served stage instead of a clarifier."
- **Acceptance:** synthetic test — 5 turns left, 4 stages unserved → planner picks from next stage, not a clarifier.
- **Risk:** medium — arithmetic in the prompt is fragile; keep rule simple and add example.

### D3 — Snap-back rule after strong growth/clarity signal
- **Problem:** turn 3 produced `growth: +1` from a clear pivot ("how do I get to lead"), planner still issued turn-4 wellbeing clarifier.
- **Files:** [prompts/plan-turn.md](prompts/plan-turn.md).
- **Change:** rule: "If last answer's realized_deltas show growth ≥+1 OR clarity ≥+1, abandon any pending wellbeing-clarifier chain and advance to the next un-served arc stage."
- **Acceptance:** replay Toby turns 1–3 → expected turn 4 = aspiration-stage question (not "looking forward to this session" clarifier).
- **Risk:** medium — over-firing may skip useful follow-ups. Cap with D2.

### D4 — Stop wellbeing clarifiers after first useful answer
- **Problem:** planner kept asking "what specifically makes you feel most like yourself" variants for 3 turns. Diminishing return.
- **Files:** [prompts/plan-turn.md](prompts/plan-turn.md).
- **Change:** rule: "Same axis-purpose clarifier chain capped at 2 turns total. After 2 wellbeing clarifiers, switch axis-purpose."
- **Acceptance:** synthetic — 2 consecutive wellbeing clarifiers in queue → planner rejects third, picks non-wellbeing question.
- **Risk:** low; reuses existing `consecutive_drill_count`.

### D5 — Cap tangent drills unless manager asks for depth
- **Problem:** Q6/Q7 (`promotion_urgency`, `stakeholder_work_specifics`) drilled into a tangent. Without manager override, planner shouldn't go deeper than 1 follow-up off a non-arc thread.
- **Files:** [prompts/plan-turn.md](prompts/plan-turn.md).
- **Change:** rule: "Off-arc drill capped at 1 turn unless `manager_hint == 'deepen'`. After 1 off-arc turn, return to arc."
- **Acceptance:** replay Toby; turn 7 (`stakeholder_work_specifics`) replaced by arc question (`gap` or `investment` stage).
- **Risk:** rule depends on H1's `manager_hint` field. Until H1 ships, treat hint as always absent — rule still functions (cap = 1).

### D6 — Replay Toby transcript, diff turn sequence
- **Problem:** no automated way to confirm D1–D5 land the right turn order.
- **Files:** `scripts/replay-scenario.js` (extends C7).
- **Change:** feed Toby's actual answers turn-by-turn to the patched planner; capture the sequence of question aliases chosen; assert sequence includes at least one question per arc stage (anchor → aspiration → gap → investment → commitment).
- **Acceptance:** all 5 arc stages represented in replay; total turns ≤ 9.
- **Risk:** LLM nondeterminism; allow 1 retry per stage assertion.

---

## Phase 5 — Opener bank (heavy-ops, data + prompt)

### E1 — Remove "Most like yourself" from Growth & career plan
- **Problem:** `q_open_most_like_yourself` ([questions/_openers.json:207-217](questions/_openers.json#L207-L217)) scored into Growth via [src/opener.js:13-26](src/opener.js#L13-L26). Read as creepy and identity-probing for a career conversation.
- **Files:** [questions/_openers.json](questions/_openers.json).
- **Change:** remove `growth` from this opener's `meeting_types` array.
- **Acceptance:** dry-run `pickOpener({meetingType: "Growth & career plan"})` 50 times → `q_open_most_like_yourself` never selected.
- **Risk:** none.

### E2 — Add a Growth-native opener
- **Problem:** removing E1 leaves a gap.
- **Files:** [questions/_openers.json](questions/_openers.json).
- **Change:** add opener: alias `q_open_growth_lookforward`, text "Before we get into specifics, what's been most on your mind about where you're heading?", `meeting_types: ["growth"]`, axis_effects `{growth: 2, engagement: 1}`.
- **Acceptance:** dry-run for Growth meeting picks the new opener at non-zero rate.
- **Risk:** low; pure data add.

### E3 — Opener picker regression test
- **Problem:** no test guards against future opener-routing regressions.
- **Files:** `tests/opener-routing.test.js` (new).
- **Change:** parameterized test: for each meeting type, 100-trial pickOpener → assert no forbidden opener appears (table per meeting type).
- **Acceptance:** `npm test` passes; introducing a creepy opener for Growth fails the test.
- **Risk:** none.

### E4 — Length cap on planner-added clarifiers
- **Problem:** "In what situations do you find your current communication style most effective, and where is it not landing as you'd like?" — too long.
- **Files:** [prompts/plan-turn.md](prompts/plan-turn.md).
- **Change:** rule: "planner_added question `name` must be ≤18 words and contain no comma-conjunctions ('and where', 'or what')."
- **Acceptance:** synthetic — generate 20 planner-added questions; >95% under 18 words.
- **Risk:** low.

---

## Phase 6 — Briefing (heavy-ops, prompt + validator)

### F1 — Bullet must not paraphrase headline
- **Problem:** `headline` and `summary_bullets[0]` carried nearly identical sentences ("Toby is focused on becoming a lead, with a real risk of leaving if not promoted soon" vs "Toby's answers indicate a strong desire for promotion to lead, with a risk of leaving if unmet").
- **Files:** [prompts/final-evaluation.md:62-79](prompts/final-evaluation.md#L62-L79).
- **Change:** add explicit rule: "No bullet may share ≥4 consecutive content words with `headline`. If only one bullet survives this check, emit one bullet — fewer real bullets beats restatement."
- **Acceptance:** Toby re-run; 4-word n-gram overlap between headline and each bullet = 0.
- **Risk:** low.

### F2 — `brutal_truth_manager` must name a plan-shaped next move
- **Problem:** current output ends "Next time, delve into areas needing improvement" — vague coaching, no concrete move.
- **Files:** [prompts/final-evaluation.md:101-114](prompts/final-evaluation.md#L101-L114).
- **Change:** rule for Growth & career plan: "brutal_truth_manager must name a specific next plan move — a competency to demonstrate, a stakeholder to expose to, a project to assign, or a scope-stretch to grant. Forbid generic verbs: 'delve', 'explore further', 'dig deeper', 'follow up'."
- **Acceptance:** Toby re-run; brutal_truth_manager contains a concrete noun phrase from a target list (`project`, `stakeholder`, `scope`, `decision`, `competency`); no banned verbs.
- **Risk:** model may stuff fake project names — keep validator narrow to verbs/scope.

### F3 — Growth-meeting brutal truths must name career evidence
- **Problem:** Growth & career plan briefings should reference *evidence* of readiness or gap, not vibes.
- **Files:** [prompts/final-evaluation.md:101-114](prompts/final-evaluation.md#L101-L114).
- **Change:** rule: "For Growth & career plan, brutal_truth_manager must name one specific behaviour, artefact, or moment from the transcript that constitutes evidence for/against the report's stated next-level claim."
- **Acceptance:** Toby re-run; brutal_truth_manager quotes a transcript phrase or names a stated artefact (e.g. "documentation", "presenting to stakeholders", "leading design").
- **Risk:** low; reuses existing quote-from-transcript pattern.

### F4 — N-gram overlap validator on briefing fields
- **Problem:** prompt rules need a backstop.
- **Files:** [src/briefing.js](src/briefing.js) (or wherever final-evaluation response is parsed).
- **Change:** compute 4-gram overlap between `headline` and each `summary_bullet`; warn if any overlap ≥1. Surface in stage log.
- **Acceptance:** unit test — feed identical headline+bullet → warning emitted.
- **Risk:** none.

---

## Phase 7 — Lexicon (heavy-ops, investigation + fix)

### G1 — Diagnose: speaker source in extraction prompt
- **Problem:** zero candidates extracted despite mineable phrases ("real flight risk", "leading the design", "exceed", "up for promotion").
- **Files:** [prompts/review-session-for-lexicon.md](prompts/review-session-for-lexicon.md).
- **Change:** READ-ONLY diagnostic — confirm whether prompt asks for manager-spoken vs report-spoken phrases. Document finding.
- **Acceptance:** written finding (1 paragraph) added to this plan or PR description. No code change yet.
- **Risk:** none.

### G2 — Diagnose: parser dropping candidates
- **Problem:** even if model returns candidates, [src/lexicon-reviewer.js:243-296](src/lexicon-reviewer.js#L243-L296) may filter them out.
- **Files:** [src/lexicon-reviewer.js:243-296](src/lexicon-reviewer.js#L243-L296).
- **Change:** READ-ONLY — add temporary `console.error` of raw model response; run Toby transcript; capture raw output. Document.
- **Acceptance:** raw response captured and pasted into plan/PR. No permanent code change.
- **Risk:** none.

### G3 — Fix: act on G1/G2 finding
- **Problem:** depends on diagnosis.
- **Files:** TBD by G1/G2.
- **Change:** TBD — likely either (a) loosen prompt to accept report-spoken phrases, or (b) fix parser threshold/filter.
- **Acceptance:** Toby re-run produces ≥3 lexicon candidates.
- **Risk:** unknown until diagnosis.

### G4 — Lexicon Candidate Floor Rule (softened)
- **Problem:** model under-extracted on a transcript with several real candidates. A hard "always emit N" floor risks the opposite failure — fabricated weak candidates on transcripts that genuinely have nothing to mine.
- **Files:** [prompts/review-session-for-lexicon.md](prompts/review-session-for-lexicon.md).
- **Change:** rule — "If strong candidate phrases exist in the transcript, surface them. Do not invent or pad weak candidates to hit a count. Quality > quantity. Emitting zero candidates on a rich transcript is a failure; emitting zero on a sparse transcript is correct."
- **Acceptance:** Toby re-run surfaces at least the obvious candidates ("real flight risk", "leading the design", "up for promotion") — but no forced floor count assertion. Add inverse fixture: a synthetic sparse transcript should still return zero, not padded.
- **Risk:** subjective — depends on G1/G2 diagnosis surfacing the actual under-extraction cause.

### G5 — Toby lexicon regression fixture
- **Problem:** no fixture for lexicon stage.
- **Files:** `scenarios/regression/toby_growth_lead.json` (extend C7 fixture), `scripts/replay-scenario.js`.
- **Change:** add lexicon stage to replay; assert ≥3 candidates returned for Toby transcript.
- **Acceptance:** `node scripts/replay-scenario.js toby_growth_lead` includes lexicon assertion.
- **Risk:** LLM nondeterminism on extraction — allow 1 retry.

---

## Phase 8 — Deferred (NOT in first pass)

- **H1–H5: Dig-deeper / advance-arc product control** — UI button + planner hint contract + override logging. Belongs in its own design pass; touches engine semantics.
- **Lexicon UI polish** — beyond G3/G4.
- **New axis scoring model** — current model is fine after B2; redesign is overkill.
- **Big UI redesign** — out of scope.

Do not start these until Phase 1–7 closes.

---

## Walk-through order (revised)

Strict serial within phase; phases can overlap if owners differ:

1. **A1 → A2 → A3** (Phase 1, light-ops, ~30 min total)
2. **B1, B2, B3** (Phase 2, light-ops, ~1 hr)
3. **C1 → C2 → C3 → C4 → C5 → C6 → C7** (Phase 3, heavy-ops, ~½ day)
4. **D1 → D2 → D3 → D4 → D5 → D6** (Phase 4, heavy-ops, ~½ day; needs C7 fixture first)
5. **E1, E2, E3, E4** (Phase 5, mixed)
6. **F1 → F2 → F3 → F4** (Phase 6, heavy-ops)
7. **G1 → G2 → G3 → G4 → G5** (Phase 7, heavy-ops; G1+G2 are read-only, can parallelize with anything)

✅ Keep items (no fix): turn 22:00:58 (good clarify), turn 22:27:38 (good closer), 22:28:07 (good headline), 22:28:28 (good understanding paragraph). Capture verbatim under `prompts/_locked_examples/` for use in evolution runs.

## Critical files

- `src/preparation.js` — A1, A2, C6
- `src/ai-client.js` — A2, A3
- `src/queue-manager.js` — A1, D1
- `src/generate.js`, `src/question-generator.js`, `src/lexicon-reviewer.js`, `src/briefing.js` — A1 sweep
- `prompts/preparation.md` — C1–C5
- `prompts/plan-turn.md` — D2–D5, E4
- `prompts/final-evaluation.md` — F1–F3
- `prompts/review-session-for-lexicon.md` — G1, G4
- `questions/_openers.json` — E1, E2
- `src/opener.js` — (read for E1/E2 verification)
- `frontend/client/src/stages/bank.js`, `frontend/client/src/state.js` — B1
- `frontend/client/src/ui/axes.js` — B2, B3
- `scenarios/regression/toby_growth_lead.json` — C7, G5 (new)
- `scripts/replay-scenario.js` — C7, D6, G5 (new)
- `tests/opener-routing.test.js` — E3 (new)

## Verification

Per-issue acceptance criteria listed above. Cross-issue: after each phase closes, run `node scripts/replay-scenario.js toby_growth_lead` and the May 24 batch replay (`logs/may/2026_May24_batch`) for regression sweep against `quality_report.json` axes.

## Changelog

- v1 — initial 9-unit grouping, +193 lines.
- v2 — keep openingQuestion field per user; confirm order; defer Unit G. +3 / −2 lines.
- v3 — full restructure per user feedback: split 9 fat units into ~30 numbered issues across 7 phases + Phase 8 deferred. Every issue carries Problem · Files · Change · Acceptance · Risk. +280 / −60 lines.
- v4 — per user review: C1 softened (allow concern targeting, ban only accusatory shape); C2 renamed "Private Concern Reframe Rule" — preserves manager concerns, reshapes wording into coaching language; G4 softened ("surface if strong, don't pad") — no hard floor. +18 / −10 lines.

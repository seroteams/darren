# Plan — Improve the live 1:1 flow

> **Update (this turn).** Phase 1 work (cli.js + prompts + queue-manager.js) is implemented and verified. The user runs sessions through the **HTTP frontend**, not the CLI, so the closer-reservation code paths added to `cli.js` never fire for them. The questioning loop the frontend uses ([frontend/server/handlers/plan.js](frontend/server/handlers/plan.js)) calls the same `planTurn` from `src/queue-manager.js` (so all prompt edits, the shallow-answer guard, arc-progress and drill-count helpers ARE live for them already) — only the closer reservation and force-insert need mirroring across. This update adds **Phase 2 — Frontend parity** below.

## Context

Run `2026_May16_11-11-c26cabf4` (Carl, Lead Web Designer, "Growth & career plan", note: "taking on too many things") exposed four flow failures:

1. **Topic drilling burned the budget.** Turns 3–6 were all on one delegation/BA thread (3 of them `planner_added`). That's half the session on one issue.
2. **Shallow answers scored as positive signal.** "every day" → +1 wellbeing, "as a lead" → +1 growth, "The team is better" → +1 engagement. None of these are real answers.
3. **Meeting type drifted.** "Growth & career plan" ran as a delegation/clarity conversation. The arc has 5 stages (anchor → aspiration → gap → investment → commitment); only anchor + half of aspiration got covered.
4. **Closer never ran.** The bank included `q_next_steps_commitment_2` but it was dropped on the first planner turn and never came back. Turn 8 was a skipped vision question, not a commitment.

The root cause for all four sits in the same place: the planner (`plan-turn.md` + [src/queue-manager.js](src/queue-manager.js)) is given near-total authority over the queue, with no runtime guard rails for budget, arc coverage, answer quality, or closer reservation. The prompt mentions these constraints; the runner doesn't enforce them.

**Intended outcome:** a session that (a) gives each arc stage at least one question, (b) reserves the final turn for the closer, (c) caps consecutive drills on one thread, and (d) refuses to score one-word non-answers.

## Goals (success criteria)

- A Growth & career plan run with terse answers must still reach `commitment` stage by the final turn.
- No more than 2 consecutive `planner_added` items on the same `stage`.
- Answers under a length/specificity floor (one-word, cliché, tautology) score `0` with a `re-prompt` note, not a positive delta.
- Final evaluation flags shallow-answer turns instead of treating them as positive axis signal.

## Proposed changes (ordered by impact)

### 1. Reserve the closer — `cli.js` AND `plan-turn.md` (belt-and-braces)

**Files:** [cli.js:285-425](cli.js#L285-L425) and [prompts/plan-turn.md](prompts/plan-turn.md).

**Code-side (the brace):**

After the question bank is appended ([cli.js:283](cli.js#L283)), identify the closer: the last item with `stage === <arc.finalStageId>` OR the explicitly-tagged closer from the bank. Store its alias and the full question object as `closer`.

In the loop, when the *upcoming* turn would be the last (i.e., after the planner returns its queue and `turn + 1 === totalBudget`):
- If `closer.alias` is not at `queueRef[0]`, force-insert it there. Pop any other item that drifted into that slot to position 1 (it gets dropped when the loop ends).
- This is deterministic: the closer always runs as turn N, regardless of what the planner returned.

Also pass `is_final_turn: true` and `closer_alias: <alias>` into `planTurn()` for transparency to the planner.

Reuse `getArc()` from [src/meeting-arcs.js](src/meeting-arcs.js) to read the final-stage id rather than hardcoding "commitment".

**Prompt-side (the belt):**

Strengthen the existing "Final turn (`remaining_budget` = 1)" rule in `<planning_rules>` (line 166):

> When `is_final_turn` is true, the first item in `new_queue` MUST have `ref_alias === closer_alias`. Do not modify its wording. Do not substitute another commitment-stage question. The runner enforces this — returning anything else will be overridden.

The runner is the source of truth; the prompt rule keeps the planner from churning the queue order on the final turn for no reason.

**Why surgical:** ~20 lines in cli.js, ~5 lines in the prompt, no new files, no abstraction.

### 2. Cap consecutive drills on one thread — `plan-turn.md` + queue-manager

**Files:** [prompts/plan-turn.md](prompts/plan-turn.md) (`<thread_follow_rule>`, lines 13–39) and [src/queue-manager.js](src/queue-manager.js) (`buildMessages`, lines 63–121).

Compute `consecutive_drill_count` in `buildMessages` by walking back through `transcript` and counting items where `question.source === "planner_added"` AND `question.stage === lastQuestion.stage`. Pass it into the prompt as `{{CONSECUTIVE_DRILL_COUNT}}`.

Amend `<thread_follow_rule>` to add a hard cap:

> If `consecutive_drill_count >= 2`, the thread-follow rule does NOT fire even if a concrete thread exists. The third turn must advance the arc (next stage in arc order). Note the unfollowed thread in `assessment.note` instead — the manager can pick it up next session.

**Why this works:** turns 4, 5, 6 in the failing run were all stage=`anchor` planner_added drills. The cap would have forced turn 5 or 6 to advance to `aspiration` / `gap`.

### 3. Track arc coverage — `plan-turn.md` + queue-manager

**Files:** same as #2.

In `buildMessages`, compute `arc_progress` by tallying each turn's `question.stage` across the transcript:

```js
// e.g. { anchor: 2, aspiration: 0, gap: 0, investment: 0, commitment: 0 }
```

Replace `{{CURRENT_STAGE_HINT}}` with `{{ARC_PROGRESS_JSON}}` (or pass both). In the prompt's `<planning_rules>` rule 7, replace the vague "queue should progress through stages in arc order" with:

> Compare `arc_progress` to the arc's `target_questions` per stage. A stage with `target_questions: 2` that has `0` turns spent on it is **under-served** — the next non-drill question in `new_queue` MUST belong to the most under-served not-yet-covered stage. Reach `commitment` before the final turn.

This is enforcement by visibility: the planner can see exactly which stages it has neglected.

### 4. Refuse to score shallow answers — `plan-turn.md` + queue-manager

**File:** [prompts/plan-turn.md](prompts/plan-turn.md) (`<assessment_rules>`, lines 72–123).

Add a new classification *before* the existing 5-type list:

> **Step 0 — shallow-answer gate.** If the answer is:
> - one to three tokens with no concrete noun (e.g. "every day", "as a lead", "yeah", "good"), OR
> - a cliché restatement of the role/title without specifics ("as a lead", "as a manager"), OR
> - a tautology of the question (Q: "where do you want to be in 18 months?" / A: "as a lead" — they already are), OR
> - a single comparative with no referent ("The team is better" — better than what?),
>
> → classify as **shallow**: realised deltas are `{}`, note must start with `[SHALLOW]` and name the missing specificity. Do not score a positive signal off a non-answer.
>
> When a shallow answer is detected, the first item in `new_queue` MUST be a one-shot clarifying re-prompt (e.g. "When you say 'as a lead' — what does that look like specifically? More scope, different work, leading more people, something else?"). Cap: one re-prompt per thread; if the re-prompt also returns shallow, advance the arc.

**Code-side guard** (defence in depth): in [src/queue-manager.js](src/queue-manager.js) `planTurn` (lines 261–312), after parsing, compute `answerTokenCount = lastAnswer.split(/\s+/).length`. If `answerTokenCount <= 3` and any returned delta is positive, downgrade to `0` and log an issue (`shallow answer scored positive — zeroed`). Existing `clampToSignature` is the right neighbour for this — extend it.

### 5. Flag shallow turns in evaluation — `final-evaluation.md`

**File:** [prompts/final-evaluation.md](prompts/final-evaluation.md).

Add a rule to the `brutal_truth_employee` / `brutal_truth_manager` sections:

> Turns whose answer is < 4 tokens or marked `[SHALLOW]` in the assessment note must NOT be cited as positive signal. If 3+ of the session's turns are shallow, the headline must lead with that: "Carl answered most questions in 2–4 words — what we have is a partial read, not a verdict."

No code change — eval already reads the transcript with `note` fields. Just nudges the model away from over-reading.

## Files to modify

| File | Change |
|---|---|
| [cli.js:285-425](cli.js#L285-L425) | Reserve closer; pass `is_final_turn` |
| [src/queue-manager.js:63-121](src/queue-manager.js#L63-L121) | Compute & pass `consecutive_drill_count`, `arc_progress`; add `is_final_turn` placeholder |
| [src/queue-manager.js:261-312](src/queue-manager.js#L261-L312) | Add shallow-answer code-side zeroing in `planTurn` |
| [prompts/plan-turn.md](prompts/plan-turn.md) | Drill cap, arc-progress rule, shallow-answer step 0 |
| [prompts/final-evaluation.md](prompts/final-evaluation.md) | Don't treat shallow turns as positive signal |

No new files. No new modules. Reuses `getArc()` from [src/meeting-arcs.js](src/meeting-arcs.js) and existing prompt template substitution.

## Out of scope (deliberately not fixing now)

- **Focus-point fallback budget violation** (3 of 5 were "No specific signal" — prompt says max 2). Real issue but stage-1, not the flow problem the user surfaced.
- **Preparation validation failure** (`output may not reflect the meeting type distinctly`). Similar — separate stage, separate fix.
- **Bank pre-validation** ensuring a closer exists. The reservation in #1 handles the runtime; tightening the bank itself can wait.
- **Re-architecting the planner** as a state machine with code-side stage transitions. Tempting, but the prompt-plus-visibility approach above is the smaller change and matches CLAUDE.md "surgical changes" and "no flexibility that wasn't requested".

## Verification

Re-run the same Carl scenario by replaying answers verbatim ("every day", "The team is better", "the BA's are telling us.", "its hard, we want to be earlier in the process", "help us take care of the project better.", "meet with the PO's", "as a lead", and one more):

1. **Closer reached.** Final turn (8) must be a commitment-stage question, not a vision/aspiration probe.
2. **Drill cap.** No more than 2 consecutive `planner_added` items at `stage: anchor`. After turn 5 the planner must advance to a non-anchor stage.
3. **Shallow answers zeroed.** "every day" → `wellbeing: 0` (not +1). "as a lead" → `growth: 0` (not +1). "The team is better" → `engagement: 0` (not +1). Each must produce a `[SHALLOW]` note and a clarifying re-prompt in the next queue.
4. **Arc coverage.** Final transcript must show at least one turn at each of: anchor, aspiration, commitment. (gap and investment are nice-to-have given 8-turn budget.)
5. **Evaluation honesty.** `brutal_truth_employee` must name the shallow-answer pattern (or pick a different signal); the +1 wellbeing/engagement scores must not appear in `axes[].meaning` as positive reads.

Replay tooling already exists: `probe-plan-turn-ab.js` and `rerun-eval.js` at the repo root. The full session replay path is `cli.js` with stdin piped — confirm exact replay mechanism before relying on it.

---

# Phase 2 — Frontend parity (closer reservation)

## What's already live for the frontend (no work needed)

The HTTP frontend ([frontend/server/handlers/plan.js:62-73](frontend/server/handlers/plan.js#L62-L73)) imports `planTurn` from `../../../src/queue-manager`. Everything I added inside `src/queue-manager.js` and inside the prompt files is therefore already executing for the frontend:

- ✅ Shallow-answer code guard (zeroes positive deltas for ≤3-token answers) — runs inside `planTurn`.
- ✅ `computeArcProgress`, `computeConsecutiveDrillCount` — both run inside `buildMessages` and the planner sees them.
- ✅ Updated `plan-turn.md` (Step 0 shallow gate, drill cap, under-served-stage rule, final-turn rule) — re-read from disk on every call ([src/queue-manager.js:76](src/queue-manager.js#L76)).
- ✅ Updated `final-evaluation.md` (`<shallow_answer_handling>` block) — re-read from disk on every eval call.

## What's NOT live for the frontend (must mirror from cli.js)

The closer-reservation logic added to `cli.js:283-294` and `cli.js:382-393` lives only in the CLI. The frontend never:
- identifies a closer from the bank,
- stores it on the session,
- passes `closerAlias` into `planTurn`, or
- force-inserts it at `queueRef[0]` when `turn + 1 === totalBudget`.

So the frontend planner sees `{{CLOSER_ALIAS}}` rendered as `(none)` and falls back to "planner generates a commitment-stage question". That's the original failure mode — better than nothing because of the prompt rule, but not deterministic.

## Changes (4 files)

### A. [frontend/server/handlers/bank.js](frontend/server/handlers/bank.js)

After the bank is generated and `session.queueRef` is built (line 27), identify and store the closer on the session, mirroring [cli.js:286-294](cli.js#L286-L294):

```js
const { getArc } = require("../../../src/meeting-arcs");
// ...
const arc = getArc(session.ctx.meetingType);
const finalStageId = arc.arc[arc.arc.length - 1].id;
const closerCandidates = bankItems.filter((q) => q.stage === finalStageId);
session.closer = closerCandidates.length ? closerCandidates[closerCandidates.length - 1] : null;
```

The full closer object goes on the session (not just an alias) so the force-insert later has all the fields it needs.

### B. [frontend/server/handlers/plan.js](frontend/server/handlers/plan.js)

Two edits, both mirroring `cli.js`:

1. **Pass `closerAlias` into `planTurn`** ([plan.js:62-73](frontend/server/handlers/plan.js#L62-L73)):
   ```js
   planTurn({
     ...,
     closerAlias: session.closer ? session.closer.alias : null,
   })
   ```

2. **Force-insert the closer after the planner returns** — immediately after `session.queueRef = planResult.newQueue.slice();` ([plan.js:96](frontend/server/handlers/plan.js#L96)):
   ```js
   const askedAliases = new Set(session.transcript.map((t) => t.question.alias));
   if (turn + 1 === session.totalBudget && session.closer && !askedAliases.has(session.closer.alias)) {
     if (session.queueRef[0]?.alias !== session.closer.alias) {
       session.queueRef = session.queueRef.filter((x) => x.alias !== session.closer.alias);
       session.queueRef.unshift(session.closer);
       planResult.issues = [...(planResult.issues || []), `closer force-inserted: ${session.closer.alias}`];
     }
   }
   ```

   `planResult.issues` is appended to so the existing SSE `note` stream surfaces the action to the operator — keeps the existing `stream.write("note", ...)` pattern at [plan.js:107-111](frontend/server/handlers/plan.js#L107-L111) without inventing a new event type.

### C. [frontend/server/sessions.js](frontend/server/sessions.js)

Add `closer: null` to the initial session state at [sessions.js:23-48](frontend/server/sessions.js#L23-L48) so the field exists from session creation. Default `null` — `bank.js` fills it later.

### D. [frontend/server/session-persistence.js](frontend/server/session-persistence.js)

Add `closer: s.closer` to the `serialize()` function at [session-persistence.js:9-30](frontend/server/session-persistence.js#L9-L30) so an interrupted session resumed from disk doesn't lose the reserved closer.

## Out of scope (same as Phase 1)

- The prep-briefing prompt validation issue the user saw in the screenshot (`output may not reflect the meeting type distinctly`) is stage 01b, not the questioning flow. Not fixing here.
- No client-side (`frontend/client/`) changes — the closer-reservation is server-side and invisible to the UI except via the existing `note` stream.

## Verification

1. **Start a fresh session via the frontend** (UX Lead, Growth & career plan, or replay the Carl scenario).
2. After bank generation, check the persisted `session-state.json` in the new `logs/<id>/` dir — it must contain a non-null `closer` field with `stage: "commitment"` (for Growth & career plan).
3. Answer turns 1–7 with short answers. By turn 7's plan response, the SSE stream should emit a note `closer force-inserted: <alias>`.
4. Turn 8's question must be the reserved closer (alias matches `session.closer.alias`).
5. Run the post-session evaluation and check `headline` / `brutal_truth_manager` mention shallow answers if 3+ were ≤3 tokens.
6. Restart the server mid-session (after step 2) and resume — the `closer` must round-trip through `session-persistence.js`.

## Files to modify (Phase 2 total)

| File | Change | Lines (approx) |
|---|---|---|
| [frontend/server/handlers/bank.js](frontend/server/handlers/bank.js) | Identify closer; store on session | +6 |
| [frontend/server/handlers/plan.js](frontend/server/handlers/plan.js) | Pass `closerAlias`; force-insert on final turn | +12 |
| [frontend/server/sessions.js](frontend/server/sessions.js) | Add `closer: null` to initial state | +1 |
| [frontend/server/session-persistence.js](frontend/server/session-persistence.js) | Persist `closer` field | +1 |

No new files. No new modules. Mirrors the `cli.js` pattern exactly so the two entrypoints stay in lockstep.

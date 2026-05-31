# Plan — Meeting-type arcs + thread-follow for 1:1 prompts

## Context

Reviewing run `logs/2026_May14_22-38-37a3bfa9` (Carl, Mid Web Designer, "Growth & career plan"), the question sequence felt like a generic 1:1 grab-bag rather than a real career conversation:

`Energy → Last 2 weeks → Team dynamics → 18-month vision → Role expectations → Feedback received → Skill development → Support needed`

Two underlying problems in the prompts:

1. **No meeting-type arc.** `generate-questions.md` builds the bank by *axis coverage* ("2–3 questions per axis"); `plan-turn.md` has a generic early/mid/late "Arc position" rule. Neither layer encodes the conversational shape a "Growth & career plan" needs: **Anchor → Aspiration → Gap → Investment → Commitment**.
2. **No thread-follow.** At turn 4, Carl answered the 18-month question with "head of department?" — a wide-open aspirational thread, the centrepiece of the meeting. The planner noted the signal in its `note` field then served the next pre-baked queue item (`q_role_expectations` — "What parts of your role feel unclear or misaligned right now?"). The existing rules ("Prefer keeping… churn is worse than imperfect question") are actively *biasing the planner away from drilling on threads*.

A third tone problem rides on these: question phrasing is HR-form ("How has recent feedback you've received landed with you?") rather than how a real manager talks. The `<question_craft>` sharp/weak table is good but generic — Growth & career plan needs aspirational/forward register, Performance & feedback needs adult-to-adult directness, Something feels off needs observation-first/opt-in, Bi-weekly needs casual fluency.

Scope confirmed with user: fix all four meeting types in one pass; arc data lives in a data file injected into prompts.

## Approach

Introduce a per-meeting-type **arc + tone register** as runtime data, then update both prompts that consume it (bank generation, turn planning) to be arc-aware and thread-aware.

### 1. New file: [src/meeting-arcs.js](src/meeting-arcs.js)

CommonJS module (matches existing convention — see [src/meeting-types.js](src/meeting-types.js), [src/axes.js](src/axes.js)). JSON-stringified into prompts at substitution time, so "data not inline" is satisfied without inventing new file plumbing.

Exports `MEETING_ARCS` keyed by the human label from `MEETING_TYPES`, plus `getArc(meetingType)` (resolves by label or slug, throws on miss).

Per-meeting entry shape:
```js
{
  slug,
  tone_register,        // string
  arc: [{ id, label, intent, target_questions }],
  anti_patterns: []     // strings — meeting-specific things not to do
}
```

### 2. Drafted arcs (concrete, all four meeting types)

**Bi-weekly check-in** — casual, fluent, peer-tempered. Light surface; willingness to go deeper if something opens.
1. `pulse` (1q) — how the last stretch is sitting
2. `friction` (2q) — where things are snagging
3. `momentum` (2q) — what's moving, what's stuck
4. `lift` (1q closer) — what would make the next two weeks lighter or sharper

**Performance & feedback** — direct, adult-to-adult. No softening-as-cushioning.
1. `self_read` (1q) — their read before manager view lands
2. `evidence` (1–2q) — anchor on observable moments
3. `gap_naming` (1–2q) — name the specific gap or pattern
4. `cause` (1–2q) — capability, clarity, context, or capacity
5. `commit` (1q closer) — concrete behavioural change with a date

**Growth & career plan** — aspirational, forward-leaning, generative. Employee is protagonist; manager is coach.
1. `anchor` (1–2q) — where they are now: what's solid, what's stretching
2. `aspiration` (2q) — where they want to go, concretely
3. `gap` (1–2q) — what's between here and there
4. `investment` (1–2q) — what has to change (from them, from you, from the org)
5. `commitment` (1q closer) — one concrete next move

**Something feels off** — observation-first, opt-in, low-pressure. No diagnosis, no leading.
1. `landing` (1q) — no-pressure arrival
2. `observation` (1–2q) — name what was observed; hand them the mic
3. `underneath` (2q) — if the door opens, follow it
4. `support` (1q closer) — what would help, if anything

### 3. Prompt edits — [prompts/generate-questions.md](prompts/generate-questions.md)

New placeholders: `{{MEETING_ARC_JSON}}`, `{{TONE_REGISTER}}`, `{{ANTI_PATTERNS_JSON}}`.

**Insert new `<meeting_arc>` section** before `<axis_coverage>`. It states the arc, the tone register, the anti-patterns, requires a `stage` field per question, instructs distribution by `target_questions`, and explicitly says the tone register **overrides** `<question_craft>` rewrites where they conflict (e.g. anchor-stage Growth questions shouldn't sound diagnostic).

**Edit `<output_contract>`**: add `stage` to each question's required fields and to the JSON example. `stage` value must be one of the arc stage `id`s.

**Replace `<axis_coverage>`**: drop the flat "2–3 per axis" split. Axis coverage falls out of the arc; the arc is primary. Each stage has its own natural axis tilt.

**Edit `<rules>`**: add "Every question must have a `stage` matching one of the meeting arc's stage ids."

### 4. Prompt edits — [prompts/plan-turn.md](prompts/plan-turn.md)

New placeholders: `{{MEETING_ARC_JSON}}`, `{{TONE_REGISTER}}`, `{{CURRENT_STAGE_HINT}}` (server-derived from `lastQuestion.stage`).

**Add new `<thread_follow_rule>` section** immediately after `<persona>`, before `<assessment_rules>`. This is the central fix:

- Fires when the last answer contains a **concrete thread** (named role, project, aspiration, concern, person, or specific decision) AND is not a skip/evasion/"fine"/"ok"/pivot.
- When fired: the **first** item in `new_queue` MUST be a follow-on that names the specific thing the employee said, in their words, with one focused follow-up. `ref_alias: null`. The arc's pre-planned next item moves to position 2+.
- Includes worked positive examples ("head of department?" → "Head of department — what is it about that role that pulls you? Is it the scope, the people, the title, or something else?") and negative examples ("fine", "ok" → no thread, arc proceeds).
- Explicitly: keep-prefer does NOT apply when a thread exists.

**Replace `<planning_rules>` item 6 (`Arc position`)** with a meeting-arc rule:
- Inject the arc JSON and tone register.
- State the current stage from `{{CURRENT_STAGE_HINT}}`.
- After dedup + thread-follow, the queue progresses through stages in arc order; skipping is allowed if covered unprompted; doubling is allowed when a thread justifies.
- Tone register overrides `<question_craft>` where they conflict.
- Final-turn closer requirement stays, in the final-stage register.

**Edit `<planning_rules>` item 2 ("Prefer keeping")**: add cross-reference — exception applies when `<thread_follow_rule>` fires.

### 5. Code changes

**[src/question-generator.js](src/question-generator.js)**
- `require("./meeting-arcs")`.
- In `buildMessages` (line ~53): look up arc, inject three new placeholders.
- Add `stage` to `RESPONSE_SCHEMA.properties.questions.items.properties` and to `required` (line ~26).
- In the save loop (line ~136): persist `stage: q.stage` on saved question objects.

**[src/questions.js](src/questions.js)**
- Add `"stage"` to `FIELD_ORDER` (after `purpose`). YAML parser is flat — no other change.

**[src/queue-manager.js](src/queue-manager.js)**
- `require("./meeting-arcs")`.
- In `buildMessages` (line ~61): inject arc placeholders and `{{CURRENT_STAGE_HINT}}` from `lastQuestion.stage`.
- Add `stage: { type: ["string", "null"] }` to `QUEUE_ITEM` schema (line ~29). Nullable so a thread-follow can omit it.
- In `reconcileQueue` (line ~191): propagate `stage` onto saved/carried items. For unchanged carries via `ref`, `ref.stage` already exists. For new/reworded, `stage: item.stage ?? ref?.stage ?? null`.
- In `isUnchanged` (line ~177): ignore `stage` differences so a re-tag doesn't force churn.

### 6. Data backfill

- **[questions/_intro/*/](questions/_intro/)** — tag each of the 3-per-meeting-type intro YAMLs with `stage`. Example: [q_intro_growth_direction.yaml](questions/_intro/growth_career_plan/q_intro_growth_direction.yaml) → `stage: aspiration`.
- **[questions/_openers.json](questions/_openers.json)** — tag each opener with the appropriate first-stage id per meeting type (or `anchor`-equivalent for "all"-meeting openers).
- **[questions/_seed/*](questions/_seed/)** — tag fallback seeds with best-fit stage. Approximate is OK; these are the degraded path.

### 7. Untouched (deliberate)

- **[prompts/generate-focus-points.md](prompts/generate-focus-points.md)** — focus points are *topic selection*; arcs are *flow*. Orthogonal by design. Conflating them would couple two usefully separate concerns.
- **[prompts/preparation.md](prompts/preparation.md)** — optional one-line tone hint in `<tone_rules>` if we want the `openingQuestion` to land in the first-stage register, but the brief is one-shot and the prompt already personalises by meeting type. Defer unless we see brief openers mismatching tone register.

## Critical files

- [src/meeting-arcs.js](src/meeting-arcs.js) *(new)*
- [prompts/generate-questions.md](prompts/generate-questions.md)
- [prompts/plan-turn.md](prompts/plan-turn.md)
- [src/question-generator.js](src/question-generator.js)
- [src/queue-manager.js](src/queue-manager.js)
- [src/questions.js](src/questions.js)
- [questions/_intro/](questions/_intro/) (12 YAMLs)
- [questions/_openers.json](questions/_openers.json)
- [questions/_seed/](questions/_seed/) (8 YAMLs)

## Verification

**Repro the bug (current behaviour):** there's no existing planner A/B harness. [rerun-eval.js](rerun-eval.js) only re-runs final eval; [probe-bank-ab.js](probe-bank-ab.js) A/Bs bank generation only.

**New probe script: `probe-plan-turn-ab.js`** (model on [probe-bank-ab.js](probe-bank-ab.js)). Loads turn-4 inputs from [logs/2026_May14_22-38-37a3bfa9/04-dynamic-answers/04-turn.json](logs/2026_May14_22-38-37a3bfa9/04-dynamic-answers/04-turn.json), swaps `plan-turn.md` between current and modified, prints both `new_queue[0]` side-by-side.

**Pass criteria:**
- Variant B's `new_queue[0]` names "head of department" verbatim and probes it (scope / people / timeline / appeal).
- Variant A returns `q_role_expectations` as it does today (control).

**Bank-level check:** re-run [probe-bank-ab.js](probe-bank-ab.js) against a Growth-and-career scenario; assert every generated question has a `stage` field, all 5 arc stages are represented, opener tagged `anchor`, closer tagged `commitment`.

**Full-pipeline scenario:** [scenarios/](scenarios/) contains existing scenarios. Run a scripted Growth-and-career session where turn 4's answer is "head of department?"; assert turn 5's question names that phrase and drills on it. Repeat for one scenario per meeting type with a thread-bearing answer.

## Sequencing

1. Write [src/meeting-arcs.js](src/meeting-arcs.js) — all four arcs + tone registers + anti-patterns.
2. Backfill `stage` into intros, openers, seeds. Add `"stage"` to `FIELD_ORDER` in [src/questions.js](src/questions.js).
3. Update [prompts/generate-questions.md](prompts/generate-questions.md) + schema/placeholders in [src/question-generator.js](src/question-generator.js).
4. Run [probe-bank-ab.js](probe-bank-ab.js) — confirm bank emits `stage` and respects arc tilt.
5. Update [prompts/plan-turn.md](prompts/plan-turn.md) + schema/placeholders in [src/queue-manager.js](src/queue-manager.js).
6. Build `probe-plan-turn-ab.js`. Confirm thread-follow fires on the captured turn-4 inputs.
7. Run full-pipeline scenarios across all four meeting types; eyeball flow + tone.

# Phase 3 — Note-tag leak strip

**Part of:** [PLAN.md](plan.md) · **Status:** 🔨 built, awaiting product-owner walk

## Build note — the leak doesn't exist today (full trace changed the scope)
The plan assumed engine note-tags leak into an employee-facing / evaluation payload (based on the exploration). A full trace of the *tagged* field (`TranscriptEntry.note` = the planner's per-turn `assessment.note`, distinct from manager-captured `session.notes`) shows it reaches only:
- **Manager's live dashboard** (`rules-view.ts`) — intended; it *parses* `[SKIP]`/`[SHALLOW]` into friendly status.
- **Decision logic** (`reviewer.ts` read-quality, `review-core.ts`, `delta-gates.ts`) — these **need** the raw `[SHALLOW]` tag as a boolean signal and do **not** echo the note text to output. Stripping before them would break them.
- **Internal dev artifacts** (`review-html.ts` static log pages, CLI console) — tags are *useful* there.
- **Web/customer evaluation input** (`evaluation-inputs.ts`) — **does not include the note at all.**

So there is **no employee-facing or email leak to fix**, and adding an unused `stripEngineTags` helper would be speculative code (violates CLAUDE.md §2). The genuinely useful, non-speculative deliverable is to **lock the current-safe state**: a guard test + a code comment ensuring the customer-facing evaluation input never starts carrying the tagged note. If a real export/email path for the note is added later, revisit with an actual sanitizer at that boundary.

## What was actually built
- One-line intent comment in [evaluation-inputs.ts](../../../backend/api/services/sessions/evaluation-inputs.ts) documenting why `t.note` is deliberately excluded from the transcript projection.
- Guard test [evaluation-inputs.test.ts](../../../backend/api/services/sessions/evaluation-inputs.test.ts): a session with a `[SHALLOW]`-tagged note must produce an evaluation input containing no tag / no note prose / no `note` field.

## Goal
Engine-only bracket tags in `assessment.note` (`[SHALLOW]`, `[THREAD-DEFERRED]`, `[COMMITMENT]`, `[NO-REPORT-SIGNAL]`, `[BUDGET-STARVED]`, `[WELLBEING-CAP]`, `[SKIP]`, etc.) never appear in a payload a person reads as prose — they're stripped at the presentation/export boundary, *after* the decision logic that legitimately parses them has already run.

## The constraint that shapes this phase
Some tags are **actively parsed** downstream and must NOT be stripped before that logic runs:
- `[SHALLOW]` → zeros deltas ([delta-gates.ts](../../../backend/engine/delta-gates.ts) `noteMarksShallow`, ~L50).
- `[SHALLOW]` / `[SKIP]` → surfaced as manager-readable status in [rules-view.ts](../../../backend/api/services/sessions/rules-view.ts) (~L42–61).

So we do **not** strip at the source. We add a single sanitizer and apply it only at the leak boundaries — where the note becomes prose input to another model or an export.

## Where the note leaks (from exploration)
- **Evaluation briefing input** — `formatNotesForEvaluation()` ([session-streams.ts](../../../backend/api/services/sessions/session-streams.ts) ~L182 → [evaluation-inputs.ts](../../../backend/api/services/sessions/evaluation-inputs.ts)). The raw note (tags and all) becomes part of the text handed to the reviewer model. **Primary leak — fix here.**
- **Transcript JSON export** — if a manager exports session data, `TranscriptEntry.note` carries tags. Secondary; strip on export too.
- Live SSE stream to the manager's own dashboard and rules-view are the manager's working surface and *rely* on the tags — leave those as-is (they are not employee-facing prose).

## Changes
- Add a small pure helper `stripEngineTags(note: string): string` (co-located util in the engine, mirrored test) — removes leading/inline `[UPPER_SNAKE-OR-DASH]` bracket tokens and tidies leftover whitespace, leaving the human sentence.
- Apply it in `formatNotesForEvaluation()` before the note text enters the evaluation input.
- Apply it on the transcript-export path for `note`.
- Do **not** touch the source note, the SSE stream, delta-gates, or rules-view.

## Not in this phase
- No change to what tags the prompt emits (they're load-bearing for the runner).
- No change to the manager's live dashboard rendering.

## Done when
- [ ] `stripEngineTags` exists with a mirrored unit test (covers: leading tag, multiple tags, tag mid-sentence, no tag = unchanged, tag-only note = empty/graceful).
- [ ] Evaluation-input formatting and transcript export both run the note through it.
- [ ] Decision logic still sees raw tags — `delta-gates` shallow damping and `rules-view` status still work (regression test / manual check).
- [ ] `npm test` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. This is the last phase — green light closes the plan out.

1. **Unit tests pass** — run `npm test`; the `stripEngineTags` tests are green, and the delta-gates/shallow test still passes (proves we didn't strip too early). ❌ Not OK if shallow damping breaks.
2. **Clean evaluation prose** — replay a fixture scenario that produces a `[SHALLOW]` or `[THREAD-DEFERRED]` note (free), then look at the evaluation briefing input for that run. The tag should be **gone** from the prose; the human sentence remains. ❌ Not OK if `[SHALLOW]` etc. shows up in the briefing text.
3. **Manager surface unchanged** — the live session/rules view still shows its "Shallow answer" / "Planner skipped" status as before (that path reads the raw tag and is intentionally left alone). ❌ Not OK if the manager's status hints disappear.

---
name: reviewrun
description: "Load a pipeline run log directory, digest each stage, and prime an improvement discussion. Trigger when the user says /reviewrun, 'review this run', 'look at run', or passes a path under logs/<month>/<run-id>. Reads all stage inputs/prompts/responses plus transcript and axis-state, surfaces what happened, where it weakened, and seeds 2-3 sharpening questions. Use to start refinement conversations, not to write code."
argument-hint: "<absolute-path-to-run-dir>"
user-invocable: true
---

Loads a single run for review. Output primes discussion — does not propose fixes unprompted.

**Canonical spec:** [`plans/reviewrun-output-spec.md`](../../plans/reviewrun-output-spec.md) (FX-43). Master audit IDs: [`plans/log-fix-audit.md`](../../plans/log-fix-audit.md).

## Inputs

One arg: absolute path to a run directory (e.g. `C:\Users\User\Documents\Sero\seroengine\logs\may\2026_May01_07-47-cdfe`).

If arg missing: ask which run. Do not guess.

## Expected layout

```
<run-dir>/
  axis-state.json            # run-wide state
  transcript.json            # full transcript
  01-focus-points/
    inputs.json
    prompt.md
    response.json
  03-question-bank/...
  04-dynamic-answers/...
  05-evaluation/...
  notes.md                   # optional, user-authored critique
```

Stage dirs may vary. Discover by listing the run dir. Treat any `NN-*` subdir as a stage.

## Procedure

1. **List run dir.** Capture stage dirs in order, plus top-level files.
2. **Read in parallel** (single message, multi tool calls):
   - `axis-state.json`
   - `transcript.json`
   - each stage's `inputs.json`, `prompt.md`, `response.json`
   - `notes.md` if present
3. **Payload dump.** For each stage in order, emit verbatim:

   ````
   ### <stage-name>
   **inputs.json:**
   ```json
   <full verbatim contents>
   ```
   **prompt.md:**
   ```
   <full verbatim contents>
   ```
   ````

   No summarization. No truncation unless a file > 100KB (then note size and dump head 2KB + tail 2KB). If a stage file is missing, note absence and continue.
4. **STOP. Wait for user ack.** After dump, output exactly:

   `Payload dumped. Reply 'go' (context looks complete) or call out gaps before I continue.`

   Do not emit digest, signals, hypotheses, or questions until user replies. If user calls out gaps, incorporate them into hypotheses at step 6.
5. **Digest.** For each stage: one line — what it consumed, what it produced, notable signal (length, refusal, low confidence, eval score, etc).
6. **Cross-stage signals.** Where did quality drop? Where did inputs not match upstream outputs? Eval verdict vs other stages.
7. **User notes.** If `notes.md` exists:
   - Parse into structured form: `{section, time, text}[]`. Each `## <Section>` heading is a group; each `- [HH:MM:SS] <text>` is a note.
   - Map each section to most-likely stage dir (case-insensitive substring match against the discovered stage dirs from step 1):
     - "Focus points" / "Focus" → first dir matching `*focus*`
     - "Preparation" / "Prep" → first dir matching `*prep*`
     - "Questioning" / "Questions" → first dir matching `*question*` or `*answer*`
     - Anything else → try substring match on section name vs stage dir name. If no match, bucket under `(unmapped)`.
   - For each note, hold a reference to the matched stage's `prompt.md` + `response.json` so the Fix line can quote/target a specific prompt rule or output.
   - If `notes.md` is absent, skip this step entirely — the `## User notes` section in the output template is omitted.
8. **Audit crosswalk.** Read [`plans/log-fix-audit.md`](../../plans/log-fix-audit.md) (grep by symptom if needed). For each signal, hypothesis, and note-fix that matches a known issue, append `` `→ FX-NN` `` (or `D1`, `C1`, `LF-1`, etc.). Novel gaps → `` `→ (new)` ``. Emit the `## Audit crosswalk` table in phase 2 (see spec). If a ✅ DONE item clearly regressed in this run, mark **regression** in the Match column.
9. **Output template** (below). Stop after. Wait for user to pick thread.

## Output template

*(Phase 2 — emitted only after user ack on payload dump in step 4.)*

```
# Run: <run-id>

## Stages
- 01-focus-points: <one-line digest>
- 03-question-bank: <one-line digest>
- 04-dynamic-answers: <one-line digest>
- 05-evaluation: <one-line digest + verdict if present>

## User notes
*(Omit this entire section if `notes.md` is absent.)*

### <Stage display name> — <stage-dir>
> [HH:MM:SS] <note text verbatim>
**Fix:** <one concrete change to that stage's prompt/inputs/logic that would address this note. Quote the relevant prompt line if applicable.>

> [HH:MM:SS] <next note>
**Fix:** <...>

### <Next stage> — <stage-dir>
> [HH:MM:SS] <note>
**Fix:** <...>

### (unmapped)
> [HH:MM:SS] <note>
**Fix:** <best-effort suggestion; flag that stage mapping is uncertain>

## Signals I noticed
- <signal 1>
- <signal 2>
- <signal 3>

## Hypotheses
1. <where the run weakened, with stage reference> `→ FX-NN` or `→ (new)`
2. <...>

## Audit crosswalk
| ID | Status | Match |
|---|---|---|
| <FX-NN or D1 etc.> | ✅ / 🔴 / 📋 | <one line — why this run touched it; say **regression** if DONE but broken> |

*(Only rows with a match. Full table: `plans/log-fix-audit.md`.)*

## Questions to sharpen next iteration
1. <specific, answerable question — cite turn/alias/eval field when possible>
2. <...>
3. <optional; max 3 total>
```

**Fix-line rules:**
- One actionable change. Not "consider X" — say "change X to Y".
- If note quotes specific output text, target the prompt rule or default that produced it.
- If note is praise ("nice question", "all this is good"), replace `**Fix:**` with `**Keep:** <what to preserve / lock in>`.
- Keep each Fix to 1–2 lines. Caveman mode → fragments fine.
- Append audit tag when matched: `` `→ FX-NN` `` or `` `→ (new)` ``.

**Sharpening questions rules:**
- 2 required, 3 max. At least one must reference a specific turn, question alias, or eval field.
- Questions only — no embedded fixes.

## Rules

- **No code edits.** This skill is read-only and conversational.
- **No fixes proposed unsolicited** — *except* per-note fixes when `notes.md` exists. Notes are an explicit solicitation. Hypotheses + questions in other sections stay fix-free; user drives next step there.
- **Payload dump is mandatory.** Never skip step 3 even if user seems impatient. Prompt tuning on broken context = wasted work.
- **Gate is hard.** No hypotheses/questions until user replies after dump. If user says "skip dump" — refuse, explain why, dump anyway.
- **Quote, don't summarize, when wording matters** — eval verdicts, refusal text, user notes.
- **Caveman mode**: if active, keep digest fragments terse. Section headers stay normal.
- **Stage names vary**: don't hardcode `01-focus-points` etc. Walk the dir.
- **Large files**: if `transcript.json` > 50KB, read head/tail or specific keys, don't blast context.
- **Missing files**: note absence, continue. Don't fail run review for one missing stage.

## When NOT to use

- User wants to *do* the next iteration → drop skill, just discuss.
- User wants PR review → use built-in `review`.
- User wants to compare two runs → still useful, but invoke twice and diff manually.

---
name: reviewrun
description: "Load a pipeline run log directory, digest each stage, and prime an improvement discussion. Trigger when the user says /reviewrun, 'review this run', 'look at run', or passes a path under logs/<month>/<run-id>. Reads all stage inputs/prompts/responses plus transcript and axis-state, surfaces what happened, where it weakened, and seeds 2-3 sharpening questions. Use to start refinement conversations, not to write code."
argument-hint: "<absolute-path-to-run-dir>"
user-invocable: true
---

Loads a single run for review. Output primes discussion — does not propose fixes unprompted.

**Canonical spec:** [`docs/reference/reviewrun-output-spec.md`](../../../docs/reference/reviewrun-output-spec.md) (FX-43). Master audit IDs: [`docs/archive/plans/log-fix-audit.md`](../../../docs/archive/plans/log-fix-audit.md).

## Inputs

One arg: absolute path to a run directory (e.g. `C:\Users\User\Documents\Sero\serolocal\logs\may\2026_May01_07-47-cdfe`).

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
   - **last row of** `docs/reference/prompt-review-ledger.md` (for the scorecard's direction arrows). If the file or a prior row is absent, arrows show `—` (no baseline yet).
3. **Run context, then payload dump.** First emit the **Run context block** — filled from the
   run dir itself (never ask the user to paste it): [`resources/run-context-template.md`](resources/run-context-template.md).
   Then, for each stage in order, emit verbatim:

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

   Do not emit the scorecard, digest, signals, hypotheses, or questions until user replies. If user calls out gaps, incorporate them into the Hypotheses section.
5. **Scorecard first.** Build the three-lens scorecard (see `## Scorecard — Understood / Filtered / Shown` below): one mark + one-line evidence per lens, plus direction arrows vs. the ledger's last row. Emit it at the **top** of phase-2 output, above `## Stages`. Disk-only — derive every mark from files already in the run dir; **never** run `gate.js`, `eval.js`, a replay, or any paid path to fill it.
6. **Digest.** For each stage: one line — what it consumed, what it produced, notable signal (length, refusal, low confidence, eval score, etc).
7. **Cross-stage signals.** Where did quality drop? Where did inputs not match upstream outputs? Eval verdict vs other stages.
8. **User notes.** If `notes.md` exists:
   - Parse into structured form: `{section, time, text}[]`. Each `## <Section>` heading is a group; each `- [HH:MM:SS] <text>` is a note.
   - Map each section to most-likely stage dir (case-insensitive substring match against the discovered stage dirs from step 1):
     - "Focus points" / "Focus" → first dir matching `*focus*`
     - "Preparation" / "Prep" → first dir matching `*prep*`
     - "Questioning" / "Questions" → first dir matching `*question*` or `*answer*`
     - Anything else → try substring match on section name vs stage dir name. If no match, bucket under `(unmapped)`.
   - For each note, hold a reference to the matched stage's `prompt.md` + `response.json` so the Fix line can quote/target a specific prompt rule or output.
   - If `notes.md` is absent, skip this step entirely — the `## User notes` section in the output template is omitted.
9. **Audit crosswalk.** Read [`docs/archive/plans/log-fix-audit.md`](../../../docs/archive/plans/log-fix-audit.md) (grep by symptom if needed). For each signal, hypothesis, and note-fix that matches a known issue, append `` `→ FX-NN` `` (or `D1`, `C1`, `LF-1`, etc.). Novel gaps → `` `→ (new)` ``. Emit the `## Audit crosswalk` table in phase 2 (see spec). If a ✅ DONE item clearly regressed in this run, mark **regression** in the Match column.
10. **Output template** (below). Stop after. Wait for user to pick thread.
11. **Append ledger row.** After the template, append one row to `docs/reference/prompt-review-ledger.md`: `date · run-id · engine fingerprint · 🟦 · 🟨 · 🟩 · short note`, matching the scorecard marks. This is the only file the skill writes — one row per review, never rewrite prior rows.

## Scorecard — Understood / Filtered / Shown

The scannable verdict at the **top** of phase-2 output. Three lenses, each rolling up signals **already in the run dir** — no new run, no paid path. One mark, one-line evidence (quote the run), one direction arrow vs. the ledger's last row.

**Marks:** ✅ solid · ⚠️ watch · 🔴 broken.  **Arrows** (vs. last review): ↑ better · → same · ↓ worse · — no baseline yet.

| Lens | Reads from | Rolls up (all free, from disk) |
|---|---|---|
| 🟦 **Understood** | `01-focus-points/`, `*prep*/` | focus points match manager notes / role / meeting type; role-aware; grounded. Free checks: focus-arc leak, focus-shape, wrong-meeting-type |
| 🟨 **Filtered** | `03-question-bank/`, `04-*answers/`, `transcript.json` | right questions asked, dupes + forbidden cut; delta gates capped the right turns (shallow / misalignment / recurring-gap); no over-inference; question integrity |
| 🟩 **Shown** | `05-evaluation/final.json`, `transcript.json` | briefing grounded + evidence-cited; next actions concrete; **no private-note leak**; no overdiagnosis-on-thin; schema valid |

The 4 health axes (wellbeing / engagement / clarity / growth) score the **employee**, not prompt quality — keep them in the digest, **out** of the scorecard.

**Ledger:** `docs/reference/prompt-review-ledger.md` — append-only, one row per review. Read the last row for the arrows (step 2), append this run's row after the template (step 11). If absent or empty, arrows show `—`.

## Output template

*(Phase 2 — emitted only after user ack on payload dump in step 4.)*

```
# Run: <run-id>

## Scorecard — Understood / Filtered / Shown
run <run-id> · <meeting-type> · <name> (<role · seniority>) · engine <fingerprint>

| Lens | Mark | vs last | Why |
|------|------|---------|-----|
| 🟦 Understood | <✅/⚠️/🔴> | <↑/→/↓/—> | <one-line evidence, quoted from the run> |
| 🟨 Filtered   | <✅/⚠️/🔴> | <↑/→/↓/—> | <one-line evidence> |
| 🟩 Shown      | <✅/⚠️/🔴> | <↑/→/↓/—> | <one-line evidence> |

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

- **No code edits.** This skill is read-only and conversational. The one write it makes: appending a single row to the trend ledger (step 11) — never anything else.
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

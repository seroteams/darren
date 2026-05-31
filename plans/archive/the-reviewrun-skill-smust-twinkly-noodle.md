# Plan: reviewrun skill — surface user notes + per-note fix suggestions
**Version:** v1

## Caveman version
Skill already reads `notes.md` but only echoes summary verbatim. Make it:
1. Parse notes by section + timestamp.
2. Show them in clean grouped format (per stage, quoted, with timestamp).
3. Per note, propose one concrete fix tied to the matching stage's prompt/inputs.

Fixes only generated when notes exist. No notes = behave like today (hypotheses + questions, no unsolicited fixes).

## Changelog
- v1: Initial plan

---

## Context

Current `reviewrun` skill ([SKILL.md](.claude/skills/reviewrun/SKILL.md)) reads `notes.md` if present and emits a single `## User notes` block of verbatim/near-verbatim summary. User wants more: notes shown in a **scannable per-stage format**, and a **fix suggestion attached to each note**.

This is a deliberate carve-out from the skill's existing "no unsolicited fixes" rule — fixes here are *solicited by the presence of notes*. If there is no `notes.md`, skill stays read-only/conversational as today.

Notes.md format (observed in `logs/may/*/notes.md`):
```
# Notes — <run-id>
<Persona line>

## <Section>
- [HH:MM:SS] <note text>
- [HH:MM:SS] <note text>

## <Section>
- [HH:MM:SS] <note text>
```

Section names seen so far: `Focus points`, `Preparation`, `Questioning`. These map loosely to stage dirs (`01-focus-points`, `01b-preparation`, `03-question-bank` / `04-dynamic-answers`).

## Changes to `.claude/skills/reviewrun/SKILL.md`

### 1. Procedure step 7 — replace "User notes" handling

Replace existing step 7 with a richer parse + render:

- Parse `notes.md` into structured form: `{section, time, text}[]`.
- Map each section to most-likely stage dir using fuzzy match on stage names:
  - "Focus points" → first dir matching `*focus*`
  - "Preparation" → first dir matching `*prep*`
  - "Questioning" → first dir matching `*question*` or `*answer*`
  - Unknown section → leave unmapped, group under `(unmapped)`
- For each note, hold ref to the matched stage's `prompt.md` + `response.json` so the fix suggestion can quote/reference it.

### 2. Output template — replace `## User notes` block

When `notes.md` exists, replace the single `## User notes` line with:

```
## User notes

### <Stage name> — <stage-dir>
> [HH:MM:SS] <note text verbatim>
**Fix:** <one concrete change to that stage's prompt/inputs/logic that would address this note. Quote the relevant prompt line if applicable.>

> [HH:MM:SS] <next note>
**Fix:** <...>

### <Next stage> — <stage-dir>
...

### (unmapped)
> [HH:MM:SS] <note>
**Fix:** <best-effort suggestion, flag that stage mapping is uncertain>
```

Rules for the **Fix** line:
- One actionable change. Not "consider X" — say "change X to Y".
- If note quotes specific output text ("we dont want them all selected here"), the fix targets the prompt rule or default that produced it.
- If note praises something ("nice question"), Fix becomes `**Keep:** <what to preserve / lock in>`.
- Keep each Fix to 1–2 lines. Caveman mode → fragments fine.

When `notes.md` absent → omit the whole `## User notes` section (today's behavior preserved).

### 3. Rules section — amend

Replace:
> **No fixes proposed unsolicited.** Hypotheses + questions only. User drives next step.

With:
> **No fixes proposed unsolicited** — *except* per-note fixes when `notes.md` exists. Notes are an explicit solicitation. Hypotheses + questions in other sections stay fix-free; user drives next step there.

### 4. Procedure step 8 — Output template ordering

Move `## User notes` to appear *before* `## Signals I noticed` so the user's own observations frame the rest of the review.

## Files touched

- [`.claude/skills/reviewrun/SKILL.md`](.claude/skills/reviewrun/SKILL.md) — only file modified.

No code changes elsewhere. No new files.

## Verification

1. Run `/reviewrun c:\Users\User\Documents\Sero\darren\logs\may\2026_May16_20-43-41ddc18f` (has 4 notes across 3 sections).
   - Confirm payload dump still happens first (gate intact).
   - After `go`, confirm output has `## User notes` grouped by stage with `> [time] text` + `**Fix:**` per note.
   - "Questioning" note about em-dashes → Fix should target prompt filter / output post-processing.
2. Run `/reviewrun` on a run **without** `notes.md` (any earlier April run).
   - Confirm `## User notes` section is omitted entirely.
   - Confirm no fixes proposed anywhere else (hypotheses + questions only).
3. Run on `2026_May17_12-28-c489ebec` (notes are pure praise: "all this is good", "fine").
   - Confirm Fix line becomes `**Keep:** …` for praise-only notes.

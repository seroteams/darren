> **Reference doc — active work lives in [SERO_BOARD.md](../../SERO_BOARD.md).**

# reviewrun output spec (FX-43)

**Version:** v2  
**Caveman version:** full  
**Skill:** [`.claude/skills/reviewrun/SKILL.md`](../../.claude/skills/reviewrun/SKILL.md)  
**Audit pointer:** [`plans/log-fix-audit.md`](../archives/plans/log-fix-audit.md) — master ID table

## Purpose

`/reviewrun` turns one session log into a **structured review artifact** that primes the next iteration. It is read-only: no code edits during the skill. Output is conversation fuel — user picks a thread, then decides fix vs defer vs new audit row.

## Two-phase workflow (hard gate)

| Phase | What | Stop condition |
|---|---|---|
| **1 — Payload dump** | Verbatim `inputs.json` + `prompt.md` per stage | Emit gate line; **wait for user `go`** |
| **2 — Digest** | Stages, notes+fixes, signals, hypotheses, audit tags, sharpening questions | Stop; user picks thread |

Never skip phase 1. Never emit hypotheses before user ack.

## Deliverable template (phase 2)

```markdown
# Run: <run-id>

## Scorecard — Understood / Filtered / Shown
run <run-id> · <meeting-type> · <name> (<role · seniority>) · engine <fingerprint>

| Lens | Mark | vs last | Why |
|------|------|---------|-----|
| 🟦 Understood | <✅/⚠️/🔴> | <↑/→/↓/—> | <one-line evidence quoted from the run> |
| 🟨 Filtered   | <✅/⚠️/🔴> | <↑/→/↓/—> | <one-line evidence> |
| 🟩 Shown      | <✅/⚠️/🔴> | <↑/→/↓/—> | <one-line evidence> |

## Stages
- <stage-dir>: <one-line digest — consumed → produced → notable signal>

## User notes
*(Omit entire section if no `notes.md`.)*

### <Stage display name> — <stage-dir>
> [HH:MM:SS] <note verbatim>
**Fix:** <concrete change> `→ FX-NN` *(or `→ (new)`)*

## Signals I noticed
- <cross-stage quality drop or mismatch, with stage ref> `→ FX-NN` when matched

## Hypotheses
1. <where run weakened + stage/turn ref> `→ FX-NN` or `→ (new)`

## Audit crosswalk
| ID | Status | Match |
|---|---|---|
| FX-NN | ✅/🔴/📋 | <one line why this run touched it> |

*(Omit rows with no match. Read [`log-fix-audit.md`](../archives/plans/log-fix-audit.md) for full table.)*

## Questions to sharpen next iteration
1. <specific, answerable in one sentence — cite turn or output when possible>
2. <...>
3. <optional third>
```

### Scorecard rollup (phase-2, top of output)

Three lenses, each a single mark + one-line evidence + direction arrow vs. the trend ledger's last row. **Disk-only** — every mark derives from files already in the run dir; the scorecard never triggers `gate.js`, `eval.js`, a replay, or any paid run.

| Lens | Reads from | Rolls up (free, from disk) |
|---|---|---|
| 🟦 Understood | `01-focus-points/`, `*prep*/` | focus matches notes / role / meeting type; role-aware; grounded; focus-arc + focus-shape + wrong-meeting-type clean |
| 🟨 Filtered | `03-question-bank/`, `04-*answers/`, `transcript.json` | right questions asked, dupes + forbidden cut; delta gates capped the right turns; no over-inference; question integrity |
| 🟩 Shown | `05-evaluation/final.json`, `transcript.json` | grounded + evidence-cited; concrete next actions; no private-note leak; no overdiagnosis-on-thin; schema valid |

Marks: ✅ solid · ⚠️ watch · 🔴 broken. Arrows: ↑ better · → same · ↓ worse · — no baseline. The 4 health axes score the **employee**, not the prompt — they stay in the digest, out of the scorecard.

**Trend ledger:** [`prompt-review-ledger.md`](prompt-review-ledger.md), append-only, one row per review. Skill reads the last row for arrows, then appends this run's row (`date · run-id · engine · 🟦 · 🟨 · 🟩 · note`). This is what makes "improving vs last time" visible across sessions.

### Fix / Keep line rules (when `notes.md` exists)

- One actionable change: "change X to Y", not "consider X".
- Praise → `**Keep:**` instead of `**Fix:**`.
- Append audit tag: `` `→ FX-NN` `` if issue matches audit row; `` `→ (new)` `` if novel.

### Sharpening questions rules

- **Count:** 2 required, 3 max.
- **Shape:** each question answerable in one sentence; at least one must cite a specific turn, question alias, or eval field.
- **No fixes** in this section — questions only.
- **Purpose:** decide next iteration scope (prompt tweak, runtime guard, UI, or new audit ID).

## Audit crosswalk (how to tag)

Before phase 2, skim [`log-fix-audit.md`](../archives/plans/log-fix-audit.md) (or grep symptom keywords). When a signal, hypothesis, or note-fix matches a row, tag it.

**Common symptom → ID shortcuts** (full table in audit):

| Symptom in run | Likely ID |
|---|---|
| Same-stage drill streak, planner ignores cap | FX-08, D5 |
| Opener tone / informal / wrong arc | FX-01–07, FX-52 |
| Prep opener harsh; listenFor paraphrase | C1–C6, FX-51 |
| Focus-point verbose / regenerate broken | FX-50, FX-53 |
| Briefing bullets repeat headline; weak brutal truth | F1–F3, FX-24–25 |
| Axis moved on "fine"/shallow; clarity miss | FX-26–29 |
| Placeholder `{{NAME}}` in output | A1–A3, FX-30 |
| UI typography / questioning size | FX-32, FX-39 |
| No dig-deeper control | FX-37 |
| Lexicon empty / scope / promote | LF-5, LF-6, FX-40, G1–G5 |
| Thread-follow never fires / arc starvation | D1–D2, FX-11–14 |

If match is partial, tag with `(partial)` in Audit crosswalk table. If already ✅ DONE in audit but regressed, say **regression** in Match column.

## How output shapes next iteration

1. User replies `go` after payload dump.
2. Agent emits phase-2 template.
3. User picks one thread: a note fix, a hypothesis, or a sharpening question.
4. Next work:
   - Known **🔴 OPEN** audit ID → implement that row; flip audit when landed.
   - **✅ DONE** but regressed → regression fix + replay scenario if exists.
   - **`→ (new)`** → add row to `log-fix-audit.md` before coding (user confirms scope).
5. Re-verify with same run path or `scripts/replay-scenario.js` / smoke as audit row specifies.

## Run layout (reference)

```
<run-dir>/
  axis-state.json
  transcript.json
  notes.md              # optional; enables User notes + Fix lines
  01-focus-points/
  01b-preparation/      # may vary
  03-question-bank/
  04-dynamic-answers/
  05-evaluation/
  06-lexicon-review/    # if present
```

Stage dirs vary — discover by listing; treat `NN-*` as stages.

## Entry points

- User: `/reviewrun <absolute-path-to-run-dir>`
- Debrief tip after session: `reviewrunTip` in run debrief UI / CLI (`src/run-debrief.js`)
- Typical path: `logs/<month>/<run-id>`

## Changelog

- v2 (2026-07-07): added the **Understood / Filtered / Shown** scorecard to the top of phase-2 output + the append-only trend ledger ([`prompt-review-ledger.md`](prompt-review-ledger.md)) for run-to-run direction arrows. Scorecard is disk-only — never triggers a paid run.
- v1 (2026-06-01): FX-43 — canonical spec; audit crosswalk + sharpening question rules; skill updated to match.

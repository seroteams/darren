# Prompt for Claude Code: No-Inference Discovery Audit (READ-ONLY)

Paste everything below into Claude Code at the repo root.

---

You are running a **read-only discovery audit** of the Sero codebase against the No-Inference Standard. Do not edit, create, move, or delete any file. Do not run anything that mutates state. Output is a single report: `audits/NO_INFERENCE_AUDIT.md` — the only file you may create.

## Context

Sero's published position (and legal defence) is: the engine never infers psychological states (disengagement, burnout, flight risk, reliability decline, feedback avoidance, quiet quitting) from manager notes or answer text. "Learning" means counting declared facts and countable events only. Research basis: observer text mostly measures the observer (Scullen 2000: 62%/53% rater variance); best-case classifier precision ~0.28 (Merhbene et al. 2022); inferred states are GDPR special-category data even when hidden (CJEU C-184/20); employment AI is EU AI Act Annex III high-risk (now applying 2 Dec 2027).

## The five rules to audit against

1. **NO_INFERRED_STATES** — nothing in prompts, code, schemas, or copy instructs or allows the model to detect/score/hint at an internal employee state.
2. **EVIDENCE_ANCHOR** — every generated claim/focus/risk/listen-for must be traceable to manager input text or a structured event.
3. **EVENT_ROUTING_ONLY** — routing/suggestion logic fires only from deterministic countable events, never from text classification of notes.
4. **NO_PERSISTED_TRAITS** — no stored field represents an inferred state, score, or trend about a person; only events and system actions persist.
5. **HUMAN_JUDGEMENT** — no output pre-judges the employee; system prepares the manager only.

## Where to look (in this order)

1. **Prompt files:** `prompts/generate-focus-points.md`, `prompts/generate-questions.md`, `prompts/plan-turn.md`, `prompts/final-evaluation.md`, and any other `prompts/**/*.md`. Audit instructions AND worked examples separately — examples teaching violations that the rules prohibit is our known #1 defect pattern.
2. **Contracts/schemas:** all Zod schemas and TypeScript types for engine input/output. Known suspects: `disengagementSignal` (required field — flag every definition, producer, and consumer), the four axes (wellbeing/engagement/clarity/growth) and anywhere axis scores are computed, stored, compared, or trended.
3. **Persistence:** `flow_sessions` and any table/JSONB writing per-person data. Flag any column or key that stores a state, score, level, or trend about the direct report (e.g. `concernLevel`, `engagementSignal` in `private_manager_data`). Distinguish: manager-authored opinion stored verbatim (acceptable, private) vs system-generated inference stored (violation).
4. **Routing/suggestion logic:** anything that suggests an arc, meeting type, focus, or chip. Classify each trigger as: deterministic event / manager-declared / text-inference. Text-inference = violation.
5. **Question YAMLs and fallback content:** `questions/**`, deterministic fallback outputs — scan for state-presupposing stems ("since you've been less engaged…").
6. **User-facing copy and emails:** any template that could surface state language to manager or employee.
7. **Logs/evals:** what gets logged per run — flag any logged inferred label.

Use grep candidates (case-insensitive, expand as you learn the vocabulary): `disengag`, `burnout`, `burn out`, `flight risk`, `quiet quit`, `checked out`, `unreliab`, `low ownership`, `avoiding feedback`, `morale`, `motivation level`, `engagement score`, `wellbeing score`, `infer`, `detect`, `signal`, `diagnos`, `psycholog`, `sentiment`. Grep hits are leads, not verdicts — read the surrounding code/prompt before classifying.

## Report format (`audits/NO_INFERENCE_AUDIT.md`)

1. **Verdict:** Pass / Pass-with-defects / Fail, one paragraph.
2. **Findings table:** | # | Rule broken | File:line | Evidence (verbatim quote, ≤2 lines) | Severity (Block / Fix / Note) | Blast radius (prompt-only / schema / persisted data / user-facing) |
3. **`disengagementSignal` trace:** every definition, write, and read of this field, as a list of file:line.
4. **Axis-score trace:** where axis values are generated, whether any evidence threshold exists, whether they persist or trend across sessions.
5. **Grey areas:** things that are defensible but worth a decision (e.g. manager-authored `concernLevel` stored privately). Do not fix; list with a one-line question each.
6. **Proposed fix order:** risk-sequenced — prompts/copy first, schema field renames second (flag `disengagementSignal` rename blast radius explicitly), persisted-data changes last, each behind its own approval gate.
7. **Counts:** files scanned, hits reviewed, findings by severity.

## Rules of engagement

- Read-only. No edits, no fixes, no refactors — findings only.
- Verbatim evidence for every finding; no paraphrased accusations.
- If a file listed above doesn't exist, say so and search for its equivalent rather than assuming.
- Separate fact / assumption / unknown in the verdict.
- UK English. No filler.

End with one line: the single highest-risk finding and which file to fix first.

# Engine contracts — the per-stage boundaries

**What this is:** one page that writes down what each pipeline stage takes in and
hands out — field names, types, allowed values, and where the code validates,
clamps, or falls back. This is documentation of what exists today (next-stage
Phase 1), not a redesign. When code and this doc disagree, fix the smaller gap
and update the other.

**Driver:** Carl · **Created:** 2026-06-16 · Source of truth for shapes stays the
`RESPONSE_SCHEMA` in each module; line numbers drift, so trust the named export.

Pipeline order: **Focus points → Preparation (role profile + lexicon) → Question
bank → per-answer Plan (axes) → Evaluation (briefing) → Run history / resume.**

---

## 1. Focus points — `src/generate.js`

**In:** session context (name, role, seniority, meeting type, notes) + the focus
catalogue (`focus-points.json`).

**Out (`RESPONSE_SCHEMA`):**
- `meeting_type`: string
- `focus_points`: array, **2–5 items**, each:
  - `id`: string
  - `label`: string
  - `reason`: string (post-processed to one sentence, ≤22 words)
  - `source`: enum `signal` | `best_practice`
  - `confidence`: enum `low` | `medium` | `high`

**Post-process:** each point is enriched from the catalogue with `type`,
`category` (`wellbeing` | `topic` | `competency`), and `known` (boolean).

**Boundary:** for relational arcs (bi-weekly, feels-off) a `competency` category
is a hard fail — `FOCUS_ARC_LEAK` gate (`backend/engine/golden-checks.ts`).

---

## 2. Role profile — `src/role-profile.js`

Cached per title+seniority; merged from a `*.overlay.json` sidecar at read time.

**Out (`RESPONSE_SCHEMA` → `profile`):**
- `summary`: string
- `role_confidence`: enum `low` | `medium` | `high`
- `known_challenges`: array **3–6**, each `{ text, category }` where category ∈
  `wellbeing` | `topic` | `competency`
- `recommended_question_themes`: array **3–6**, each `{ theme, why, category }`
- `terminology`: array ≤18, each `{ term, meaning, group }`
- `terminology_groups`: array ≤3, each `{ key, label }`
- `listen_for`: array ≤5 of strings
- `avoid`: array ≤4 of strings

**Stored doc wrapper:** `version`, `prompt_version`, `model`, `generated_at`,
`role_title_raw`, `role_slug`, `seniority_raw`, `seniority_key`, `role_family`,
`profile`.

**Fallback:** missing/unavailable profile renders `FALLBACK_BLOCK` —
`"(no role profile available — ground questions in the stated role title and
seniority)"`. Stated, never silent.

**Boundary:** for relational arcs, no `competency` item may render
(`runRoleProfileArcGate`); scaffolding terms (`role_profile`, `known_challenges`,
…) must not leak into briefing prose (`runRoleProfileVocabLeak`).

---

## 3. Lexicon — `src/lexicon/schema.js`

**Out (`RESPONSE_SCHEMA`):**
- `roleFamily`, `seniority`, `meetingType`: strings
- `suggestions`: array, each:
  - `type`: enum `prefer_term` | `prefer_phrase` | `avoid_phrase`
  - `value`: string
  - `reason`: string
  - `evidence`: string
  - `better_as`: string | null
  - `status`: enum `pending`

**Boundary:** a session must never serve another session's vocabulary
(`CROSS_SESSION_QUESTION_LEAK` + session bank).

---

## 4. Question bank — `src/questions.js`

Questions are YAML files; each carries:
- `alias`: string, must start `q_`, slugified (lowercase, ≤40 chars)
- `label`, `name`, `description`: strings
- `purpose`: string (read by planner; relational-arc gate rejects `competency`)
- `stage`: string (optional) — **must** be a phase id in the meeting type's arc
  (else it silently sorts last; caught offline by `runStageTagOrphanCheck` /
  `test-stage-tags.js`)
- `axis_effects`: object `{ axisId: signedInt }`
- `source`: string (optional)
- `grounding`: string quote (audited against the session record)

**Fallback:** a broken/leaky question gets a safe stem
(`FALLBACK_STEM`, `backend/engine/question-validator.ts`), logged not masked.

---

## 5. Axes (per-answer scoring) — `src/axes.js`

**Constants:** `AXIS_MIN = -10`, `AXIS_MAX = 10`, `SCORE_CLAMP = 10`,
`AXIS_IDS` (from `axes.json`).

**State per axis (`initState`):** `{ id, label, score, lastDelta, history[] }`.
`history` entries: `{ q: alias, delta: number, answer_excerpt: ≤140 chars }`.

**`applyDeltas`:** new score = clamp(proposed, -10, 10); appends a history entry.

**`serialize`:** `{ [axisId]: { score, history } }`.

**`validateAxisState`:** throws if state is missing/not-an-object, a score is
non-finite or out of `[-10, 10]`, or history isn't an array.

---

## 6. Evaluation / briefing — `src/reviewer.js`

**Out (`RESPONSE_SCHEMA`):**
- `headline`: string
- `summary_bullets`: array of strings
- `understanding_paragraph`: string
- `axes`: array of `{ id (∈ AXIS_IDS), score (int), meaning }`
- `brutal_truth_employee`: string
- `brutal_truth_manager`: string  ← **manager-only; never in shared output**
- `next_actions`: array of `{ when, action }`, `when` ∈ `today` | `this week` |
  `this month` | `next 1:1`
- `watch_for`: array of strings
- `engagement_read`: `{ level, evidence[], missing_evidence, recommended_action,
  watch_next }`, `level` ∈ `inconclusive` | `no_clear_concern` | `worth_checking`
  | `clear_concern`

**Post-process (`applyManagerBriefingPostProcess`):**
- axis scores re-applied from axis_state and clamped to `[-10, 10]`
- per-axis confidence fields added: `read_status` (`read` | `not_read`),
  `not_read_reason` (`no_history` | `zero_score` | `insufficient_signal`),
  `confidence` (`low` | `medium` | `high`), `evidence_basis` (`mixed` |
  `axis_state_only` | `transcript_quotes` | `concentrated_signal`)
- engagement guard forces `level: inconclusive` (and clears evidence/action/
  watch_next) when the read is partial or engagement/wellbeing barely registered

**Boundaries (enforced by `evals/trust-checks.ts` + `scripts/gate.js`):**
- `brutal_truth_manager` never appears in employee-facing/shared output
- no private-note judgment markers leak verbatim into employee-facing fields
- no flat HR labels ("flight risk", "doesn't care") unless quoting transcript
- no engine scaffolding vocab in prose

**Known hole (next-stage Phase 3):** no deterministic briefing-generation
fallback yet — if evaluation returns invalid JSON after retry there's no minimal
transcript-derived briefing. That's the Phase 3 build.

---

## 7. Run history / resume — `src/run-history.js`

**Stage inference (`inferStage`):**
`BRIEFING` if a briefing exists → `EVAL` if `turn ≥ totalBudget` → `QUESTIONING`
if `bankReady` → `BANK` if focus+prep exist → `PREPARATION` if focus exists →
else `FOCUS_POINTS`. (Mirrored in `frontend/server/sessions.js`.)

**Review dimensions (`REVIEW_DIM_KEYS`):** `role_aware`, `meeting_aware`,
`grounded`, `evidence`, `no_overreach`, `trust`, `next_actions`,
`briefing_usable`. Each mark ∈ `pass` | `fail` | unset.

**Overall verdict:** `keep` | `fix` | `block` | null.
**Review status (`reviewStatus`):** `none` (0 decided) | `partial` (1–7) |
`complete` (all 8).

---

## Cross-cutting rules

- **Schema validation everywhere:** every stage validates against its
  `RESPONSE_SCHEMA` before logging; a mismatch flags `SCHEMA_INVALID` — never
  silent.
- **No silent masking:** detect and flag; never hardcode text rewrites to hide a
  problem.
- **Deterministic fallbacks are stated:** `FALLBACK_STEM`, `FALLBACK_BLOCK`,
  closer-failure logging. The one missing fallback (briefing generation) is the
  next-stage Phase 3 deliverable.
- **Session boundary:** session files are single-user local; private manager
  notes live only in the session record and never reach any shared/email/admin
  surface (board rule 7).

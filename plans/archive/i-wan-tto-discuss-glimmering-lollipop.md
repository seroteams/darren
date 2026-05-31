# Plan — Sero Conversation Language Layer (narrow v1)

## Context

**Goal.** Stop Sero from generating generic, wrong-level, or wrong-meeting-type questions. The Growth & career plan arc says the meeting should be aspirational, forward-looking, and developmental, but generated questions still drift operational.

**Concrete failure** ([logs/2026_May16_11-11-c26cabf4](logs/2026_May16_11-11-c26cabf4) — Lead Web Designer, Growth meeting). What got generated:

- "How are you deciding what to delegate and what to keep on your plate?"
- "How does having the BAs decide what to delegate affect your role clarity?"
- "What specific steps can you take to ensure earlier involvement?"

For a Lead Web Designer Growth meeting, Sero should lean toward language like: *craft direction, named scope, stronger design leadership, next level of ownership, where do you want your judgment to carry more weight?*

**Approach.** Add a Conversation Language Layer — a per-role-family / per-seniority / per-meeting-type vocabulary file that is injected into the question-generation prompt. Two YAML stores:

1. **Canonical** (`lexicons/<role-family>/<seniority>.yaml`) — the only file that affects live prompts. Hand-curated; promotion is manual and out of scope for v1.
2. **Candidate** (`lexicons/_candidates/<role-family>/<seniority>.yaml`) — collects end-of-run accepted suggestions for future review. **Never loaded at generation time.**

A post-session reviewer LLM proposes wording updates; the manager accepts/rejects in the CLI; accepted suggestions land in the candidate file only.

**Out of scope for v1:** decay rules, promotion automation, silent YAML growth, UI, other prompts, broader role database, layered merging with meeting-arc vocabulary.

---

## Scope (v1)

- **Role family:** `design` only
- **Seniority:** `lead` only
- **Meeting type:** `growth` only
- **Prompt updated:** `prompts/generate-questions.md` only
- All other meeting types / roles / prompts: unchanged

---

## Files to create

### 1. `lexicons/design/lead.yaml` (canonical, live)

```yaml
role_family: design
seniority: lead

meeting_types:
  growth:
    prefer_terms:
      - craft
      - direction
      - scope
      - influence
      - critique
      - standards
      - visibility

    prefer_phrases:
      - "craft direction"
      - "named scope"
      - "stronger design leadership"
      - "next level of ownership"
      - "what would you want to be trusted with?"
      - "where do you want your judgment to carry more weight?"
      - "what kind of design work would make the next step feel real?"

    avoid_phrases:
      - phrase: "what steps can you take?"
        reason: "Too generic and procedural for a growth conversation."
        better_as: "What would make this next step feel real?"

      - phrase: "how will you delegate this?"
        reason: "Too operational unless delegation was explicitly raised by the employee."
        better_as: "What kind of scope would let you create more space for direction?"

      - phrase: "what is the process?"
        reason: "Makes the conversation feel like task management, not growth."
        better_as: "Where does the work need more of your judgment?"
```

### 2. `lexicons/_candidates/design/lead.yaml` (candidate, never injected)

Starts empty or with the same top-level structure (`role_family`, `seniority`, `meeting_types: {}`). First accepted candidate write creates/extends it.

### 3. `src/lexicon.js`

Public API:

```js
loadLexicon({ meetingType, role, seniority })
  // → { preferTerms, preferPhrases, avoidPhrases }
  // preferTerms:   string[]
  // preferPhrases: string[]
  // avoidPhrases:  Array<{ phrase, reason, better_as }>
```

Behaviour:
- Normalise `role` to `role_family` via a simple matcher: if role contains `designer`, `design`, `web designer`, `product designer`, or `ux` (case-insensitive), map to `design`. Otherwise return empty.
- Normalise `seniority` to lowercase. If `lead`, candidate file path is `lexicons/design/lead.yaml`.
- Load only from canonical: `lexicons/<role-family>/<seniority>.yaml`. Never read from `lexicons/_candidates/` here.
- If file missing → return empty arrays.
- If meeting type missing inside the file → return empty arrays.
- If any field missing → return empty array for that field.
- Never throw.

### 4. `prompts/review-session-for-lexicon.md`

New prompt for the post-session reviewer LLM. Strict JSON output:

```json
{
  "roleFamily": "design",
  "seniority": "lead",
  "meetingType": "growth",
  "suggestions": [
    {
      "type": "prefer_term | prefer_phrase | avoid_phrase",
      "value": "string",
      "reason": "string",
      "evidence": "short quote or explanation from the session",
      "better_as": "string or null",
      "status": "pending"
    }
  ]
}
```

Reviewer prompt rules:
- Cap suggestions at 8 total.
- Prefer phrases over single words.
- Reject generic business words (e.g. `support`, `clarity`, `alignment`) unless clearly role-specific.
- Do not suggest anything already present in the current canonical YAML (which is passed in).
- Do not suggest company-specific names unless they are clearly useful as avoid patterns.
- Mark every suggestion as `status: "pending"`.
- Never claim a suggestion is approved.

### 5. `src/lexicon-reviewer.js`

Reads a completed session folder and runs the reviewer + CLI approval flow.

Inputs read (all optional — skip step if none present):
- `transcript.json`
- `03-question-bank/response.json`
- `03-question-bank/prompt.md`
- `05-evaluation/response.json`
- Current canonical YAML (passed to the LLM so it can de-dupe)

Flow:
1. Call the reviewer LLM with the prompt above.
2. Render suggestions in the CLI (format below).
3. Read user input. Apply approval logic.
4. Write trace to `lexicons/_suggested/{sessionId}.json` (always, even if user typed `q` or `n`).
5. Write accepted suggestions to `lexicons/_candidates/design/lead.yaml`. **Never** write to `lexicons/design/lead.yaml`.

CLI rendering example:

```
Sero found 6 possible wording updates for Design Lead + Growth:

[1] Add preferred phrase: "craft direction"
[2] Add preferred phrase: "named scope"
[3] Add preferred phrase: "where do you want your judgment to carry more weight?"
[4] Avoid phrase: "what steps can you take?"
[5] Avoid phrase: "how will you delegate this?"
[6] Better replacement: "what would make this next step feel real?"

Approve as candidates except:
>
```

Input handling:
- `<Enter>` (empty input) → approve all as candidates
- Space-separated numbers (`2 5 6`) → remove those, save the rest as candidates
- `n` → save none as candidates (trace still written)
- `q` → skip the review step entirely (trace still written, no LLM call if user pre-skips; if reviewer already ran, save nothing)

Trace file shape (`lexicons/_suggested/{sessionId}.json`):

```json
{
  "sessionId": "2026_May16_11-11-c26cabf4",
  "timestamp": "2026-05-16T20:43:00Z",
  "roleFamily": "design",
  "seniority": "lead",
  "meetingType": "growth",
  "allSuggestions": [ /* full LLM output */ ],
  "acceptedAsCandidates": [ /* subset */ ],
  "rejected": [ /* subset */ ],
  "userInput": "<verbatim user input>"
}
```

---

## Files to modify

### 6. `prompts/generate-questions.md`

Add new block near the meeting-arc / tone rules section (best place: inside `<meeting_arc>` after the anti-patterns block, or as a sibling block immediately after `</meeting_arc>`):

```
<conversation_language>
Use this language when it fits naturally.

Preferred terms:
{{CONVERSATION_PREFER_TERMS}}

Preferred phrases:
{{CONVERSATION_PREFER_PHRASES}}

Avoid these patterns unless the employee used them first:
{{CONVERSATION_AVOID_PHRASES}}

This language layer biases question wording. It does not override the meeting type, note-classification rules, or question-quality rules.
</conversation_language>
```

### 7. `src/question-generator.js`

Update `buildMessages` ([src/question-generator.js:55-95](src/question-generator.js#L55-L95)):
- `require("./lexicon")` for `loadLexicon`.
- Call `loadLexicon({ meetingType, role, seniority })`.
- Render and substitute three placeholders:
  - `{{CONVERSATION_PREFER_TERMS}}` — comma-separated list, or `(none yet)` if empty.
  - `{{CONVERSATION_PREFER_PHRASES}}` — one phrase per line with `- "..."` prefix, or `(none yet)`.
  - `{{CONVERSATION_AVOID_PHRASES}}` — one per line, formatted:
    ```
    - "what steps can you take?" — Too generic and procedural for a growth conversation. Better: "What would make this next step feel real?"
    ```
    or `(none yet)` if empty.

### 8. Wire `lexicon-reviewer` into the CLI run

Find where a session completes (likely in [src/session.js](src/session.js) or [cli.js](cli.js)). After the existing final-evaluation step, invoke `lexicon-reviewer` with the session directory. Keep it gated to v1 scope: only run when `role` maps to `design` AND `seniority === "lead"` AND `meetingType === "growth"` (so other sessions are unaffected).

### 9. `package.json`

Add `yaml` dependency for YAML parse + serialize.

---

## Critical files

**Create:**
- `lexicons/design/lead.yaml`
- `lexicons/_candidates/design/lead.yaml`
- `src/lexicon.js`
- `src/lexicon-reviewer.js`
- `prompts/review-session-for-lexicon.md`

**Modify:**
- [prompts/generate-questions.md](prompts/generate-questions.md) — add `<conversation_language>` block
- [src/question-generator.js](src/question-generator.js) — call `loadLexicon`, substitute three placeholders
- [src/session.js](src/session.js) or [cli.js](cli.js) — invoke `lexicon-reviewer` after final evaluation (gated to design/lead/growth)
- `package.json` — add `yaml` dep

**Reused, no change:**
- `callAI`, `parseAIJson` from [src/ai-client.js](src/ai-client.js) for the reviewer LLM call
- `modelFor` from [src/models.js](src/models.js) — reviewer gets its own label
- `logStage` from [src/session.js](src/session.js) for the reviewer trace

---

## Acceptance criteria

| #    | Check |
|------|-------|
| AC1  | `lexicons/design/lead.yaml` exists with `prefer_terms`, `prefer_phrases`, `avoid_phrases` (with `reason` + `better_as`). |
| AC2  | `lexicons/_candidates/design/lead.yaml` exists or is created on first accepted-candidate write. |
| AC3  | `src/lexicon.js` loads canonical for `role: Lead Web Designer`, `seniority: lead`, `meetingType: growth`. |
| AC4  | `src/lexicon.js` never loads from `lexicons/_candidates/` during live question generation. |
| AC5  | `prompts/generate-questions.md` contains the `<conversation_language>` block. |
| AC6  | The question generator renders `{{CONVERSATION_PREFER_TERMS}}`, `{{CONVERSATION_PREFER_PHRASES}}`, `{{CONVERSATION_AVOID_PHRASES}}`. |
| AC7  | Rendered prompt for Lead Web Designer + Growth includes: `craft direction`, `named scope`, `stronger design leadership`, `where do you want your judgment to carry more weight?`. |
| AC8  | Rendered prompt includes avoid guidance for: `what steps can you take?`, `how will you delegate this?`, `what is the process?`. |
| AC9  | If no canonical lexicon file exists, run does not crash and renders `(none yet)`. |
| AC10 | End-of-run CLI shows lexicon reviewer suggestions. |
| AC11 | `<Enter>` approves all suggestions as candidates. |
| AC12 | `2 5 6` removes those suggestions before saving the rest as candidates. |
| AC13 | `n` saves none as candidates. |
| AC14 | `q` skips the review step. |
| AC15 | Approved suggestions are written only to `lexicons/_candidates/design/lead.yaml`. |
| AC16 | Approved end-of-run suggestions are NOT written to `lexicons/design/lead.yaml`. |
| AC17 | Trace file at `lexicons/_suggested/{sessionId}.json` shows: all suggestions, accepted, rejected, source session id, timestamp. |
| AC18 | Live question-generation prompt only uses canonical lexicon, never candidate. |
| AC19 | Every future question-generation run loads the canonical lexicon before generating questions. |
| AC20 | If matching canonical exists, its terms/phrases appear in the rendered `03-question-bank/prompt.md`. |
| AC21 | If no matching canonical exists, run continues with `(none yet)`. |
| AC22 | No UI, no decay rules, no automatic silent YAML growth, no promotion automation, no other prompts changed. |

---

## Verification — test scenario

Run a single session with:
- `meetingType: growth`
- `role: Lead Web Designer`
- `seniority: lead`
- Manager notes: `"They are taking on too many things and seem pulled into BA/process conversations instead of growing their design leadership."`

**Expected:** generated questions should avoid sounding like task-management coaching. They should lean toward growth, scope, craft direction, and design leadership.

**Bad output** (current behaviour):
- "How are you deciding what to delegate and what to keep on your plate?"

**Better output** (after this change):
- "What kind of design scope would let you spend more of your judgment on craft direction rather than being pulled into process?"

**Inspection points:**
1. Open `logs/<sessionId>/03-question-bank/prompt.md` — confirm the `<conversation_language>` block renders with the canonical terms/phrases (AC7, AC8, AC20).
2. Open `logs/<sessionId>/03-question-bank/response.json` — confirm questions don't include the avoid phrases.
3. After session completes, confirm CLI prompts for lexicon review (AC10).
4. Try each input path: `<Enter>`, `2 5`, `n`, `q` (AC11-14).
5. Confirm `lexicons/design/lead.yaml` is unchanged after any approval (AC16).
6. Confirm `lexicons/_candidates/design/lead.yaml` updated only with accepted items (AC15).
7. Confirm `lexicons/_suggested/{sessionId}.json` exists with full trace (AC17).
8. Delete `lexicons/design/lead.yaml` and rerun — confirm `(none yet)` renders, no crash (AC9, AC21).

---

## Assumptions

- Reviewer LLM call uses the same `callAI` / `modelFor` pattern as existing stages; gets its own `costLabel` (e.g. `06-lexicon-review`).
- CLI session entry point is `cli.js` (to verify before wiring). Lexicon reviewer is invoked synchronously after final evaluation logging completes, so the session is already on disk.
- `yaml` dep is acceptable; if you'd prefer a hand-rolled mini-parser to avoid the dep, that's a trivial swap given the fixed YAML shape.
- For roles that don't match the `design` matcher (or seniority ≠ `lead`, or meeting type ≠ `growth`), the entire layer is a no-op: empty placeholders rendered, reviewer step skipped. Existing behaviour for all other sessions is preserved.

---

## Verification status (re-entered plan mode, static checks only)

This section was added after implementation. Pre-existing offline harness `scripts/test-lexicon.js` reported 35/35 passing in the previous turn. The checks below confirm nothing has drifted since.

**Static checks performed in this re-entry (read-only):**

| Check | Result |
|---|---|
| [lexicons/design/lead.yaml](lexicons/design/lead.yaml) intact with all 7 prefer_terms, 7 prefer_phrases, 3 avoid_phrases (each with reason + better_as) | ✅ |
| [lexicons/_candidates/design/lead.yaml](lexicons/_candidates/design/lead.yaml) exists with `meeting_types: {}` skeleton | ✅ |
| [src/lexicon.js](src/lexicon.js) — `loadLexicon`, `roleFamilyOf`, `meetingTypeKey`, `seniorityKey`, `canonicalPath`, `candidatePath` all exported; never reads `_candidates/` | ✅ |
| [src/question-generator.js](src/question-generator.js) — imports `loadLexicon`; substitutes all three `{{CONVERSATION_*}}` placeholders (lines 110–112) | ✅ |
| [prompts/generate-questions.md](prompts/generate-questions.md) — `<conversation_language>` block present at line 206 with all three placeholders | ✅ |
| [src/lexicon-reviewer.js](src/lexicon-reviewer.js) exists | ✅ |
| [prompts/review-session-for-lexicon.md](prompts/review-session-for-lexicon.md) exists | ✅ |
| [cli.js](cli.js) — imports `reviewLexiconSession` at line 15, invokes at line 528 (after final evaluation) | ✅ |
| `package.json` — `yaml ^2.9.0` in dependencies | ✅ |
| Smoke-test unit-check #3 will pass — `srcText.includes("{{CONVERSATION_PREFER_TERMS}}")` etc. all match literally in question-generator.js | ✅ |

**Cannot run in plan mode (require execution):**
- `node scripts/test-lexicon.js` — offline harness, 35 checks (writes temp data then restores; no API spend).
- `npm run smoke` — live end-to-end through `cli.js` against OpenAI (spawns child process, ~$0.05–0.15 spend, 45–120s). Note: existing scenario files target other personas; would need either a new `scenarios/lead-web-designer-growth.json` or running interactive `node cli.js` manually with the test scenario from the verification section above.

**Recommendation:** exit plan mode, run the offline harness first (zero cost, fast feedback), then either run an interactive `node cli.js` with the test scenario or add a smoke-test scenario file matching design/lead/growth and run `npm run smoke`.

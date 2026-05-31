# Plan: PREPARATION Stage

## Context
After focus points are generated, the manager selects 1–3 of them, then gets a short prep brief before the 1:1 starts. This is the first real Sero value screen — schema-bound, role-aware, and meeting-type-aware. Only the selected concerns feed into the brief.

## Flow
**Web:** INTAKE → FOCUS_POINTS (+ select) → **PREPARATION** → BANK → QUESTIONING → EVAL → BRIEFING  
**CLI:** Stage 1 (focus points + select) → **Stage 1b (preparation)** → Stage 2 → ...

**Scope:** PREPARATION stage only. No eval, dashboard, runner, recording, summary, or login changes.

---

## Locked Contracts

### Output contract (`PrepBrief`)
```ts
type PrepBrief = {
  coreIssue: string;        // one short paragraph — what this 1:1 is probably about
  openingQuestion: string;  // one strong specific question (not "How are you?")
  listenFor: string[];      // 3 items max
  avoid: string[];          // 2 items max
  goodOutcome: string;      // one sentence
  suggestedAction: string;  // one practical closing action
};
```

### Input contract (`PrepInput`)
Derived from session data — no new intake fields:
```ts
type PrepInput = {
  roleTitle: string;          // ctx.role
  seniority: string;          // ctx.seniority
  meetingType: string;        // ctx.meetingType
  observedShift: string;      // ctx.notes
  selectedConcerns: string[]; // manager's chosen 1–3 focus point labels (not all generated)
};
```

### API return shape
```ts
{ brief: PrepBrief, runId: string, validation: { passed: boolean, issues: string[] } }
```
`runId` stored in client state for later feedback; never displayed. Validation sent to client only in dev mode — always logged server-side.

---

## Validation Rules (server-side, always logged, shown only in dev/CLI)

| Check | Rule |
|---|---|
| Missing role awareness | Output could apply to any job |
| Missing meeting-type awareness | check_in/performance/growth/something_off sound the same |
| Weak opening question | Generic, vague, or too corporate |
| Too long | `coreIssue` > 80 words, `listenFor` > 3 items, `avoid` > 2 items |
| No next action | `suggestedAction` empty or < 5 words |
| Unsafe interpretation | Diagnoses emotion, mental health, intent too strongly |

---

## Files to Create

### 1. `prompts/preparation.md`
Placeholders: `{{ROLE_TITLE}}`, `{{SENIORITY}}`, `{{MEETING_TYPE}}`, `{{OBSERVED_SHIFT}}`, `{{SELECTED_CONCERNS_JSON}}`

Prompt rules baked in:
- `coreIssue`: one paragraph, specific to this role + seniority + meeting type — not generic
- `openingQuestion`: a real sentence the manager could say verbatim; no "How are you?", no "Tell me about..."
- `listenFor`: ≤ 3 items, phrased as "whether X" or "if they Y"
- `avoid`: ≤ 2 items, phrased as "do not X"
- `goodOutcome`: one sentence — what manager will know or have agreed by end
- `suggestedAction`: one practical action with implied ownership and timing

### 2. `src/preparation.js`
Exports `generatePreparation(inputs, options)`:
- Maps inputs to `PrepInput` (uses `selectedConcerns`, not all focus points)
- Generates `runId = randomUUID()` at start
- Fills `prompts/preparation.md` template
- Calls `callAI` with strict `PrepBrief` JSON schema
- Runs validation checks against the 6 rules
- Logs using `logStage(session, "01b-preparation", { inputs: { ...PrepInput, model, runId, validation }, prompt: filledPrompt, response: rawResponse })`
  - `01b-preparation/inputs.json` — PrepInput + model + runId + validation result
  - `01b-preparation/prompt.md` — filled prompt sent to model
  - `01b-preparation/response.json` — raw model response
- Returns `{ brief: PrepBrief, runId, validation }`

### 3. `frontend/server/handlers/focus-points-select.js`
`POST /api/focus-points/select` — stores manager's chosen focus points in session:
```js
const { requireSession } = require("../sessions");
module.exports = async function focusPointsSelect(c) {
  const body = await c.readBody();
  const session = requireSession(body.s || c.query.s);
  const ids = Array.isArray(body.selectedIds) ? body.selectedIds : [];
  if (ids.length < 1 || ids.length > 3) {
    return c.error(Object.assign(new Error("Select 1–3 focus points"), { status: 400 }));
  }
  const all = session.focusPointsResult?.focus_points || [];
  session.selectedFocusPoints = all.filter(fp => ids.includes(fp.id));
  session.preparationResult = null; // clear stale brief if re-selecting
  c.json(200, { ok: true });
};
```

### 4. `frontend/server/handlers/preparation.js`
Modelled on `focus-points.js`. Uses `runStage`.
- Guards: requires `session.selectedFocusPoints` (409 if focus points not selected yet)
- `getCached: () => session.preparationResult`
- `setCached: (r) => { session.preparationResult = r; }`
- Calls `generatePreparation({ ...session.ctx, selectedConcerns: session.selectedFocusPoints.map(fp => fp.label) }, { session })`
- `buildPayload: (r) => isDev ? r : { brief: r.brief, runId: r.runId }` — sends validation only in dev

### 5. `frontend/client/src/stages/preparation.js`
- Orb with label "Preparing your briefing"
- SSE from `/api/preparation/stream?s=...`
- On result: stores `runId` in state (`setState({ preparationRunId: r.runId })`), renders 6 sections:
  1. "What this 1:1 is probably about" → `coreIssue` (paragraph)
  2. "Start with this question" → `openingQuestion` (styled callout / blockquote)
  3. "Listen for" → `listenFor` (bullet list)
  4. "Avoid" → `avoid` (bullet list)
  5. "Good outcome" → `goodOutcome` (single sentence)
  6. "Suggested action to agree" → `suggestedAction` (single sentence)
- Continue button → `STAGES.BANK`
- No regen button
- Error → `setState({ stage: STAGES.ERROR, retryStage: STAGES.PREPARATION })`

### 6. `scripts/test-prep-role-diff.js`
Verification test — same meeting type + concerns, different role/seniority:
```js
// Calls generatePreparation twice:
// Run A: Junior Engineer, junior, bi_weekly_check_in, concerns: ["Clarity on priorities"]
// Run B: Engineering Director, director, bi_weekly_check_in, concerns: ["Clarity on priorities"]
// Asserts: coreIssue differs, openingQuestion differs (not same string)
// Prints PASS / FAIL + both outputs side by side
```

---

## Files to Modify

### 7. `frontend/server/sessions.js`
- Add to `createWebSession` state: `selectedFocusPoints: null`, `preparationResult: null`
- Update `inferStage`:
  ```js
  if (s.focusPointsResult && s.selectedFocusPoints && s.preparationResult) return "BANK";
  if (s.focusPointsResult && s.selectedFocusPoints) return "PREPARATION";
  if (s.focusPointsResult) return "FOCUS_POINTS"; // back to focus for selection
  return "FOCUS_POINTS";
  ```
- Add `preparation: s.preparationResult` to `snapshot` return

### 8. `frontend/server/session-persistence.js`
- Add `selectedFocusPoints: s.selectedFocusPoints`, `preparationResult: s.preparationResult` to `serialize`

### 9. `frontend/server/server.js`
- Add imports: `const focusPointsSelect = require("./handlers/focus-points-select");` and `const preparation = require("./handlers/preparation");`
- Add routes:
  ```js
  router.add("POST", "/api/focus-points/select", (c) => { if (!originOk(c.req)) ... return focusPointsSelect(c); });
  router.add("GET",  "/api/preparation/stream", preparation);
  ```

### 10. `frontend/client/src/state.js`
- Add `PREPARATION: "PREPARATION"` to STAGES enum (after FOCUS_POINTS)
- Add `preparation: null`, `preparationRunId: null` to `initial` object

### 11. `frontend/client/src/main.js`
- Add `PREPARATION: () => import("./stages/preparation.js")` to loaders map
- Add `preparation: snap.preparation || null, preparationRunId: null` to boot rehydration setState

### 12. `frontend/client/src/stages/focus-points.js`
- Replace static focus-point list with selectable pills (toggle, max 3, min 1 to enable Continue)
- Continue button: disabled until ≥1 selected; on click: POST `/api/focus-points/select` with `{ s: sessionId, selectedIds }`, then `setState({ stage: STAGES.PREPARATION })`
- Regen button: clears selection, re-opens SSE (same as current)
- Clear `store.preparation = null` and `store.preparationRunId = null` on regen

### 13. `cli.js`
- Add `const { generatePreparation } = require("./src/preparation");` at top
- After focus-points display, add selection prompt (numbered list, manager types "1,3"):
  - Parse input, validate 1–3 selections, store as `selectedConcerns`
- Insert Stage 1b: call `generatePreparation`, print 6 sections
- Print validation warnings if `validation.passed === false` (CLI always shows them)

---

## Verification Checklist

1. `node scripts/test-prep-role-diff.js` — must PASS (outputs differ by role/seniority)
2. Web: FOCUS_POINTS renders selectable pills; Continue disabled until ≥1 selected
3. After selecting + continuing, PREPARATION renders with correct 6 sections
4. `store.preparationRunId` populated in browser console (not displayed in UI)
5. Session log: `01b-preparation/inputs.json` exists with `runId`, `validation`, selected concerns only
6. Regen focus points → re-entering PREPARATION produces fresh brief (old cache cleared)
7. CLI: selection prompt appears, Stage 1b prints all 6 sections, validation warnings shown if any
8. In production mode: validation not sent to client; in dev mode: validation visible in network tab

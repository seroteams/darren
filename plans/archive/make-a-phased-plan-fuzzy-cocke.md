# Sero — Full Audit Fix Plan

## Context

A CTO-level audit of the Sero codebase identified four categories of issues before engine work begins: silent data corruption bugs, operator-invisible failures, CLI/web parity drift, and dead code/hardening gaps. This plan fixes them in priority order across four phases, each independently shippable. The goal is a codebase where failures are loud, both UIs behave identically, and the engine can be modified with confidence.

---

## Phase 1 — Silent data bugs
*Things that produce wrong results with no indication. Fix before anything else.*

### 1.1 YAML unescaping order — `src/questions.js:66`
**Problem:** `parseScalar()` un-escapes `\"` before `\\`. A string containing both (e.g. `foo\"bar`) round-trips incorrectly.  
**Fix:** Swap the two `.replace()` calls — unescape `\\` → `\` first, then `\"` → `"`.
```js
// Before
return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
// After
return s.slice(1, -1).replace(/\\\\/g, "\\").replace(/\\"/g, '"');
```

### 1.2 Answer truncation: notify user — `frontend/server/handlers/answer.js:18`
**Problem:** Answers longer than 4000 chars are silently sliced. The planner sees incomplete input; the user thinks their full answer was recorded.  
**Fix:** When `answer.length > MAX_ANSWER_CHARS`, include `truncated: true` in the 202 response body. The client (questioning.js) should display a brief inline warning.

### 1.3 Unknown model price: warn operator — `src/cost.js:70-72` + `cli.js:527-534`
**Problem:** `unknown_price_calls` is tracked in `summary()` but never printed. `usd_total` silently under-reports when an unpriced model is used.  
**Fix:** In `cli.js`'s cost display block (~line 527), add: if `finalCost.unknown_price_calls > 0` print a yellow warning line. Same warning in web UI's post-session cost display if applicable.

### 1.4 Off-signature delta drops: surface in web UI — `src/queue-manager.js:150-151` + `frontend/server/handlers/plan.js`
**Problem:** `clampToSignature()` puts violations in `issues[]`. In CLI these are printed (cli.js:456). In the web UI, `plan.issues` is written to disk but never emitted as an SSE event, so the operator is blind.  
**Fix:** In `plan.js`, include `issues` in the `axes` SSE event payload (or emit a separate `debug` event). No UI change needed — just log to browser console on the client side.

---

## Phase 2 — Error visibility
*Failures that happen but nobody sees.*

### 2.1 Fix `api.js` silent error swallow — `frontend/client/src/api.js:5`
**Problem:** `const body = await res.json().catch(() => ({}))` swallows JSON parse failures. A non-JSON server error (HTML 502 gateway page, etc.) produces `{ error: undefined }`, which renders as a blank error message.  
**Fix:**
```js
// Before
const body = await res.json().catch(() => ({}));
throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status });
// After
let body = {};
try { body = await res.json(); } catch { /* non-JSON body */ }
throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status });
```

### 2.2 Fix misleading "invalid JSON" error for schema violations — `src/ai-client.js` (JSON parse block in each `_call*` function)
**Problem:** When the model returns schema-invalid JSON (parseable but wrong shape), the catch block says "returned invalid JSON" — misleading. The JSON is valid; it's the schema that failed.  
**Fix:** Separate the two failure cases. Catch `JSON.parse` separately; add a schema shape check after parsing, throwing "returned schema-invalid response" with the actual parsed value for debugging.

### 2.3 Planner failure `note` visible in web UI — `frontend/client/src/stages/questioning.js`
**Problem:** When `planTurn()` throws, `plan.js` emits a `note` SSE event ("The model hiccuped — continuing.") rather than an error. The client receives it but currently only stores it for axis display; it's never rendered to the user.  
**Fix:** In questioning.js, when a `note` event arrives, render it as a transient dim status line below the question (same style as CLI's `dim("note: ...")`). Does not block the session.

### 2.4 SESSION_TTL configurable via env var — `frontend/server/sessions.js:10`
**Problem:** TTL is hard-coded at 2 hours. A long meeting kills the session with no tuning possible.  
**Fix:**
```js
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 2 * 60 * 60 * 1000;
```
Document in `.env.example`.

---

## Phase 3 — CLI / Web parity
*Structural drift that will cause silent divergence as the engine evolves.*

### 3.1 Remove `selectedFocusPoints` from web frontend
**Problem:** CLI no longer has focus point selection (removed in prior session). Web frontend still requires it: `sessions.js:33` initialises it to `null`; `inferStage():103-104` blocks PREPARATION until it's set; `handlers/preparation.js:13-14` returns 409 if absent; `handlers/preparation.js:24` maps it to `selectedConcerns`.

**Files to change:**
- `frontend/server/sessions.js` — remove `selectedFocusPoints: null` (line 33); update `inferStage()` (lines 103-104) to advance directly from `focusPointsResult` to `preparationResult`
- `frontend/server/handlers/preparation.js` — remove the `selectedFocusPoints` guard (lines 13-15); pass `focusPoints: session.focusPointsResult.focus_points` instead of `selectedConcerns` (line 24)
- `frontend/server/handlers/focus-points-select.js` — delete this file (route no longer needed)
- `frontend/server/server.js` — remove the `/api/focus-points/select` route registration
- `frontend/client/src/stages/focus-points.js` — remove the selection UI and submission logic; after focus points load, auto-advance to next stage
- `frontend/client/src/state.js` — remove `selectedFocusPoints` from state if present

### 3.2 Budget constants: cli.js imports from sessions.js
**Problem:** `INTRO_BUDGET=3` and `DYNAMIC_BUDGET=5` are defined in both `cli.js:37-38` and `frontend/server/sessions.js:6-7`. `sessions.js` already exports them.  
**Fix:** In `cli.js`, remove the local declarations and import:
```js
const { INTRO_BUDGET, DYNAMIC_BUDGET } = require("./frontend/server/sessions");
```

### 3.3 Bank fallback: extract shared helper
**Problem:** Seed bank fallback on generation failure is duplicated between `cli.js:304-307` and `frontend/server/handlers/bank.js:20-31`. If one is updated the other silently diverges.  
**Fix:** Add `generateBankWithFallback(args, opts)` in `src/question-generator.js` that wraps `generateBank()` + seed fallback. Both `cli.js` and `bank.js` call this instead.

---

## Phase 4 — Dead code + hardening
*Cleanup and defensive guards before engine modification.*

### 4.1 Remove unused queue exports — `src/questions.js:188-224`
**Problem:** `peek`, `pop`, `append`, `replaceNext`, `insertAt` are exported but not imported anywhere.  
**Fix:** Remove the five functions and their entries from `module.exports`. Confirm with a grep before deleting.

### 4.2 Add `validateAxisState()` guard — `src/axes.js`
**Problem:** `initState()`, `applyDeltas()`, and `planTurn()` all assume axis IDs match the catalogue and scores are clamped. No runtime check exists.  
**Fix:** Add `validateAxisState(state)` to `axes.js` that asserts: all expected axis IDs present, scores are numbers within `[-SCORE_CLAMP, SCORE_CLAMP]`, history entries are arrays. Call it in `queue-manager.js` before building the planner prompt.

### 4.3 Refine clinical term detection — `src/preparation.js:110-114`
**Problem:** Substring match on `["burnout", "anxiety", ...]` triggers false positives on valid phrases like "managing burnout workload".  
**Fix:** Replace with phrase-boundary regex checks (e.g. require the term to appear as a standalone word or clinical descriptor, not as part of a compound noun). Example: `/\bburnout\b(?!\s+workload|\s+risk|\s+prevention)/i`.

### 4.4 Smoke test stubs
**Problem:** No tests exist. YAML roundtrip and prompt placeholder substitution are two functions where a one-character regression would only surface at runtime.  
**Fix:** Add `smoke-test.js` entries (the file already exists) for:
1. YAML roundtrip: write a question with special characters (`"`, `\`, `:`) → save → reload → assert deep equal
2. Budget constant consistency: assert `cli.js` uses the same `INTRO_BUDGET`/`DYNAMIC_BUDGET` as `sessions.js`
3. Prompt placeholder check: assert every `{{PLACEHOLDER}}` in each `.md` file has a corresponding `.replace()` call in the relevant `src/` file

---

## Critical files

| File | Phases |
|------|--------|
| `src/questions.js` | 1.1, 4.1 |
| `frontend/server/handlers/answer.js` | 1.2 |
| `src/cost.js` + `cli.js` | 1.3 |
| `src/queue-manager.js` + `frontend/server/handlers/plan.js` | 1.4 |
| `frontend/client/src/api.js` | 2.1 |
| `src/ai-client.js` | 2.2 |
| `frontend/client/src/stages/questioning.js` | 2.3 |
| `frontend/server/sessions.js` | 2.4, 3.1, 3.2 |
| `frontend/server/handlers/preparation.js` | 3.1 |
| `frontend/server/handlers/focus-points-select.js` | 3.1 (delete) |
| `frontend/server/server.js` | 3.1 |
| `frontend/client/src/stages/focus-points.js` | 3.1 |
| `src/question-generator.js` | 3.3 |
| `src/axes.js` | 4.2 |
| `src/preparation.js` | 4.3 |
| `smoke-test.js` | 4.4 |

---

## Verification

After each phase, verify with:

1. **Phase 1:** Run `node cli.js` with a question YAML containing `\` and `"` in a field. Confirm it round-trips cleanly. Type a >4000 char answer and confirm truncation warning. Use an unlisted model name and confirm cost warning prints.

2. **Phase 2:** Point `OPENAI_API_KEY` at a broken endpoint; confirm the web UI shows a readable error message (not blank). Force a planner failure (bad prompt injection); confirm the note renders in the web UI. Set `SESSION_TTL_MS=60000` and confirm session expires in 1 minute.

3. **Phase 3:** Start a web session end-to-end — confirm it advances from focus points directly to preparation with no selection step. Confirm `node cli.js` also advances without selection. Confirm budget constants are the same value in both paths.

4. **Phase 4:** Run `node smoke-test.js` and confirm all three new tests pass. Introduce a deliberate YAML escape bug and confirm the test catches it.

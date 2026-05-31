# Plan: Why Focus Points Feel Slow & How to Fix It

## Context

When the user navigates to the focus points stage, the server makes a blocking LLM call and the user sees a "thinking" spinner with no visible progress for typically 3–8 seconds before all 5 focus points appear at once. The user reported this felt slow.

## Root Cause

The bottleneck is a single, fully-blocking LLM call in `src/generate.js:generateFocusPoints()`.

Flow today:
1. User submits intake form → `POST /start` creates session, returns immediately
2. User navigates to focus-points stage
3. Client opens SSE to `/api/focus-points/stream`
4. **Server calls `generateFocusPoints()` for the first time here** — nothing is shown until it completes
5. OpenAI returns the full JSON response (3–8 s) → all 5 points appear at once

Two contributing factors make the LLM call take longer:
- The prompt embeds the full `focus-points.json` catalogue (~9 KB / ~2,000–3,000 tokens) in every request
- `fs.readFileSync` reads both the prompt template and catalogue from disk on every call

## Fix: Pre-warm at Session Start

Since all inputs needed to generate focus points are available at `POST /start`, kick off the LLM call there as a fire-and-forget background task. By the time the user finishes any intro questions and opens the SSE stream, the result will likely already be cached. The stream helper (`_stream-helper.js:24-37`) already handles the cached path with a 250 ms brief replay — no other changes needed.

### Critical Files

| File | Change |
|---|---|
| `frontend/server/handlers/start.js` | Fire `generateFocusPoints()` and store in `session.focusPointsResult` after `createWebSession()` |
| `src/generate.js` | (Optional) cache `focus-points.json` and prompt template at module load instead of per-call |

### Implementation (start.js)

After `createWebSession()`, add:

```js
const { generateFocusPoints } = require("../../../src/generate");

// Fire-and-forget: warm focus points in the background while the user answers intro Qs
generateFocusPoints(ctx, { session: { id: session.id, dir: session.dir } })
  .then((result) => { session.focusPointsResult = result; })
  .catch(() => {}); // failure is fine; focus-points handler will retry
```

### Optional: Cache files at module load (src/generate.js)

Move the `readFileSync` calls out of `loadFocusPoints()` and `buildMessages()` to top-level constants so they run once:

```js
const CATALOGUE = JSON.parse(fs.readFileSync(FOCUS_POINTS_PATH, "utf8"));
const PROMPT_TEMPLATE = fs.readFileSync(PROMPT_PATH, "utf8");
```

## Verification

1. Open the app, submit the intake form
2. In server logs, confirm `generateFocusPoints` starts immediately after `/start`
3. Navigate through intro (if any) to focus points stage
4. Confirm focus points appear with only the 250 ms cached-replay delay rather than the full LLM wait
5. Confirm that if the user reaches focus points before pre-warm completes, it falls through to the normal live-stream path (no regression)

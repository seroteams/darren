# Sero MVP Audit — Post-Implementation Check

## Issues Found During Review (need fixing)

### 1. `question-generator.js` — `toAxisObject` not updated
[src/question-generator.js:105](../src/question-generator.js) still uses `Number(e.delta) || 0` instead of `snapToAllowedDelta`. The `snapToAllowedDelta` helper only exists in `queue-manager.js`. Since `question-generator.js` has its own copy of `toAxisObject`, it didn't get the S2 fix.
- **Fix**: Apply same `snapToAllowedDelta` snap in `question-generator.js`'s `toAxisObject` (or extract the helper to a shared util).

### 2. `server.js` — cosmetic `PORT` placement
The `const PORT = ...` declaration (line 37) ended up after the rate-limiter block instead of with the other top-level constants. Not a runtime bug (only used inside `main()`), but messy.
- **Fix**: Move `PORT` and `CLIENT_DIST` back up with `IS_PROD`.

---

# Sero MVP Audit — MoSCoW Prioritisation

## Context

Sero is a 1:1 meeting prep assistant. A manager enters context about a direct report; the engine generates focus points, a question bank, then runs an 8-turn adaptive interview — re-scoring axes (wellbeing, engagement, clarity, growth) after each answer and dynamically reordering the question queue. A final briefing is produced. The goal of this audit is to identify what to improve with the constraint of **keeping things simple and refining the engine**.

---

## Architecture Overview

| Layer | Tech |
|---|---|
| Core engine | Node.js, native `http`, `readline` for CLI |
| AI | OpenAI (primary), Gemini (secondary) |
| Frontend | Vanilla JS + Vite + Tailwind CSS |
| Session state | In-memory (2hr TTL), disk logs for CLI |
| Streaming | Server-Sent Events (SSE) |

**Engine files that matter most:**
- [src/queue-manager.js](../src/queue-manager.js) — `planTurn()` is the core: re-scores axes, reconciles AI-returned queue
- [src/axes.js](../src/axes.js) — axis state machine
- [src/question-generator.js](../src/question-generator.js) — dynamic bank generation
- [src/generate.js](../src/generate.js) — focus points (Stage 1)
- [src/reviewer.js](../src/reviewer.js) — final evaluation (Stage 5)
- [frontend/server/handlers/plan.js](../frontend/server/handlers/plan.js) — web-facing entry into `planTurn()`

---

## MoSCoW Audit

### MUST — Blocking issues; fix before any further engine work

| # | Issue | File(s) | Why it blocks |
|---|---|---|---|
| M1 | **No timeout on AI calls** — fetch can hang indefinitely, freezing a session | `src/ai-client.js` | A single slow OpenAI response locks the session permanently |
| M2 | **No retry on transient AI failures** (429, 503, timeout) | `src/ai-client.js` | Engine crashes on the first rate-limit hit; no user sees a briefing |
| M3 | **Malformed AI JSON crashes planTurn** — full raw response is thrown as an error without truncation | `src/queue-manager.js:281` | One bad model response kills the session |
| M4 | **No input length guard on answers** — `answer` is written straight into session with no size cap | `frontend/server/handlers/answer.js` | 10MB string can bloat session memory and overflow prompt context |
| M5 | **Session lost on server restart** — all in-flight web sessions are in-memory only | `frontend/server/sessions.js` | Any deploy or crash drops every active user mid-meeting |
| M6 | **Rotate API keys** — .env was committed to git at some point | `.env` | Keys are potentially already leaked; rotate on OpenAI + Gemini dashboards now |

---

### SHOULD — High value, engine-quality improvements

| # | Issue | File(s) | Why it matters |
|---|---|---|---|
| S1 | **No retry/fallback when queue planner returns unexpected schema** — current fallback just keeps old queue, but doesn't tell the user anything went wrong | `src/queue-manager.js` | Silent degradation; hard to know engine is drifting |
| S2 | **Delta clamping is too loose** — planner can return deltas that aren't in `{-3, -1, 0, +1, +3}`; code clamps but not to the enum | `src/queue-manager.js` | Axis scores can get nonsense values |
| S3 | **Axis score bounds not enforced** — scores can drift below 0 or above 100 if planner keeps pushing | `src/axes.js` | Scores become meaningless; final briefing skews |
| S4 | **Question bank is regenerated fresh every session** — no caching of the base bank per (meeting-type, seniority) | `src/question-generator.js` | Unnecessary cost + latency on every session start |
| S5 | **`planTurn` prompt includes full question bank** on every turn — even questions already answered | `src/queue-manager.js` | Bloats prompt tokens unnecessarily as session progresses |
| S6 | **Smoke test not wired into any script** — `smoke-test.js` exists but is manually run | `package.json` | Easy to break engine without noticing |
| S7 | **Rate limiting missing** — any IP can spin up sessions until OpenAI quota is exhausted | `frontend/server/server.js` | Cost explosion risk; single bad actor can DoS the service |

---

### COULD — Nice to have; improves maintainability without changing the engine

| # | Issue | File(s) | Why it helps |
|---|---|---|---|
| C1 | **Structured JSON logging** — current logs are readable text; hard to query or alert on | `src/session.js` | Makes it much easier to debug production issues |
| C2 | **Unit tests for queue-manager and axes** — zero test files | `src/queue-manager.js`, `src/axes.js` | Lets you refactor engine confidently |
| C3 | **Prompt templates in separate files** — prompts are inline strings scattered across modules | `src/queue-manager.js`, `src/question-generator.js`, `src/reviewer.js` | Easier to tune and version prompts independently of logic |
| C4 | **Configurable session TTL and question counts** — `8 total questions`, `MAX_QUEUE = 12`, `SESSION_TTL_MS = 2h` are hardcoded across multiple files | multiple | Makes A/B testing session length trivial |
| C5 | **Dedup `try/catch` error handling pattern** in `question-generator.js` and `reviewer.js` — identical boilerplate | `src/question-generator.js`, `src/reviewer.js` | DRY; single place to improve error handling |
| C6 | **Session ID uses `Math.random()`** — should use `crypto.randomUUID()` | `src/session.js` | Tiny collision risk; trivial fix |

---

### WON'T — Out of scope for MVP engine refinement

| # | Item | Reason |
|---|---|---|
| W1 | TypeScript migration | High effort, zero engine value right now |
| W2 | Database (Postgres, SQLite) | Premature for MVP scale; disk logs are sufficient for audit |
| W3 | Authentication / multi-tenancy | Not needed until multi-user deployment |
| W4 | Full integration test suite | Worth it post-MVP; COULD items get you most of the safety net |
| W5 | Monitoring / alerting (Datadog, etc.) | Overkill until you have real users |
| W6 | Offline / cached-response mode | Contradicts the adaptive nature of the engine |

---

## Recommended Order of Work

1. **M6** — Rotate keys (do this right now, before anything else)
2. **M1 + M2** — Add timeout + retry to `ai-client.js` (single file, high impact)
3. **M3 + M4** — Harden `planTurn` JSON parsing and cap answer length
4. **S3 + S2** — Enforce axis score bounds and delta enum in `axes.js`
5. **S7** — Add a simple per-IP session counter as rate limit
6. **M5** — Write sessions to disk (or a local JSON file) so restarts don't drop users
7. **S5** — Trim answered questions from the planner prompt
8. **S6** — Wire `smoke-test.js` into `package.json` scripts
9. **C2** — Write unit tests for the engine (queue-manager + axes)
10. **C1 + C3** — Structured logs and extracted prompt templates (quality of life)

---

## Verification

After each MUST fix:
- Run `node smoke-test.js` — full end-to-end session
- Manually trigger a 429 from OpenAI to verify retry/timeout behaviour
- Check `logs/` directory for well-formed session snapshots

After SHOULD fixes:
- Run a full 8-turn session and inspect final axis scores (should stay 0–100)
- Compare token costs before/after S5 (trimming answered questions from prompt)

# Stream hang fix — the prep brief can never wait forever

**Goal:** A manager is never left staring at a spinner. If something goes wrong, Sero says so within 60 seconds and offers a Retry that works.
**Driver:** Carl
**Created:** 2026-07-17
**Mockup:** none — no visual surface (reliability fix; reuses the existing "We hit a snag" + Retry card)

## Why

Overnight QA (2026-07-17) drove all three personas end-to-end. Core flows passed. But one run exposed a real, user-facing bug: **the prep brief screen sat on its loading skeleton for 75+ seconds while the AI had already finished writing the brief perfectly.** The brief was on disk. The screen never showed it and never said anything was wrong.

There is **no timeout anywhere** in the streaming path. Every *other* failure correctly terminates on an error screen — which is exactly why QA saw a skeleton instead of an error. If the "here's your brief" message never lands, the screen waits forever.

We're in VALIDATION. The bar is *a real HR manager gets insight worth paying for*. A manager who opens Sero to prep for a 1:1 in five minutes, stares at a spinner, and walks in unprepared does not come back. Silent failure is the most expensive kind.

## Done means
- A stuck prep brief shows the "We hit a snag" card with **Retry** within 60 seconds — instead of a spinner forever.
- Retry works instantly (the finished brief is already cached).
- With two tabs, "Suggest different topics" can no longer strand the second tab.
- A crash while drawing the brief shows an error, not a spinner.

## Resolved before we start
- **Root mechanism confirmed** (`stream-helper.ts:65-75`): a second screen waiting on the same stage ("attach") writes only `thinking` and returns — it has **no independent completion path**. It depends entirely on the driving request's broadcast. The 15s heartbeat (`sse.ts`) keeps it alive and error-free indefinitely.
- **Exact trigger NOT provable from source.** The shape is certain; the precise orphaning event is not. This is *why* Phase 1 is a watchdog: it fixes the symptom regardless of cause. Phase 2's subscriber-count log exists so a recurrence is diagnosable.
- **Genuine trigger found by reading the code** (`stream-helper.ts:84-86`): `broadcast` has no per-subscriber try/catch. If one dead socket throws, the throw escapes into the `catch`, which calls `broadcast("error", …)` and throws **again on the same socket** — escaping `runStage` entirely. `closeAll()` never runs; every later subscriber gets nothing. Real hang, not theoretical.
- **Why preparation and not focus-points:** focus-points is pre-warmed (`session-runtime.ts:25-42`) so it almost always takes the Case-1 cached-replay path. Preparation has no pre-warm, so `/prepare` is the stage that actually exercises the attach race.
- **60s is the right number** — measured p50 for `01b-preparation` ≈ 4.4s; typical total ≈ 10s. But `ai-client.ts:6-7` (`TIMEOUT_MS=30_000`, `MAX_RETRIES=5`) means one call can legitimately take up to ~165s in a rate-limit storm. Carl chose 60s knowingly: it can rarely interrupt a slow-but-working brief, degrading to error+Retry (never a new hang), and Retry is instant.
- **`runStage`'s `produce` is injected** (`stream-helper.ts:21`) — tests hand it a promise they control. **No OpenAI, no cassette, no network.**
- **`scripts/run-tests.js` (46-52) does not scan `shared/`** — a `shared/sse.test.ts` would silently never run. Must be fixed first.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The prep screen can never wait forever | 60s watchdog in `shared/sse.js` (all 10 streams) + dev stall switch so the hang is walkable | 🔨 |
| 2 | The server always tells every waiting screen what happened | Terminal guarantee, per-screen isolation, `abortStage`, subscriber log | ⬜ |
| 3 | A crash while drawing your brief shows an error | `sse.js` await async handlers → error path | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Baseline (2026-07-17, before any changes): `npm test` → 150/150 passed.** Clean — nothing pre-existing.

**Phase 1 BUILT 2026-07-17 — awaiting Carl's walk.** Proven on the real screen: stall armed → error card at **62s** with Retry; stall off → brief lands at **12s**, no false alarm. `npm test` 153/153, typecheck clean. Two honest caveats recorded in [phase-1.md](phase-1.md): the error card shows generic copy (the timeout wording sits under *Technical details* — a parked copy decision), and each walk costs a few pence rather than nothing (only the brief call is replaced).

Phase 2 does not start until Carl green-lights Phase 1.

## Parked
- **Logo `/logo.png` hardcoded** (`admin/src/stages/login.js:32`, `:15-19`; `forgot-password.js:20`; `reset-password.js:22`). Literal string in a template literal, so Vite never rewrites it; admin base is `/admin/` → 404s locally. **Live works only by luck** — `server.ts` routes non-`/admin` paths to `frontend/dist`, which happens to hold an identical `logo.png`. One file-move from breaking the real login. Fix = `import.meta.env.BASE_URL` (no precedent in repo yet). Carl's call 2026-07-17: own task, ~30 min.
- **Let the stream auto-reconnect** (`sse.js:85-89` closes on first native error, defeating EventSource's built-in reconnect — which *would* have recovered this via Case-1 replay). ⚠️ **Trap:** `focus-points.js:47` appends `?regenerate=1`; EventSource replays the same URL on reconnect → re-triggers regenerate in a loop, each a **new paid AI run**. Requires making regenerate one-shot first. Do not fold in.
- **Stale comment** `preparation.ts:5` claims `admin/src/stages/preparation.js` still exists; it doesn't. 2-min fix — take it with the next change touching that file.
- **`shared/` is in no tsconfig `include`** — `shared/sse.test.ts` will run but not typecheck. Consistent with current practice; noted honestly, not fixed here.

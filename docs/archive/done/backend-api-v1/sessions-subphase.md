# `sessions` — the sub-phase plan (Phase 004, step 3, final domain)

**Status:** DRAFT for Carl's walk. **No code yet.** This slices the riskiest domain — the live 1:1
runner — into safe sub-passes so we convert it the same careful way as the 8 done domains, but with
extra respect for its live state. Approve the slicing (and the two decisions in §D) before any code.

## A. Why this one is different
- **21 routes** (the other domains were 1–8).
- **Live in-memory session state.** Every route reaches the session store (`backend/api/sessions.ts`:
  `getSession` / `requireSession` / `createSession` / `dropSession` / the sweep). A mistake here can
  break a *running* 1:1, not just a read. **This store is the shared seam** — getting its boundary right
  is the first task, before any route moves.
- **5 SSE streams** (`focus-points`, `preparation`, `bank`, `plan`, `evaluation`) — they stream events,
  not JSON, so (like `library`) they **manage their own responses → no `v1Route`**.
- **AI pipeline.** The streams + two JSON routes (`suggest-answers`, `lexicon/candidates`) call the
  model. Their structure is verified free (injected boundary, like `suggest-fix`); a live walk costs a
  model call — deferred, never run without Carl's explicit yes.

## B. The shared seam first (S0 — design, tiny code)
Before any route: define the **`SessionsRepo`/session-store seam** — the one interface every sessions
service depends on for live + on-disk session state (`getSession`, `requireSession` semantics,
create/drop, `inferStage`, the session dir). This is the architectural call that makes the rest
mechanical. Land it with a couple of unit tests proving a fake store drives the seam, **no routes moved
yet**. Walk + approve before S1.

## C. The sub-passes (safest → riskiest, ONE at a time, each test-first → walk → commit)

| Pass | Routes (current path) | Handlers | Money? | Notes |
|---|---|---|---|---|
| **S0** | — (the session-store seam) | `sessions.ts` | free | Design the seam + fakes. No routes moved. |
| **S1 — free reads** | `GET /session`, `GET /question`, `GET /role-profile`, `GET /preview`, `GET /lexicon/scope` | rehydrate, question, role-profile, preview, lexicon(scope) | **free** | Pure reads of cached/in-memory state. Fully walkable. |
| **S2 — non-AI writes** | `POST /answer`, `/back`, `/notes`, `/agenda/cover`, `/verdict`, `/focus-points/select`, `/lexicon/decisions`, **`POST /start`** | answer, back, notes, agenda, verdict, selected-focus, lexicon(decisions), start | **free** | Origin-guarded state writes. **`start`** is special (session create, rate-limited, may kick off async builds) — it leads this pass with extra care, possibly its own commit. |
| **S3 — AI JSON routes** | `GET /suggest-answers`, `GET /lexicon/candidates` | suggest-answers, lexicon(candidates) | structure free; **live walk paid** | Inject the model boundary (like `suggest-fix`); unit-test the gates/assembly free; defer the paid walk. After this, the 3 session-lexicon routes have all moved → **remove the now-orphaned `handlers/lexicon.ts`**. |
| **S4 — SSE streams** | `GET /focus-points/stream`, `/preparation/stream`, `/bank/stream`, `/plan/stream`, `/evaluation/stream` | focus-points, preparation, bank, plan, evaluation (+ shared `stream-helper.ts`) | structure free; **live walk paid** | The riskiest. Streams manage their own responses (**no `v1Route`**, like `library`). Keep `stream-helper` shared. Convert one stream first as the pattern, walk, then the rest. |

Cleanup at the end: once every sessions route is layered, `backend/api/handlers/` should hold only
`stream-helper.ts` (a shared helper, not a route) — confirm nothing else is orphaned.

## D. Decisions — LOCKED 2026-06-27 (Carl)
1. **v1 URL shape for sessions — ✅ id IN THE PATH (the contract's D4).** v1 sessions routes are
   `/api/v1/sessions/:id/…` with the id in the path (reads and writes). This is the one domain where we
   take the full REST shape now — it's the headline resource and worth it.
   - **The legacy `/api/…` routes stay exactly as today** (`?s=<id>` on reads, `sessionId` in the body on
     writes), so **the admin is unaffected** — it keeps calling legacy. Only the *new* v1 routes (nothing
     calls them yet) get the path shape.
   - **How the controller resolves the id:** each sessions controller reads the id from `c.params.id`
     (v1, path) and falls back to `c.query.s` / `body.sessionId` (legacy). One controller fn serves both
     route variants; the service just takes the resolved id string (storage-agnostic). This is the only
     real wiring delta vs the other domains.
   - No success-body shape changes; bodies keep `sessionId` on legacy writes (D2/D4 — leave bodies as-is).
2. **Cadence — ✅ one pass per walk** (S0 → S1 → S2 → S3 → S4); the live heart gets a walk each. Carl can
   say "batch S1+S2" any time.

## E. Out of scope (park it)
- Migrating the admin off the legacy `/api/…` session routes + deleting the legacy aliases — the D1
  follow-up (admin keeps calling legacy `?s=` this phase). Any further verb polish lives there too.
- No behaviour changes, no new features, no touching the engine/pipeline logic — structure only.
- Step 4 (the mirrored integration/e2e test tree) still follows after `sessions` is done.

## F. QA shape (per pass, walked before commit)
- **S0:** describe swapping the session store with a fake — seam holds, no route behaviour changes.
- **S1:** open a live run → snapshot, current question, role terminology, prompt preview all read as before.
- **S2:** drive a turn — answer, step back, save a note, mark agenda, record a verdict, pick focus points,
  keep a lexicon term — each persists exactly as today; bad origin still 403; `start` still creates a
  session + rate-limits.
- **S3/S4:** structure proven by unit tests + typecheck (free); the live AI walk is opt-in and costs a
  model call — walked naturally during a real run, on Carl's explicit go.

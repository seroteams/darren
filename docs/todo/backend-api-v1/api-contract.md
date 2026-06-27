# Sero Backend — API v1 contract (the service menu)

**Status:** DRAFT for Carl's review (Phase 004, step 1). **No code changes** have been made — this is
the menu we agree on *before* building. Once you approve it (and answer the five decisions below), it
becomes the contract every route in step 3 is built and tested against.

**What this is:** every service the backend offers, grouped into domains, with each route's request and
response shape, the one error format, and the slot for the login check we add later. It's deliberately
faithful to **what the API does today** — Phase 004 reshapes the *plumbing behind* these routes into
clean layers; it does **not** change product behaviour.

---

## A. Five decisions — LOCKED 2026-06-27 (Carl: "not sure, can you choose the best?")

Carl delegated these; I took the recommended (low-risk, behaviour-identical) option on each:

| # | Decision | ✅ Locked choice |
|---|---|---|
| D1 | Versioning | Register under `/api/v1/` **and keep `/api/…` as a thin alias** to the same handlers; migrate the ~52 admin call-sites + delete the alias as a follow-up. |
| D2 | Success body | **Leave resource-shaped bodies as-is**; standardise only the **error** shape. No admin caller changes. |
| D3 | REST rigor | **Pragmatic** — nounify CRUD resources (sessions, runs, lexicon, arcs); keep action/stream sub-routes for the AI pipeline. |
| D4 | Session id | **In the path** (`/api/v1/sessions/:id/…`); out of `?s=` query and request bodies. |
| D5 | Code layout | `backend/api/services/<domain>/` (`*.controller/service/repo/types.ts` + co-located `*.test.ts`) and `backend/api/middleware/` for shared plumbing. |

The original framing of each choice is kept below for the record.

Everything else below follows house rules already locked in. These five were the genuine choices:

**D1 — Versioning cutover vs. compatibility alias.**
The rule is "every route under `/api/v1/`". The admin console calls the old `/api/…` paths in **~52
places** across many files. Two ways to land v1 without breaking the admin:
- **(a) Recommended — register everything under `/api/v1/` and keep `/api/…` as a thin alias** to the
  same handlers for now. Admin keeps working untouched this phase; migrating its call-sites + deleting
  the alias is a tracked follow-up. Lowest blast radius, behaviour-identical.
- (b) Hard cutover — move to `/api/v1/` and update all ~52 admin call-sites in this phase. Cleaner end
  state, but pulls a lot of frontend edits into a backend-structure phase.

**D2 — Success-response shape.**
The overview says "every response shares one JSON shape." Today each route returns a resource-shaped
object (`{ types: […] }`, `{ sessionId, … }`). Forcing a `{ data: … }` envelope would touch **every
admin caller** (a behaviour change). Recommendation: **keep resource-shaped success bodies as they are**
and standardise only the **error** shape (D-error below). Flag if you want the full `{ data }` wrapper.

**D3 — How hard to push REST onto the pipeline routes.**
Much of this API is an **AI pipeline**, not CRUD: 5 routes are **SSE streams** (focus-points,
preparation, bank, plan, evaluation) and several are **actions** (`back`, `checks/run`,
`regression/run`). Pure-REST nouns don't fit a stream. Recommendation: **nounify the genuinely
CRUD-ish resources** (sessions, runs, lexicon, arcs) and keep **action/stream sub-routes** for the
pipeline (e.g. `GET /api/v1/sessions/:id/preparation/stream`). Honest over dogmatic.

**D4 — Session id in the path, not the query.**
Today live-run routes pass the session id as `?s=<id>`. REST wants it in the path:
`/api/v1/sessions/:id/…`. Recommendation: **adopt path style for v1** (the v1 column below assumes
this). It's the biggest shape change; say the word if you'd rather keep `?s=`.

**D5 — Where the new layered code lives.**
Recommendation: a domain tree under **`backend/api/services/<domain>/`** holding
`<domain>.controller.ts` · `<domain>.service.ts` · `<domain>.repo.ts` · `<domain>.types.ts` (+
co-located `.test.ts`), with `backend/api/middleware/` for the shared plumbing. The current
`backend/api/handlers/` thin out to controllers (or are replaced) one domain at a time. Confirm the
folder names.

---

## B. The standards (cross-cutting, all routes)

### Versioning
- Every route lives under **`/api/v1/`**. A future `/api/v2/` can ship without breaking v1.
- Per **D1**, `/api/…` stays as a temporary alias to the same handlers until the admin migrates.

### The one error shape (new — this is what step 2 builds)
Every failure returns the **same** JSON, with the right HTTP status:
```json
{ "error": { "code": "BAD_REQUEST", "message": "human-readable, honest", "details": { } } }
```
- `code` — a stable, machine-readable string (`BAD_REQUEST`, `NOT_FOUND`, `RATE_LIMITED`,
  `BODY_TOO_LARGE`, `BAD_ORIGIN`, `VALIDATION_FAILED`, `INTERNAL`).
- `message` — plain language; **never a masked/hardcoded rewrite of a real engine problem** (house
  engine-honesty rule — surface it, don't hide it).
- `details` — optional, per-error (e.g. which field failed validation).
- *Today's shape is the bare `{ "error": "msg" }`.* Standardising this is the one cross-cutting change
  to response bodies; the migration keeps the same HTTP status codes.

### Status codes (locked by house rule)
`200` read ok · `201` created · `202` accepted (async/queued) · `204` no content · `400` bad request ·
`401` unauthenticated · `403` forbidden (bad origin) · `404` not found · `409` conflict · `413` body too
large · `422` validation failed · `429` rate limited · `500` internal.

### Identity / "who-you-are" context (the slot)
Step 2 adds a **request context** object built once per request and handed to every service:
```ts
interface RequestIdentity {
  // Phase 004: always anonymous — there is no auth yet. This is the SHAPE the
  // login check (Phase 006) fills in. Nothing reads it for authorization yet.
  userId: string | null;       // null = anonymous
  orgId: string | null;        // null = no org context yet
  roles: string[];             // [] for now
}
```
- An **`requireAuth` middleware slot** exists but is a **no-op pass-through** in Phase 004 (the
  placeholder the real login check drops into in Phase 006). It changes no behaviour now.

### Security carry-overs (unchanged behaviour)
- **Origin guard** on every mutating route (`originOk` → `403 BAD_ORIGIN`) — same as today.
- **Rate limit** on session creation (`POST /api/v1/sessions`, 5/IP/min → `429`) — same as today.
- **1 MB body cap** → `413` — same as today.

### Layering target (built in step 3, per backend-conventions)
```
request → <domain>.controller.ts   (parse req, call service, format res — NO logic)
        → <domain>.service.ts      (the logic — never touches req/res)
        → <domain>.repo.ts         (data access — files now, Postgres in Phase 005)
```
The real test of the seam: **a repo's storage could be swapped (files → Postgres) without touching
its service.**

---

## C. The service domains (9)

| Domain | What it owns | Routes |
|---|---|---|
| **catalog** | Static/reference data: meeting types, personas | 2 |
| **sessions** | The live 1:1 runner — create, drive turn-by-turn, the 5 AI pipeline stages, notes/verdict, per-session lexicon | 21 |
| **runs** | Finished-run history: list, view, delete, archive, review, fix-suggestions | 9 |
| **lexicon** | Cross-session lexicon promotion (the global word list) | 2 |
| **role-lexicons** | The editable role vocabulary | 3 |
| **arcs** | Relational-arc editing | 3 |
| **pipeline** | Dev/ops: pipeline status + manifest | 2 |
| **regression** | The offline regression runner | 1 |
| **checks** | The Tasks-board "run free checks" button (free/offline only) | 1 |
| **library** | Serves run-artifact files from `logs/` | 1 |

*(38 routes total. `sessions` is the heart; the rest are small.)*

---

## D. The route map (current → v1, with shapes)

Notation: **req** = inputs (path/query/body fields; *required* unless marked optional). **res** = success
status + top-level keys. ⊙ = origin-guarded. ⏱ = rate-limited. 📡 = SSE stream (not JSON).
*Shapes are the current behaviour, documented — not redesigned.*

### catalog
| v1 route | current | req | res |
|---|---|---|---|
| `GET /api/v1/meeting-types` | `GET /api/meeting-types` | — | `200 { types }` |
| `GET /api/v1/personas` | `GET /api/persona-bench` | — | `200 { personas }` |

### sessions
| v1 route | current | req | res |
|---|---|---|---|
| `POST /api/v1/sessions` ⊙⏱ | `POST /api/start` | body: `name, role, seniority, meetingTypeIndex`; opt `notes, mode, runLabel, personaId` | `201 { sessionId, sessionDir, createdAt, introQueueLen }` |
| `GET /api/v1/sessions/:id` | `GET /api/session?s=` | path: `id` | `200 { …session snapshot }` |
| `GET /api/v1/sessions/:id/role-profile` | `GET /api/role-profile?s=` | path: `id` | `200 { ready, terminology, terminologyGroups }` |
| `GET /api/v1/sessions/:id/question` | `GET /api/question?s=` | path: `id` | `200 { turn, total, queueLen, scripted, question }` or `{ done, agenda }` |
| `GET /api/v1/sessions/:id/answer-suggestions` | `GET /api/suggest-answers?s=` | path: `id` | `200 { answers }` |
| `POST /api/v1/sessions/:id/answers` ⊙ | `POST /api/answer` | body: `answer` (≤4000), `answerSource`, `alias` | `202 { turn, skipped, truncated }` |
| `POST /api/v1/sessions/:id/back` ⊙ | `POST /api/back` | path: `id` | `200 { turn, total, answer, axes }` |
| `POST /api/v1/sessions/:id/notes` ⊙ | `POST /api/notes` | body: `note { id, stage, turn, ts, text, question_alias, question_stem, deleted? }` | `200 { ok, count }` |
| `POST /api/v1/sessions/:id/agenda-cover` ⊙ | `POST /api/agenda/cover` | body: `covered` (bool) | `200 { ok, covered }` |
| `POST /api/v1/sessions/:id/verdict` ⊙ | `POST /api/verdict` | body: `verdict` (keep\|fix\|block); opt `issue_type, note` | `200 { ok, verdict }` |
| `GET /api/v1/sessions/:id/preview` | `GET /api/preview?s=` | path: `id`; opt query `stage` | `200 { stage, label, model, prompt, preview }` |
| `GET /api/v1/sessions/:id/focus-points/stream` 📡 | `GET /api/focus-points/stream?s=` | path: `id`; opt `regenerate` | SSE `thinking·result·done·error` |
| `POST /api/v1/sessions/:id/selected-focus` ⊙ | `POST /api/focus-points/select` | body: `focusPointIds[]` | `200 { selectedFocusPoints }` |
| `GET /api/v1/sessions/:id/preparation/stream` 📡 | `GET /api/preparation/stream?s=` | path: `id` | SSE `thinking·result·done·error` |
| `GET /api/v1/sessions/:id/bank/stream` 📡 | `GET /api/bank/stream?s=` | path: `id` | SSE `thinking·ready·done·error` |
| `GET /api/v1/sessions/:id/plan/stream` 📡 | `GET /api/plan/stream?s=` | path: `id` | SSE `thinking·axes·note·next·done·error` |
| `GET /api/v1/sessions/:id/evaluation/stream` 📡 | `GET /api/evaluation/stream?s=` | path: `id` | SSE `thinking·briefing·done·error` |
| `GET /api/v1/sessions/:id/lexicon/candidates` | `GET /api/lexicon/candidates?s=` | path: `id` | `200 { candidates, skipped, fromCache, error }` |
| `GET /api/v1/sessions/:id/lexicon/scope` | `GET /api/lexicon/scope?s=` | path: `id` | `200 { eligible }` |
| `POST /api/v1/sessions/:id/lexicon/decisions` ⊙ | `POST /api/lexicon/decisions` | body: `decisions[]` | `200 { ok, count, committed }` |

> Note: today `POST /api/answer`, `/notes`, `/agenda/cover`, `/verdict`, `/lexicon/decisions` carry the
> session id as `sessionId` in the **body**. Under **D4** it moves to the path; the body keeps the rest.

### runs
| v1 route | current | req | res |
|---|---|---|---|
| `GET /api/v1/runs` | `GET /api/runs/recent` | opt query `limit` (1–20, def 3) | `200 { runs }` |
| `GET /api/v1/runs?status=finished` | `GET /api/runs/finished` | query `status=finished` | `200 { runs }` |
| `GET /api/v1/runs/:id` | `GET /api/runs/:id/overview` | path: `id` | `200 { …overview }` |
| `GET /api/v1/runs/:id/full` | `GET /api/runs/:id/full` | path: `id` | `200 { …full compare }` |
| `GET /api/v1/runs/:id/stages` | `GET /api/runs/:id/stages` | path: `id` | `200 { id, stages }` |
| `DELETE /api/v1/runs/:id` ⊙ | `DELETE /api/runs/:id` | path: `id` | `200 { deleted, id }` |
| `POST /api/v1/runs/:id/archive` ⊙ | `POST /api/runs/:id/archive` | path: `id`; opt body `archived` | `200 { ok, id, archived }` |
| `POST /api/v1/runs/:id/review` ⊙ | `POST /api/runs/:id/review` | body: `marks`; opt `overall, note` | `200 { ok, reviewStatus, overall, failedCount }` |
| `POST /api/v1/runs/:id/suggest-fix` ⊙ | `POST /api/suggest-fix` | body: opt `stage` (def "evaluation") | `200 { fix }` |

> `GET /api/v1/runs` merges today's `/recent` and `/finished` behind a `?status=` filter (REST: one
> collection, filtered by query). If you'd rather keep them as two distinct paths, say so.
> `suggest-fix` becomes a sub-route of the run it fixes (id moves from body to path).

### lexicon (global promotion)
| v1 route | current | req | res |
|---|---|---|---|
| `GET /api/v1/lexicon/promotions/pending` | `GET /api/lexicon/promote/pending` | — | `200 { items, count }` |
| `POST /api/v1/lexicon/promotions` ⊙ | `POST /api/lexicon/promote` | body: `decisions[]` | `200 { ok, … }` |

### role-lexicons
| v1 route | current | req | res |
|---|---|---|---|
| `GET /api/v1/role-lexicons` | `GET /api/role-lexicons` | — | `200 { roles }` |
| `POST /api/v1/role-lexicons/:key/terms` ⊙ | `POST /api/role-lexicons/term` | path: `key`; body: `term, meaning` | `200 { ok, term }` |
| `DELETE /api/v1/role-lexicons/:key/terms` ⊙ | `POST /api/role-lexicons/term/remove` | path: `key`; body: `term` | `200 { ok, remaining }` |

### arcs
| v1 route | current | req | res |
|---|---|---|---|
| `GET /api/v1/arcs` | `GET /api/arcs` | — | `200 { arcs }` |
| `PATCH /api/v1/arcs/:slug` ⊙ | `POST /api/arcs/:slug` | path: `slug`; body: `arc[]`; opt `tone_register, anti_patterns, confirm` | `200 { ok, arc }` or `{ needsConfirm, warning, orphans }` |
| `POST /api/v1/arcs/:slug/reset` ⊙ | `POST /api/arcs/:slug/reset` | path: `slug` | `200 { ok, arc }` |

### pipeline
| v1 route | current | req | res |
|---|---|---|---|
| `GET /api/v1/pipeline/status` | `GET /api/pipeline/status` | opt query `baseline` (def "latest") | `200 { baseline, current, … }` |
| `GET /api/v1/pipeline/manifest` | `GET /api/pipeline/manifest` | — | `200 { capturedAt, aggregates, manifestCounts }` |

### regression
| v1 route | current | req | res |
|---|---|---|---|
| `GET /api/v1/regression/run` | `GET /api/regression/run` | — | `200 { verdict, summary, cases }` |

### checks
| v1 route | current | req | res |
|---|---|---|---|
| `POST /api/v1/checks/run` ⊙ | `POST /api/checks/run` | body: `check` (allow-listed; non-free ids → `400`) | `200 { checkId, ok, summary, output }` |

### library
| v1 route | current | req | res |
|---|---|---|---|
| `GET /api/v1/library/*` | `GET /api/library/*` | path: file under `logs/` | file stream (`302` bare · `403` traversal · `404` missing · `200` file) |

---

## E. What does NOT change in Phase 004
- The engine, the AI pipeline behaviour, the prompts, the stored data, the trust gates.
- The status codes each route already returns.
- The success-body shapes (per D2 recommendation).
- Storage stays file-backed — repos just put a clean seam in front of it (Postgres is Phase 005).

## F. After you approve
1. I write the detailed `phase-2/3/4.md` step files (each ending in owner QA scenarios).
2. Step 2: build the shared plumbing (error shape + context + auth slot) **test-first**.
3. Step 3: convert domains to controller → service → repo, **one at a time, test-first**, starting
   with a small clean one (catalog or checks) to prove the layering, then sessions/runs.
4. Step 4: arrange the mirrored test tree.

Each step stops for your green light. Nothing here is built yet.

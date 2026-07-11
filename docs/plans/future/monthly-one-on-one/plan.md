# Monthly 1:1 — the stage-based guided session

**Goal:** A manager runs a monthly 1:1 by walking through guided stages (prep → catch-up → requests → rating → feedback → goals → summary → private review), and every session feeds the next — promises resurface, requests carry status, goals persist, six-block scores become trends.
**Driver:** Carl
**Created:** 2026-07-11
**Status:** ⏸ **PARKED until Gate 1** (Carl's call 2026-07-11: "plan now, build at Gate 1"). Moves to `docs/plans/doing/` when the corridor test passes (2/3 managers return unprompted). No schema, no code, no migrations before that.
**Branch:** this track lives on **`work/monthly-one-on-one`** (worktree `../serolocal-monthly-one-on-one`) — Carl's call 2026-07-11. Build there; merge to `main` phase by phase after green lights.

> Source concept: [docs/ONE-ON-ONE-RUNNER-CONCEPT.md](../../../ONE-ON-ONE-RUNNER-CONCEPT.md) + Carl's old-Sero reference screenshots.
> Full approved architecture: this file. Product decisions were locked with Carl through four question rounds on 2026-07-11 — do not relitigate them.

## Done means
- Carl (internal admin) sees a "Monthly 1:1" card on the meeting-type picker; corridor managers, members and guests don't.
- He can walk a full guided session for a roster person with a step bar, auto-save, and quick-add of promises/requests/goals from any stage.
- A promise made in meeting A resurfaces in meeting B's Catch-up; a request keeps its status until resolved; goals accumulate history; six-block scores show as trends.
- The finished session is a one-page record (private review badged at the bottom) reachable from the existing run lists.
- The existing AI-interview flow is byte-for-byte untouched — all its tests stay green without modification.

## Resolved before we start — locked product decisions (Carl, 2026-07-11)

| # | Decision |
|---|---|
| 1 | New meeting type **alongside** the existing 5 — interview flow untouched. Picker label: **"Monthly 1:1"** |
| 2 | **Guided mode only** (no Advanced dense layout) |
| 3 | v1 = **manager cockpit only** — no member-facing content surfaces |
| 4 | Stages: **"Before you start" prep + Catch-up → Requests → Rating → Feedback → Goals → Summary → Review**. No Quick mode in v1 |
| 5 | Stage cards = **static coaching copy** + **mechanical** "things to discuss from previous 1:1s" bullets |
| 6 | **All three trackers in v1**: promises (owner manager/member), requests (status + category), goals (progress history) — persistent per person |
| 7 | Rating = six blocks (Tasks, Processes, Our team, Development, Fun, Fulfilment) 1–10; **member self-scores aloud, manager types them in**; optional note per block |
| 8 | **Quick-add** promise/request/goal on **every** stage |
| 9 | Exactly **two AI call sites**: (a) prep-screen focus bullets, (b) ONE end-of-session call drafting Summary + Review suggestion buckets |
| 10 | Review stage (private, after the member leaves): engagement 1–5 + last-time comparison + private notes + AI suggestions (individual/team/company). Never member-visible. Per the old-Sero screen: engagement is a **labelled slider** — Disengaged · Passive · Active · Enthusiastic · Thriving (stored 1–5) |
| 11 | **Internal first** — gated to the internal `admin` role; corridor managers keep the current flow |
| 12 | Auto-save everything (state jsonb pattern) |
| 13 | AI-drafted Summary (manager edits before saving) |
| 14 | Prep screen gets AI focus bullets **too**, on top of mechanical facts |
| 15 | Rating stage shows history: per-block averages + past sessions below the entry row, collapsible |
| 16 | Build timing: **plan now, build at Gate 1** |
| 17 | Manager's finished-session view = **one-page record template** (summary → scores + trend → trackers as they ended → feedback → private review with a "private" badge) |
| 18 | Finished Monthly 1:1s **merge into the existing lists** (manager history, person-detail "Past 1:1s", member-home) — one timeline per person |
| 19 | **Member view = list-only** (date + type + manager, no content). Member content template designed below, **built in v2** |

### Naming (collision-avoidance — deliberate, keep it)
Mechanism = **guided sessions** (`guided_sessions` table, `guided-sessions` API domain, `STAGES.GUIDED`). Avoids three existing meanings: "runner" (engine planner / persona-runs), `sessions.review` (QA verdict), `sessions.rating` (manager stars). The private Review stage's internal id is `wrapup` (UI label "Review"). Six-block scores = `block_scores` (never "rating" in code).

### Structural decision #0 — own table, never `sessions`
The `sessions` table is welded to the interview pipeline: boot-restore (`loadSessionsFromDb` → `hydrateSession`, `backend/api/session-persistence.ts`, `backend/db/sessions-store.ts`) and every list read (`backend/db/runs-store.ts`) assume the interview `state` shape. Guided sessions get their own `guided_sessions` table = zero interview code changes.

### Data model (Drizzle, `backend/db/schema.ts`; one migration per phase)
- **`guided_sessions`** (P1): org_id, manager_id, person_id (FK people, required), `stage` text (prep|catchup|requests|rating|feedback|goals|summary|wrapup|done), `state` jsonb (the whole draft: per-stage notes, ratingDraft, feedback keep/more/less, summary draft+edited, wrapup engagement/privateNotes/suggestions, prep facts/discuss/aiFocus), `engagement` int (denormalised at complete), created/updated/completed_at.
- **`tracker_items`** (P2): ONE table with `kind` enum promise|request|goal. org_id, person_id, created_by_user_id, text, owner (promises: manager|member), category (requests: growth_development|ideas_suggestions|concerns_feedback), status (per-kind sets, service-validated), `progress` int null (goals only, 0–100 — the old-Sero Goals screen shows 77% / 64% / 0%), `history` jsonb events, created_session_id. Index (person_id, kind, status). Goal statuses per the reference screen: not_started | in_progress | done | archived.
- **`block_scores`** (P3): one row per (guided_session, block); block enum tasks|processes|team|development|fun|fulfilment; score 1–10; note. Unique (guided_session_id, block); upserted by complete() from state.ratingDraft. Trends = WHERE person_id ORDER BY created_at.
- **Private review: NO table** — lives in `state.wrapup` + the denormalised `engagement` column. No member endpoint touches `guided_sessions` at all.

### Feature flag
Reuse the `admin` role (= internal Sero): `isInternalAdminIdentity` + `requireInternalAdmin` beside `isAdminIdentity` in `backend/api/middleware/require-auth.ts`. The catalog service **appends** (never inserts — `meetingTypeIndex` is positional!) the card `{label:"Monthly 1:1", kind:"guided"}` when the caller is internal. **Never touch `backend/engine/meeting-types.ts`** — persona/smoke/CLI enumerate it and `getArc("Monthly 1:1")` would throw. All guided/tracker routes also hard-403 non-internal callers. Rollout later = widen one predicate.

### Client wiring
- Picker branch in `admin/src/stages/intake.js` `renderMeetingType().confirm()`: `kind==="guided"` → `POST /api/v1/guided-sessions {personId}` → `STAGES.GUIDED` (`/guided/:id`). Free-typed name → create roster person via existing `POST /api/v1/team/people` first.
- ONE new client stage `STAGES.GUIDED` with an internal step machine (intake-SUBSTAGES precedent). Both routers + both main.js boot/popstate paths (mirror RUN_DETAIL). Module lives customer-side `frontend/src/stages/guided/`; admin cross-imports (PREPARATION pattern). All strict TS, frontend conventions, 14px floor.
- Auto-save: debounced ~600ms `PATCH`, flush on step change + visibilitychange, Saved/Saving pip. Reload-resume via the URL id.

### API surface (controller → service → co-located repo; `requireInternalAdmin` + org/manager person-fence per `backend/api/services/team/people.repo.ts`; merged_into_id resolved one hop)
- `backend/api/services/guided-sessions/`: POST create (computes mechanical prep + discuss bullets) · GET :id · GET ?personId · PATCH :id (auto-save) · POST :id/complete (upserts block_scores, denormalises engagement) · POST :id/prep-focus (AI call a, cached unless ?regenerate=1, plain JSON not SSE) · POST :id/wrapup-draft (AI call b, ONE call → {summary, suggestions}) · GET /people/:personId/block-scores.
- `backend/api/services/trackers/`: GET /people/:personId/tracker-items (grouped, ?includeArchived) · POST same · PATCH /tracker-items/:id (per-kind status validation; every change appends a history event).

### Engine adaptation (two call sites, interview pipeline untouched)
New `backend/engine/guided/`: `prep-focus.ts` (strict `{bullets: 2–3}` schema, prompt `content/prompts/guided-prep-focus.md`) + `wrapup.ts` (schema `{summary:{headline,bullets}, suggestions:{individual,team,company}}`). Reuse `callAI`/cassettes/cost (`ai-client.ts`), `splitSystemUser`/`fillPlaceholders`, `withPromptVersion`, `modelFor` with new `guided_prep`/`guided_wrapup` keys in `content/config/models.json`, `logStage` echoes to `run_artifacts` (no FK — works with a guided key). Inject as service boundaries (Prewarm pattern, `sessions.service.ts:117-146`) so tests stay model-free. NEVER require `scripts/gate.js` (executes on import).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | [Card, skeleton, auto-save](phase-1.md) | The flag-gated picker card + a walkable 8-stage shell that auto-saves and survives reload | ⬜ |
| 2 | [Trackers](phase-2.md) | Promises/requests/goals that persist per person and resurface next meeting; quick-add everywhere | ⬜ |
| 3 | [Rating + history](phase-3.md) | Six-block 1–10 entry with per-block notes; averages + past sessions below | ⬜ |
| 4 | [Feedback, private Review, prep facts](phase-4.md) | Keep/more/less feedback; the private wrap-up (engagement 1–5 + notes); mechanical prep screen | ⬜ |
| 5 | [The two AI calls](phase-5.md) | Prep focus bullets + the end-of-session Summary/suggestions draft | ⬜ |
| 6 | [Record template + list merge](phase-6.md) | The one-page finished-session record, merged into the existing run lists | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**PARKED.** Folder written 2026-07-11 from the approved plan; no code exists. Un-park ritual at Gate 1: move this folder to `docs/plans/doing/`, run the baseline (`npm run typecheck` + `npm test`, note results here), then Phase 1 only — on branch `work/monthly-one-on-one`.
✅ **All 8 old-Sero reference screens are in hand** (2026-07-11): prep "Before you start" · Guided catch-up cards · Requests list · Building-block ratings + history · "Looking to the future" feedback · **Goals ("Review N goals together", progress % + status)** · **Session wrap-up (AI summary bullets, Sarah's/Manager's actions 1–3 each, building-blocks delta sidebar, goals touched)** · **Private notes & reflection (labelled engagement slider, private-notes prompt, "Complete this 1:1")**. Details folded into the phase files.

## Parked
- **Member content template + member 1–5 session rating — FIRST v2 ITEM.** Spec (so it's never designed twice): member opens a finished Monthly 1:1 → the summary, promises from both sides, requests + statuses, goals, and their own six-block scores; **never** engagement, private notes, or AI suggestion buckets. Plus a member-authored 1–5 "was this useful" session rating (concept doc). Requires the first member-facing read endpoint on guided data — re-check the privacy fence then.
- Quick / catch-up mode (skips Rating + Feedback).
- Member pre-meeting prep capture ("here's what's on my mind").
- Advanced (dense all-at-once) presentation mode.
- Home "Continue your open Monthly 1:1" chip (v1 resumes via URL/reload only).
- People-merge migration for tracker rows (v1 resolves merge chain at read/create; a bulk re-point migration is a later nicety).
- AI-personalised stage prompts (v1 is static copy + mechanical carry-over by decision 5).
- **Typed question prompts for requests** — Carl 2026-07-11: "I just want to add the type of questions; for the requests, we can do that later." Read as: suggested discussion questions per request category (growth / ideas / concerns) when a request is opened in the meeting — add after v1, not in the Requests stage's first build.

## Risks / collisions (verified in code 2026-07-11)
1. `sessions` boot-hydration corrupts on foreign state shapes → own table (decided above).
2. Run lists read `sessions` only → guided rows invisible until Phase 6's merge; the merge must ADD a source, never modify the interview queries (their tests stay green untouched).
3. `meetingTypeIndex` is positional → card appended by the catalog layer only; engine `MEETING_TYPES` untouched.
4. `catalog.service.test.ts` deepEqual against `MEETING_TYPES` → update in Phase 1.
5. People merge (`people.merged_into_id`) → resolve chain at create/read (alias-resolve pattern).
6. Global chrome (`createSessionTopbar`/`createNotesPanel`) keys off `store.stage` → verify no-op on GUIDED in Phase 1 QA.
7. Router guards needed in BOTH apps or deep links silently bounce in one.
8. Guest lane: identity requirement keeps the card off the guest picker → confirm in Phase 1 QA.

## Cost note
Phases 1–4 and 6 are $0 (offline tests only). Phase 5 is the only paid surface: cassette replay first, then ONE live two-call happy path (~$0.05–0.35, state cost before running).

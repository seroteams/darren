# Monthly Check-in — the stage-based guided 1:1

**Goal:** A manager runs a monthly 1:1 by walking through guided stages (catch-up → requests → rating → feedback → goals → summary → private review), and every session feeds the next — promises resurface, requests carry status, goals persist, six-block scores become trends.
**Driver:** Carl
**Created:** 2026-07-11 · **Un-parked 2026-07-12** (Carl green-lit the build after approving the HTML prototype: "okay i really like it, carefully plan how we fully implement this")
**Status:** ✅ TRACK CLOSED 2026-07-14 — all 7 phases built + DB-verified; manager flow UI-walked + verified (see Current state). One residual: the Phase 7 member surface was not UI-walked (needs a member login).

> **The architecture rationale + three-role model + extensibility seam lives in [architecture.md](architecture.md)** (founder/CTO/committee deep-dive, 2026-07-12, grounded in a 3-lens code audit). Its §6 amendments are folded into the phases below.
> **The UI spec is the approved prototype:** [admin/src/stages/tests/monthly-checkin.js](../../../../admin/src/stages/tests/monthly-checkin.js) (walkable at `/test` → "Monthly Check-in"). Carl iterated it 2026-07-12 through three rounds; build EXACTLY that look and behaviour. Design language = the old-Sero runner (SeroMVP-v19), already extracted into that file.
> Source concept: [docs/ONE-ON-ONE-RUNNER-CONCEPT.md](../../../ONE-ON-ONE-RUNNER-CONCEPT.md). Original architecture verified in code 2026-07-11; product decisions locked over four question rounds + the prototype walk — do not relitigate them.

## Done means
- Carl (internal admin) sees a **"Monthly Check-in"** card on the meeting-type picker; corridor managers, members and guests don't.
- He can walk a full guided session for a roster person — 7 stages, floating bottom pill nav always visible, auto-save, reload lands him back where he was.
- A promise made in meeting A resurfaces in meeting B's Catch-up with one-tap outcomes; requests and goals live in right-hand side panels and keep status/history across meetings; six-block sliders show last time's score.
- The Summary is AI-drafted from this session's inputs + the previous check-in; the Review stage is manager-private with engagement + AI suggestion buckets.
- The finished session is a one-page record in the existing run lists; a member sees only that it happened (list-only) — but members CAN raise requests and update their own goals from their area (Phase 7).
- The existing AI-interview flow is byte-for-byte untouched — all its tests stay green without modification.

## Locked product decisions
Original 19 locked 2026-07-11; **amended by Carl's prototype walk 2026-07-12** (amendments in bold):

| # | Decision |
|---|---|
| 1 | New meeting type alongside the existing 4 — interview flow untouched. Picker label: **"Monthly Check-in"** (renamed from "Monthly 1:1") |
| 2 | Guided mode only — **confirmed: no Guided/Advanced toggle anywhere** |
| 3 | v1 = manager cockpit; **member area gets WRITE access to requests + goals (Phase 7 — Carl 2026-07-12: members must be able to raise requests and edit their goals)** |
| 4 | **7 stages: Catch-up → Requests → Rating → Feedback → Goals → Summary → Review. Prep stage CUT** (Carl: "preparation we don't need, we already have that") |
| 5 | Stage cards = static coaching copy + mechanical carry-over (promises/requests/goals surface IN their stages) |
| 6 | All three trackers in v1: promises (owner manager/member), requests (status + category), goals (progress history) — persistent per person |
| 7 | Rating = six blocks (Tasks, Processes, Our team, Development, Fun, Fulfilment), **slider 1–10 (0.5 steps, shown as "7.5")**; member self-scores aloud, manager enters them; optional note per block; **last month's score marked above the slider** |
| 8 | ~~Quick-add on every stage~~ → **add buttons live on their own stages** (Requests + Goals panels); quick-add-everywhere parked |
| 9 | **Exactly ONE AI call site** (was two): the end-of-session call drafting Summary + Review suggestion buckets **from this session's inputs + the previous check-in**. (Prep-focus call died with the Prep stage) |
| 10 | Review stage (private, after the member leaves): engagement 1–5 + last-time comparison + private notes + AI suggestions (individual/team/company). Never member-visible |
| 11 | Internal first — gated to the internal `admin` role; corridor managers keep the current flow. Widening later = one predicate |
| 12 | Auto-save everything (state jsonb pattern) |
| 13 | AI-drafted Summary (manager edits before saving) |
| 14 | ~~Prep AI focus bullets~~ — **cut with the Prep stage** |
| 15 | Rating history v1 = **last-session marker on each slider** (prototype-approved); the full averages+past-sessions table is parked |
| 16 | Build timing: green-lit 2026-07-12 (internal-only build; can't touch the corridor metric) |
| 17 | Manager's finished-session view = one-page record (summary → scores + trend → trackers as they ended → feedback → private review badged "private") |
| 18 | Finished Monthly Check-ins merge into the existing lists (manager history, person-detail "Past 1:1s", member-home) — one timeline per person |
| 19 | Member view of a session = list-only (date + type + manager, no content). Member CONTENT view stays v2 — but member request/goal WRITES are Phase 7 |
| 20 | **Requests + Goals rows open a right-hand side panel** (status, notes, next step / progress history, add-update); "+ Add" opens the same panel as a form |
| 21 | **Feedback = sequential Q&A**: Less of → More of → Learn, one at a time, answered questions stack above with a ✓ |
| 22 | **Floating bottom pill nav** (icon + label per stage) always visible on every stage; current = blue tint, visited = green ✓ |

### Naming (collision-avoidance — deliberate, keep it)
Mechanism = **guided sessions** (`guided_sessions` table, `guided-sessions` API domain, `STAGES.GUIDED`). Picker/UI label = **"Monthly Check-in"**. Avoids three existing meanings: "runner" (engine planner / persona-runs), `sessions.review` (QA verdict), `sessions.rating` (manager stars). The private Review stage's internal id is `wrapup` (UI label "Review"). Six-block scores = `block_scores` (never "rating" in code).

### Structural decision #0 — own table, never `sessions`
The `sessions` table is welded to the interview pipeline: boot-restore (`loadSessionsFromDb` → `hydrateSession`, `backend/api/session-persistence.ts`, `backend/db/sessions-store.ts`) and every list read (`backend/db/runs-store.ts`) assume the interview `state` shape. Guided sessions get their own `guided_sessions` table = zero interview code changes.

### Data model (Drizzle, `backend/db/schema.ts`; one migration per phase)
- **`guided_sessions`** (P1): org_id, manager_id, person_id (FK people, required), `stage` text (catchup|requests|rating|feedback|goals|summary|wrapup|done), `state` jsonb (the whole draft: per-stage notes, promiseOutcomes, ratingDraft, feedback lessOf/moreOf/learn, summary draft+edited, wrapup engagement/privateNotes/suggestions), `engagement` int (denormalised at complete), created/updated/completed_at.
- **`tracker_items`** (P2): ONE table with `kind` enum promise|request|goal. org_id, person_id, created_by_user_id, text, owner (promises: manager|member), category (requests: growth_development|ideas_suggestions|concerns_feedback), status (per-kind sets, service-validated: promise open|done|partly|not_done|changed · request new|in_progress|resolved · goal not_started|in_progress|done), `progress` int 0–100 (goals), `history` jsonb events, created_session_id. Index (person_id, kind, status).
- **`block_scores`** (P3): one row per (guided_session, block); block enum tasks|processes|team|development|fun|fulfilment; score **numeric(3,1)** 1.0–10.0 (sliders step 0.5); note. Unique (guided_session_id, block); upserted by complete() from state.ratingDraft. Trends = WHERE person_id ORDER BY created_at.
- **Private review: NO table** — lives in `state.wrapup` + the denormalised `engagement` column. No member endpoint touches `guided_sessions` at all.

### Feature flag ⚠️ CORRECTED per architecture.md §3.1
**There is NO "internal admin" role today** — `ADMIN_ROLES = ["admin","manager"]`, so admin AND manager both pass `requireAdmin`, and **superadmin is an email allowlist, not a role**. A naïve `role === "admin"` gate could lock Carl out (if his account is a superadmin-by-email `manager`). Define instead in `backend/api/middleware/require-auth.ts`: `isInternalIdentity(id) = id.roles.includes("admin") || isSuperadminIdentity(id)` + `requireInternalAdmin`. Client mirror `isInternalAdmin` already exists (`admin/src/state.js` ~:108) — align it to also honour `isSuperadmin`. **Phase-1 QA MUST confirm: Carl's real account sees the card; a fresh plain `manager` signup does not.** The catalog service **appends** (never inserts — `meetingTypeIndex` is positional!) the card `{label:"Monthly Check-in", kind:"guided", badge:"New"}` when the caller is internal. **Never touch `backend/engine/meeting-types.ts`** — persona/smoke/CLI enumerate it and `getArc("Monthly Check-in")` would throw. All guided/tracker manager routes hard-403 non-internal callers (Phase 7's member lane gets its own narrow, fenced endpoints). Rollout later = widen one predicate.

### Client wiring
- Picker branch in `admin/src/stages/intake.js` `confirm()`/`submit()`: `kind==="guided"` → **branch BEFORE `startSession`** (the interview path calls `getArc(label)` and would throw) → `POST /api/v1/guided-sessions {personId}` → `STAGES.GUIDED` (`/guided/:id`). Free-typed name → create roster person via existing `POST /api/v1/team/people` first.
- ONE new client stage `STAGES.GUIDED`, admin app only (internal tool): `admin/src/router.js` `/guided/:id` (mirror the `/runs/:id` regex block) + `admin/src/main.js` loaders map / `startPopstate` / `boot()` deep-link (mirror RUN_DETAIL) + the `INTERNAL_ONLY` guard set (mirror TEST/GUIDE). Frontend router untouched until Phase 7's member surface.
- Module lives customer-side `frontend/src/stages/guided/` (admin cross-imports — the PREPARATION pattern) so Phase 7 can reuse pieces. All strict TS, frontend conventions, 14px floor.
- **Stage-config-driven (the extensibility seam — architecture.md §2b):** the runner reads its stage list from `guided-arcs.ts` (`GUIDED_ARCS[0] = {slug:"monthly_check_in", stages:[catchup…wrapup], aiWrapup:true}`) — it must NEVER hardcode the 7 stages or their order. Each stage id maps to a self-contained component in a `stages/` library (`{render, stateShape, onComplete}`). This is not extra work — Monthly Check-in is built stage-driven anyway; the discipline is *not hardcoding the list*, so arc #2 = a `GUIDED_ARCS` entry reusing existing stage components. `state.v` stamped; all stage reads defensive (missing key ⇒ empty stage).
- Auto-save: debounced ~600ms `PATCH`, flush on stage change + `visibilitychange`, Saved/Saving pip. Reload-resume via the URL id.
- Port the prototype faithfully: pale-blue page, big Bricolage stage titles, Sero question cards, borderless notes cards, floating pill nav (the real page owns its layout — no body-portal hack needed), right-hand side panels.

### API surface (controller → service → co-located repo; `requireInternalAdmin` + org/manager person-fence per `backend/api/services/team/people.repo.ts`; merged_into_id resolved one hop)
- `backend/api/services/guided-sessions/`: POST create (snapshots open trackers into the session context) · GET :id · GET ?personId · PATCH :id (auto-save) · POST :id/complete (upserts block_scores, denormalises engagement, applies promise outcomes) · POST :id/wrapup-draft (THE AI call, cached in state unless ?regenerate=1, plain JSON not SSE) · GET /people/:personId/block-scores.
- `backend/api/services/trackers/`: GET /people/:personId/tracker-items (grouped, ?includeArchived) · POST same · PATCH /tracker-items/:id (per-kind status validation; every change appends a history event). Phase 7 adds the fenced member lane (see phase-7.md).

### Engine adaptation (ONE call site, interview pipeline untouched)
New `backend/engine/guided/wrapup.ts` — `generateGuidedWrapup`: input = all stage notes + promise outcomes + block scores + tracker changes this session + the PREVIOUS completed check-in's summary/scores; ONE call; schema `{summary:{headline,bullets[]}, suggestions:{individual[],team[],company[]}}`; prompt `content/prompts/guided-wrapup.md`; `modelFor("guided_wrapup")` (new key in `content/config/models.json`); `logStage` echoes to `run_artifacts`. Reuse `callAI`/cassettes/cost (`ai-client.ts`), `splitSystemUser`/`fillPlaceholders`, `withPromptVersion`. Inject as a service boundary (Prewarm pattern, `sessions.service.ts:117-146`) so tests stay model-free. NEVER require `scripts/gate.js` (executes on import). Engine honesty: raw output surfaced; schema failure = visible "couldn't draft this", never a hardcoded rewrite.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | [Card, runner shell, auto-save](phase-1.md) | The flag-gated picker card + the real 7-stage runner (prototype look) that auto-saves and survives reload | ✅ |
| 2 | [Trackers + side panels](phase-2.md) | Promises/requests/goals that persist per person and resurface next meeting; the right-hand panels | ✅ |
| 3 | [Rating + last-time markers](phase-3.md) | Six sliders saving real scores; last session's score marked; complete() writes block_scores | ✅ |
| 4 | [Feedback, Summary (manual), private Review](phase-4.md) | Sequential Q&A feedback; manual summary; the private wrap-up; finishing a session | ✅ |
| 5 | [The AI call](phase-5.md) | End-of-session Summary draft + private suggestion buckets — **the only paid phase** | ✅ |
| 6 | [Record + list merge](phase-6.md) | The one-page finished record, merged into the existing run lists | ✅ |
| 7 | [Member requests + goals](phase-7.md) | Members raise requests and update their own goals from their area (first member write on tracker data) | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested + Carl green-lit)

## Current state
**Phase 1 ✅ green-lit 2026-07-12 (Carl: "A"; browser walk waived — verified via a real local-DB round-trip, his call).** The flag-gated card, the stage-config-driven 7-stage runner (ported from the prototype), and auto-save + reload-resume are built on `work/monthly-one-on-one` (`ea5d2a49`). typecheck clean · `npm test` **130/131** (the 1 fail is the known-environmental `test-persona-bench` — untracked `_runtime` questions absent in a fresh worktree) · admin build resolves the runner chunk · create → patch(typed notes) → read-back → fence(404) proven on real Neon.
- **Phase 2 ✅ green-lit 2026-07-13** (Carl: "keep going a"; walk waived — real-DB round-trip incl. the promise loop, `372806e3`): `tracker_items` table + service, the real Catch-up promise loop, and Requests/Goals side panels that persist. Runner fetches trackers live.
- **Phase 3 ✅ green-lit 2026-07-13** (Carl: "go to end"; delegated; `d7eef92a`): `block_scores`, validated scores, Rating last-time marker. Real-DB round-trip.
- **Phase 4 ✅** (`2502dd7a`): engagement "last time: N/5" + completed read-only banner (feedback/summary/wrapup were already built in P1/P3). Real-DB round-trip (engagement + completed_at denormalised).
- **Phase 5 ✅** (`16d37b7e`): the ONE AI call — `generateGuidedWrapup` (Summary + private suggestions), cached (no double-spend), honest failure. **OFFLINE cassette ($0) + ONE LIVE call (~$0.05)** drafting a genuinely grounded summary; run_artifacts written.
- **Phase 6 ✅** (`73811ac1`): finished-record view at `/guided/:id` + run-list merge (add-a-source; interview queries + tests untouched). Real-DB round-trip (guided row in the manager list).
- **Phase 7 ✅** (`9fc6e4f5`): the fenced member lane (`/me/*`) — raise a request, update own goal; hard fence (own person + kind∈{request,goal}, never promises/other/guided). Fence unit tests + real-DB round-trip.
- **ALL 7 PHASES BUILT + DB-VERIFIED, sign-off delegated (Carl "go to end as i am going to bed").** Every phase: typecheck clean · `npm test` 131/132 (the 1 fail is the known-environmental `test-persona-bench`) · admin build resolves · a real local-Neon round-trip.
- **✅ MANAGER-FLOW UI WALK DONE 2026-07-14 (Carl green-lit the close).** The whole runner was run on isolated ports and eyeballed: all 7 stage screens render with real per-person data (real name, real promise/request/goal rows), **zero console errors**; the **Phase 5 AI Summary is grounded + honest** (cited the real requests/goal, said "no scores/feedback recorded this month" — no hallucination) and the private suggestion buckets render; **Complete works** (`done` + engagement saved); the **Phase 6 record merges** into the manager's history (`/runs/mine`, `kind:guided`). One paid AI call fired (~$0.05, authorized). The earlier-suspected "interview topbar bleed" on the guided stage was a **false alarm** — that chrome is present-but-hidden, not rendered.
- **⚠️ The ONE residual (honest):** the **Phase 7 member surface** (members raise requests / edit their own goals from *their* area) was **NOT UI-walked** — it needs a member-account login. Its data layer + fences are unit-tested + DB-verified; only its member-side pixels are un-eyeballed. Track closed on the manager flow; walk the member side with a member login before relying on it in front of a real member.
- Build runs on branch `work/monthly-one-on-one` (the dedicated worktree). The plan's earlier `work/monthly-checkin` name was superseded — same work, existing branch reused.
- ⚠️ The shared top-level trackers (STATUS.md, SERO_BOARD.md) live in `main` and currently carry other sessions' uncommitted edits, so they're **not** updated from this worktree (safe-commit: never sweep foreign work). They reconcile when this branch merges to main.

## Parked
- **Member CONTENT view of a finished session + member 1–5 session rating — FIRST v2 ITEM.** Spec (so it's never designed twice): member opens a finished Monthly Check-in → the summary, promises from both sides, requests + statuses, goals, and their own six-block scores; **never** engagement, private notes, or AI suggestion buckets. Plus a member-authored 1–5 "was this useful" session rating. (Phase 7 covers only request/goal writes, NOT session content.)
- Quick-add promise/request/goal from every stage (decision 8 rollback — add lives on the owning stages for now).
- Full rating history table (averages + collapsible past sessions) — v1 ships the last-session marker only.
- Quick / catch-up mode (skips Rating + Feedback).
- Member pre-meeting prep capture ("here's what's on my mind").
- Home "Continue your open Monthly Check-in" chip (v1 resumes via URL/reload only).
- People-merge migration for tracker rows (v1 resolves merge chain at read/create).
- Widening the type beyond internal admins — after the corridor test resolves.

## Risks / collisions (verified in code 2026-07-11–12)
1. `sessions` boot-hydration corrupts on foreign state shapes → own table (decided above).
2. Run lists read `sessions` only → guided rows invisible until Phase 6's merge; the merge must ADD a source, never modify the interview queries (their tests stay green untouched).
3. `meetingTypeIndex` is positional AND `sessions.service.ts start()` calls `getArc(MEETING_TYPES[idx].label)` → the guided card exists ONLY in the catalog service response; intake must branch before `startSession`.
4. `catalog.service.test.ts` deepEquals `MEETING_TYPES` → update in Phase 1 (tolerate `kind` + the appended internal-only card).
5. People merge (`people.merged_into_id`) → resolve chain at create/read (alias-resolve pattern).
6. Global chrome (`createSessionTopbar`/`createNotesPanel`) keys off `store.stage` → verify no-op on GUIDED in Phase 1 QA.
7. Guest lane: identity requirement keeps the card off the guest picker → confirm in Phase 1 QA.
8. Onboarding meeting type was REMOVED 2026-07-12 (4 interview types now, not 5) — don't hardcode counts.
9. Phase 7 opens the first member WRITE path on tracker data → fence check: member sees/writes only `kind in (request, goal)` rows for THEIR person record (`people.user_id = caller`), never promises, never another person, never guided_sessions.

## Cost note
Phases 1–4, 6, 7 are $0 (offline tests only). Phase 5 is the only paid surface: cassette replay first, then ONE live single-call happy path (~$0.05–0.35, state cost before running; a 2nd live run needs Carl's yes).

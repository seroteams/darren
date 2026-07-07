# Sero — Overnight FULL QA Pass — Raw Log

**Run date:** 2026-07-07 (overnight, unattended)
**Operator:** Claude (Opus 4.8), autonomous
**Budget:** 4 paid pipeline runs (~$1.40), pre-approved. Everything else free.
**Rule:** Honesty first — every failure logged plainly. ✅ pass / ⚠️ warn / ❌ fail.

This is the raw append-as-I-go log. The visual dashboard is built from this at `NIGHT-TEST-REPORT.html`.

---

## Phase 0 — Baseline (free) — ✅ done

Snapshot of the tree **before** any QA touched it. Pre-existing failures listed here are **not** tonight's regressions.

**`git status`** — dirty, as expected. On branch `main`.
- 10 modified (tracked): `.claude/skills/reviewrun/SKILL.md`, `CLAUDE.md`, `admin/src/stages/admin-feedback.ts`, `admin/src/stages/intake.js`, `admin/src/ui/stage-data-tab.js`, `backend/api/services/sessions/sessions.service.test.ts`, `backend/api/services/sessions/sessions.service.ts`, `content/questions/_index.json`, `docs/PARALLEL-SESSIONS.md`, `scripts/new-worktree.ps1`
- 8 untracked: `admin/src/styles/feedback-inbox.css`, 4 × `content/questions/_runtime/q_*.yaml`, `docs/NIGHT-TEST-PROMPT.md`, plus my 2 report files.

| Check | Command | Result | Notes |
|---|---|---|---|
| Offline tests | `node scripts/run-tests.js` | ⚠️ **82/83** | 1 pre-existing FAIL (below) |
| Typecheck (root) | `tsc --noEmit` | ✅ PASS | exit 0, clean |
| Typecheck (admin) | `tsc --noEmit -p admin/tsconfig.json` | ✅ PASS | exit 0, clean |
| Lint | `eslint .` | ❌ **44 problems** (42 err, 2 warn) | mostly config noise (below) |
| Replay `priya-biweekly-checkin` | `--fixtures-only` | ✅ PASS | 9/9 answers, meeting type resolves |
| Replay `tom-performance-feedback` | `--fixtures-only` | ✅ PASS | offline checks pass |
| Replay `ahmed-growth-career-plan` | `--fixtures-only` | ✅ PASS | offline checks pass |
| Replay `james-something-feels-off` | `--fixtures-only` | ✅ PASS | offline checks pass |

**⚠️ ID correction (matters for Phase 4):** the prompt's replay IDs `biweekly-priya / performance-tom / growth-ahmed / feels-off-james` are **gate golden-case IDs**, not `replay-scenario` IDs — they return "Scenario not found". I confirmed all four ARE valid in `evals/golden/_index.json`, so **the Phase 4 paid commands are correct as written**. For the Phase 0 offline replays I used the equivalent batch personas (`priya-biweekly-checkin`, `tom-performance-feedback`, `ahmed-growth-career-plan`, `james-something-feels-off`) — same people, same 4 meeting types.

**Pre-existing FAIL #1 — `test-replay-regression.js` (offline suite).**
```
verdict PASS → FAIL   new safety failure: FOCUS_SHAPE_LEAK   (×2 scenarios)
```
Cause: commit `c96c72f1` added the `FOCUS_SHAPE_LEAK` trust-gate **after** the replay regression baselines were captured, so the new gate now fires on stored baselines → PASS→FAIL. This is baseline drift from a recently-added gate, not a broken feature. **Action for Carl:** re-capture the replay regression baseline (`replay-capture`) so it reflects the new gate.

**Pre-existing FAIL #2 — `eslint .` is red (44 problems).** Breakdown:
- **34 errors** = `frontend/dist/assets/*.js` — **build artifacts that shouldn't be linted at all.** The flat ESLint config doesn't ignore `frontend/dist/`. Pure config gap, zero real code impact.
- **8 errors** = ESM parse errors (`'import'/'export' may appear only with sourceType: module`) in `frontend/{postcss,tailwind,vite}.config.js`, `frontend/src/{main,router}.js`, `frontend/src/ui/app-nav.js`, `shared/{api,sse}.js`. The flat config doesn't set `sourceType: module` for the `frontend/` + `shared/` subtrees. Config gap.
- **2 warnings** = genuine dead vars: `admin/src/stages/personas.js:270` (`personas` unused), `admin/src/stages/questioning.js:207` (`e` unused).
- **Verdict:** `npm run lint` is effectively unusable as a gate on this repo right now — 42 of 44 are config problems, not code. Worth a small fix (add `frontend/dist` to ignores + `sourceType` for the ESM subtree). Flagging as a real find but **pre-existing**.

**Baseline summary:** tests 82/83 (1 known gate-drift fail), both typechecks green, lint red on config only, all 4 offline replays green. Nothing here is caused by tonight's QA.

---

## Phase 1 — API layer (free endpoints) — ✅ done

**Server used:** the already-running API on **port 3001** (PID 63188 — Carl left it up; I did *not* start it, so I won't stop it in cleanup). Confirmed it's the current build via `GET /api/version` → `build 16deceba`, committed 2026-07-06T23:41. It matches current source, so results are trustworthy.

**Key correction to the prompt's expectations:** most "health/catalog" GETs are **not** public — the current `server.ts` wraps them in `adminV1` (admin OR manager) or `superadminV1` (email allowlist). So a **401 logged-out is the correct, secure result**, not a failure. Only `/meeting-types` and `/personas` are genuinely public. I scored "auth-gated correctly?" against the *real* route wrapping, not the prompt's optimistic "expect 200".

### Logged-out GET sweep

| Endpoint | Method | Status | Gated correctly? | Shape OK? | Notes |
|---|---|---|---|---|---|
| `/heartbeat` | GET | 401 | ✅ (adminV1) | ✅ | admin/manager only — 401 correct |
| `/pipeline/status` | GET | 401 | ✅ (adminV1) | ✅ | |
| `/meeting-types` | GET | **200** | ✅ public | ✅ | `{types:[…]}`, full catalog |
| `/personas` | GET | **200** | ✅ public | ✅ | `{personas:[…]}` |
| `/persona-runs/current` | GET | 401 | ✅ (adminV1) | ✅ | |
| `/library` | GET | 401 | ✅ (adminRaw) | ⚠️ | legacy `{"error":"Not signed in"}` shape, not v1 `{error:{code,message}}` |
| `/arcs` | GET | 401 | ✅ (adminV1) | ✅ | |
| `/role-lexicons` | GET | 401 | ✅ (adminV1) | ✅ | |
| `/lexicon/promotions/pending` | GET | 401 | ✅ (adminV1) | ✅ | |
| `/runs/recent` | GET | 401 | ✅ | ✅ | |
| `/runs/finished` | GET | 401 | ✅ | ✅ | |
| `/runs/mine` | GET | 401 | ✅ | ✅ | login required (any role) |
| `/runs/clonable` | GET | 401 | ✅ | ✅ | |
| `/runs/about-me` | GET | 401 | ✅ | ✅ | |
| `/team/people` | GET | 401 | ✅ | ✅ | |
| `/team/linkable-users` | GET | 401 | ✅ | ✅ | |
| `/team/aliases` | GET | 401 | ✅ | ✅ | |
| `/admin/errors` | GET | 401 | ✅ (superadminV1) | ✅ | |
| `/admin/feedback` | GET | 401 | ✅ (superadminV1) | ✅ | |
| `/admin/registered` | GET | 401 | ✅ (superadminV1) | ✅ | |
| `/admin/users/:id/runs` | GET | 401 | ✅ (superadminV1) | ✅ | |
| `/api/version` | GET | 200 | ✅ public | ✅ | build id (intentionally public) |

**🔒 Security verdict: PASS.** Every gated endpoint returns **401 with zero data** logged-out. Nothing leaks unauthenticated. The two 200s are the intended public catalog.

### Auth cycle (full loop) — ✅ all correct

| Step | Call | Status | Result |
|---|---|---|---|
| 1 | `POST /auth/register` | **201** | Created user `qa-night-manager@seronight.test`, role **`manager`**, new org auto-created (signup = org owner) |
| 2 | `POST /auth/login` | **200** | Sets `sero_session` **HttpOnly** cookie (7-day TTL) |
| 3 | `GET /auth/me` (cookie) | **200** | `roles:["manager"], isSuperadmin:false` — correct identity |
| 3b | gated GETs with cookie | 200/403 | heartbeat 200, team/people 200 `{people:[]}`, runs/mine 200, runs/recent 200, role-lexicons 200 — manager passes `adminV1`. **`/admin/registered` → 403 "Superadmins only"** (correct: manager ≠ superadmin) |
| 4 | `POST /auth/logout` | **200** | `{ok:true}`, clears cookie + deletes session row |
| 4b | `GET /auth/me` after logout | **401** | Session revoked **server-side**, not just client-forgotten ✅ |

### Writes (smoke, throwaway data)

| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/feedback` | POST | **200** `{ok:true}` | field is `message` (not `note`); login required — anonymous would 401 |
| `/errors` | POST | **200** `{ok:true}` | public + origin-guarded + rate-limited; dummy `[QA NIGHT TEST]` error logged |
| `/team/rename` (logged-out) | POST | **401** | ✅ rejects unauthenticated |
| `/team/merge` (logged-out) | POST | **401** | ✅ rejects unauthenticated |
| `/role-lexicons/term` (logged-out) | POST | **401** | ✅ rejects unauthenticated |
| `/lexicon/promotions` (logged-out) | POST | **401** | ✅ rejects unauthenticated |

**Phase 1 summary:** 22/22 GETs behave correctly (2 public 200 + 20 correctly gated 401), full auth loop clean, HttpOnly cookie, server-side session revocation, all mutations reject unauthenticated. **One cosmetic ⚠️:** `/library` returns the legacy `{error:"…"}` error shape instead of the v1 `{error:{code,message}}` shape — harmless but inconsistent.

**🧹 Test data created (for cleanup — Phase 5):**
- User `qa-night-manager@seronight.test` (id `58d40430-3e1e-4580-a1b8-aa80de4da282`) + its auto-created org (id `6a56b4d4-46a6-413e-8e12-5c8387a9e0a9`) + login session rows.
- 1 feedback note tagged `[QA NIGHT TEST]`.
- 1 error log tagged `[QA NIGHT TEST]` (source `browser`).

---

## Phase 2 — Full live page + toggle walk — ✅ done

**Setup:** admin app served fresh on **:3007** (`sero-web-alt`, my preview server) and customer app on **:3002** (`sero-customer`), both proxying to the API on :3001. The dev browser auto-loads a persisted **manager** session (`manager@seroteams.com`); I switched identities (manager / admin `carl` / member) via the dev login to walk role-specific views. The `localhost` session cookie is **shared across ports**, so a login on one app applies to both.

**Method note (honest limitation):** `preview_screenshot` **stalls (30s timeout)** in this session — the known render-queue/animation artifact after heavy scripted eval interaction (and `/universe` runs an infinite CSS animation). The renderer itself stayed alive (`preview_snapshot` worked throughout). So I walked every route with a **DOM health-probe** (render length, control counts, **smallest on-page font px**, error-text detection) via a same-origin iframe walker + accessibility snapshots + computed-style reads, rather than screenshots. **No screenshots are embedded** — every result below is from live DOM inspection.

### Admin app (:3007) — 30 routes

**Headline: every page renders, the 14px floor holds on EVERY page (smallest font measured was always ≥14px), and there were ZERO console errors across the entire walk.**

| Route | Renders | Notes |
|---|---|---|
| `/home` | ✅ | member-home "Your 1:1s" view |
| `/` (Start) | ✅ | "Start a 1:1 prep session" + recent sessions |
| `/team` | ✅ | Team roster ("Tidy up" / "Add someone") |
| `/runs` | ✅ | Past 1:1s list (shows real runs) |
| `/new` | ✅ | Intake "Who are you prepping for?" |
| `/flow` `/focus` `/prepare` `/bank` `/interview` `/evaluate` `/briefing` `/debrief` | ✅ (redirect) | Flow stages **correctly redirect to `/`** without an active session (expected — a live session is required, and starting one is paid) |
| `/compare` | ✅ (admin) | "Compare runs / Test lane" |
| `/library` | ✅ (admin) | "Library", 48 controls |
| `/universe` | ✅ (admin) | Animated visual view — minimal text by design (this is what stalls screenshots) |
| `/tasks` | ✅ (admin) | "Tasks / Your planner", rich (89 controls) |
| `/personas` | ✅ (admin) | "Test engine" |
| `/guide` | ✅ (admin) | "Sero — operator guide", 14k chars |
| `/lexicon` | ✅ (admin) | "Coaching phrases" |
| `/job-lexicons` | ✅ (admin) | "Role words", rich |
| `/meeting-arcs` | ✅ (admin) | "Meeting arcs / Configure" |
| `/admin/errors` | ✅ (superadmin) | "Error log" — my `errW` probe flagged "Cannot read" but that's the **error-log page displaying past error records** (its own content, not a page bug) |
| `/admin/feedback` | ✅ (superadmin) | "Feedback inbox" (contains my `[QA NIGHT TEST]` note) |
| `/admin/registered` | ✅ (superadmin) | "User management" (caught mid-load: "Loading the alpha…") |
| `/about` `/privacy` `/feedback` | ✅ | Content pages render fully |
| `/login` `/register` | ✅ (redirect) | Already-logged-in caller **correctly bounced to `/`** |

**Manager-view gating (walked as `manager@seroteams.com`):** internal-only routes (`/library`, `/personas`, `/universe`, `/compare`, `/tasks`, `/guide`, `/lexicon`, `/job-lexicons`, `/meeting-arcs`) **all correctly redirect a manager to Home**, and the internal-tool nav items (Library, Universe, User management, Error log…) are **hidden** from the manager (`visible:false`, width 0). Superadmin `/admin/*` routes bounce a non-superadmin. Matches the backend gating from Phase 1.

### Customer app (:3002) — renders cleanly

Walked as **manager** and **member**. All customer routes render (`/home`, `/team`, `/runs`, `/new`, `/about`, `/privacy`, `/feedback`), leaner nav (26–30 controls vs admin's 37–48), 14px floor held, zero console errors. The customer app has its **own** router (`frontend/src/router.js`): a member intentionally gets **Home · Team · Runs + the prep flow** (`/new`) — a deliberately different model than the admin app's read-only member. `/interview` and `/run/:id` correctly bounce a member to Home.

### Toggles / controls / responsive / dark

| Check | Result |
|---|---|
| Tab group (Notes/Sending/Received/Rules on run panel) | ✅ proper single-selection `aria-selected`; clicking a tab selects it |
| Nav item visibility by role | ✅ internal items hidden from manager/member |
| Mobile 375px (home/runs) | ✅ **no horizontal overflow** (`scrollWidth == innerWidth`) |
| Dark mode (`prefers-color-scheme: dark`) | ⚠️ **not implemented** — app stays light (`bodyBg rgb(245,250,253)`) under the dark preference. Design choice / missing feature, not a crash. |
| Failed network requests | Admin: only `net::ERR_ABORTED` = my iframe nav aborting in-flight fetches (test artifact, not app failures). Customer(member): `403` on `/team/people`,`/runs/recent`,`/heartbeat` = **correct member gating**. |

### Phase 2 issues found (all low/cosmetic — nothing blocking)
- ⚠️ **No dark mode** — app ignores `prefers-color-scheme: dark`, renders light-only.
- ⚠️ **Cold internal deep-link flash** — a manager cold-loading an internal deep-link (e.g. `/universe`) sees an empty "Session" shell for up to ~2s before the redirect fires (async boot). Low UX nit.
- ⚠️ **Customer `/team` for a member fires `/team/people` → 403** — the member's Team page calls the manager endpoint (which correctly 403s) instead of a member-appropriate one; likely renders an empty/errored team list for the member. Minor.
- ⚠️ **`/library` legacy error shape** (from Phase 1) — cosmetic API inconsistency.
- ℹ️ **Screenshots unavailable** this session (render-queue stall artifact) — walk done via DOM inspection.

---

## Phase 3 — Auth & role flows — ✅ done

Covered via the identity-switched walk (dev logins: `manager@` / `carl@`=admin+superadmin / `member@`) plus the Phase 1 API-gating loop.

| Check | Result |
|---|---|
| Register + login manager | ✅ (Phase 1: 201 + HttpOnly cookie) — also `member@` verified |
| Manager landing + reach | ✅ Manager reaches `/`, `/team`, `/runs`, `/new`; internal tools hidden + bounced |
| Member landing | ✅ Member lands on `/home` (customer app) / `/runs` (admin app), read-only "Your 1:1s" |
| Member bounced from manager screens | ✅ Admin app: `/`, `/interview`, `/run/:id` bounce a member. **Backend is the real wall:** member gets **403** on `/team/people`, `/runs/recent`, `/heartbeat`; only `/runs/mine`, `/runs/about-me`, `/team/aliases` return their own data (200) |
| Member can't see manager data | ✅ **No cross-member data leak** — every manager/admin data endpoint 403s a member |
| Admin/internal pages require admin | ✅ Internal pages need internal-admin (`admin` role); a manager is bounced. Superadmin `/admin/*` need the email allowlist (403 for manager) |
| Logout → protected pages redirect | ✅ (Phase 1: post-logout `/auth/me` → 401, session revoked server-side) |

**Role model confirmed:** `manager` = end user (reaches console tooling via `adminV1`, runs 1:1s); `admin` (internal, `carl`) = internal toolset + superadmin; `member` = read-only own-runs (admin app) or Home/Team/Runs+prep (customer app). **Security verdict: PASS — gating is enforced at the backend, the SPA bounce is a secondary convenience layer.**

**🧹 Note for cleanup:** the browser sessions are left logged in as manager (:3007) / member (:3002) via the shared `localhost` cookie — no data created, just a session cookie.

---

## Phase 4 — 4 PAID live pipeline runs — ✅ done (4/4 PASS)

Ran the full engine on all 4 meeting types, one at a time, smallest command each (`node scripts/gate.js --only <case>`). **All four PASS, zero hard-fails, zero trust-check warnings, full engagement read (9/9 note turns, no partial read).** ~$1.40 spent (4 × ~$0.35). No retries needed. Stopped at 4.

> ⚠️ **Read this "4/4 PASS" as a single-roll snapshot, not a stability guarantee.** The post-QA verify exercise (below) later re-rolled `performance-tom` and it **hard-failed `FOCUS_SHAPE_LEAK`**, then passed on the next roll. The gate is **nondeterministic** — a fraction of rolls trip intermittent focus-point shape failures a single roll won't show. See "Learnings" at the end.

| # | Case | Meeting type | Verdict | Hard-fails | Warnings | Wall-clock | Run log dir |
|---|---|---|---|---|---|---|---|
| 1 | `biweekly-priya` | Bi-weekly (competencies excluded) | ✅ **PASS** | none | none | **58s** | `logs/july/2026_Jul07_01-39-735c…107f` |
| 2 | `performance-tom` | Performance & feedback | ✅ **PASS** | none | none | **65s** | `logs/july/2026_Jul07_01-40-22b4…1b53` |
| 3 | `growth-ahmed` | Growth & career plan | ✅ **PASS** | none | none | **58s** | `logs/july/2026_Jul07_01-41-151e…bf36` |
| 4 | `feels-off-james` | Something feels off (competencies excluded) | ✅ **PASS** | none | none | **57s** | `logs/july/2026_Jul07_01-42-9a26…c306` |

**Trust-check metrics per run** (deterministic quality signals from the gate):

| Case | mean | question_specificity | plan_thread_follow | plan_delta_accuracy | opener_link | on_brief |
|---|---|---|---|---|---|---|
| biweekly-priya | 0.76 | 1.00 | 0.50 | 0.78 | 1.00 | 0.71 |
| performance-tom | 0.64 | 1.00 | 0.25 | 0.67 | 1.00 | 1.00 |
| growth-ahmed | 0.71 | 1.00 | 0.25 | 0.89 | 1.00 | 0.60 |
| feels-off-james | 0.75 | 1.00 | 0.375 | 0.89 | 1.00 | 0.50 |

**Cross-run signal:** `question_specificity` and `opener_link` are perfect (1.00) everywhere — questions are specific and openers link to the brief. The **weakest metric across all four is `plan_thread_follow` (0.25–0.50)** — the plan-turn doesn't consistently follow the prior answer's thread. `on_brief` also swings (0.50–1.00). These are the quality edges to sharpen (detailed in Phase 4b). None crossed a hard-fail line, so the gate is green.

**Actual API cost (from each run's `cost.json`):** $0.385 + $0.398 + $0.391 + $0.396 = **$1.57 total** (14 model calls/run, ~155k prompt tokens each). Marginally above the ~$1.40 estimate (~$0.393/run vs the $0.35 assumed) — but exactly the 4 pre-approved runs, no extras. **No 5th run.**

---

## Phase 4b — Deep run assessment + quality score — ✅ done

Each run's full stage tree (`00b-role-profile` → `05-evaluation/final.json`, plus every `04-dynamic-answers/NN-turn.json`, `transcript.json`, `axis-state.json`) was read in full and scored 0–100 across the 7 weighted dimensions (aligned to the real rules in `evals/trust-checks.ts`). Scoring ran as 4 parallel deep-read agents.

### Scorecard — **average 89.5 / 100**

| Dimension (max) | biweekly-priya | performance-tom | growth-ahmed | feels-off-james |
|---|---|---|---|---|
| Grounding / evidence (20) | 18 | 17 | 18 | 19 |
| No leakage (20) | **20** | 19 | **20** | 17 |
| Question integrity (15) | 14 | 14 | 14 | **15** |
| Thread coherence (15) | 9 | 9 | 9 | 12 |
| No overdiagnosis on thin (10) | **10** | 9 | 9 | **10** |
| Briefing completeness (10) | **10** | **10** | **10** | **10** |
| Honesty / no masking (10) | 9 | 9 | 9 | 9 |
| **TOTAL** | **90** | **87** | **89** | **92** |

**Strongest dimensions (all 4):** briefing completeness is a perfect 10/10 everywhere (complete schema — `headline`, `summary_bullets`, `understanding_paragraph`, `axes`, `brutal_truth_*`, `next_actions`, `watch_for`, `engagement_read`; zero placeholders confirmed by independent scan), question integrity 14–15, grounding 17–19.

**⚠️ Weakest dimension (systemic): Thread coherence — 9/15 on three of four runs.** All four agents independently found the same failure mode: the Q&A planner threads well for ~4 turns, then **reverts to generic seed questions that ignore the live answer**, producing an off-topic pivot mid-session. This is the same signal the deterministic gate flags as `plan_thread_follow 0.25–0.50`. It's the #1 engine quality edge to sharpen — and it never crosses a hard-fail, so the gate stays green while the conversation quietly drifts.

### Per-run: verdict + top strength + top weakness (with quotes)

**biweekly-priya — 90/100.** _Clean, tightly grounded bi-weekly; zero leakage; complete schema._
- ✅ Anchored, not inferred: *"A real pattern, act on it: 'what she's owning next quarter' and 'similar work for months' point to stalled stretch."*
- ✅ Arc gate held — no competency vocab in a bi-weekly (independent scan: **0 "competenc" hits** in the shipped briefing); engine marker `[THREAD-DEFERRED-WINDDOWN]` stayed inside the private turn note, never surfaced.
- ⚠️ Thread broke around the migration-win turn (Q *"What made the migration plan and cutover go so well…"* → answer pivoted to mentoring); focus-point stage self-flagged `passed:false` (a `suggestedAction` scheduled post-meeting instead of Before/During).

**performance-tom — 87/100.** _Strong, honest, leak-free; docked for a mid-session thread dip and a source-attribution slip._
- ✅ High-confidence axis only after real evidence: *"a defining signal: he said 'this team's bar still feels fuzzy' and kept defaulting to safe, local execution."*
- ❌ **Grounding slip worth Carl's eye:** the briefing attributes **Tom's own session answers to his manager's written note** — *"…his own note says 'this team's bar still feels fuzzy'…"* — but that phrase is Tom's turn-2 transcript answer, not the manager's note. A source mislabel (says "note" when it was a live answer). Didn't trip the gate.
- ⚠️ Turns 5–7 fired generic seed questions (recovery/pace) that ignored Tom's live cross-team-judgment thread.

**growth-ahmed — 89/100.** _Trustworthy, well-grounded, honest wellbeing softening._
- ✅ Honest softening (not masking): the raw model over-read wellbeing; the guard correctly downgraded it — *"This didn't come up in the conversation — not enough signal to read."*
- ⚠️ **Partial arc coverage:** of the 5 Growth stages, only **anchor / aspiration / commitment** were served — **gap and investment were never walked**, so the closing *"first concrete move"* lands without the trade-off stage.
- ⚠️ Mid-session reset to seed questions (turn-6 recovery question answered with a growth aspiration).

**feels-off-james — 92/100 (top run).** _Gate-clean feels-off: grounded, competency-free per the arc gate, coherent thread, honest about untested ground._
- ✅ Genuinely non-repeating thread — each probe grounds in the prior answer: *"What is mentoring giving you right now that the rest of the role isn't?"*
- ✅ Honest about its own gap: *"This session did not test whether the mentoring program is a redirect away from his core path or healthy stretch."*
- ⚠️ **Role-profile vocab bled into PREP copy** (not the shipped briefing, didn't trip the gate): *"What a Director can do next is often constrained by portfolio scope and stakeholder trust…"* — real prep-stage leakage worth tightening.

### Rendering QA (free) — ✅ clean
Loaded a completed run into `/run/:id` (the review page). Result: **renders cleanly — no raw JSON blob, no placeholders (`undefined`/`NaN`/`[object Object]`/TODO all absent), no engine/arc/role-profile/competency leakage in user-facing copy, 14px floor held (min 14px).** (The 4 gate runs themselves aren't in the runs API — they're offline eval logs, 404 on `/runs/:id` — so rendering was verified on a live loadable briefing-stage run, which is the same briefing template.)

---

## Phase 4c — Speed & responsiveness — ✅ done

### Pipeline speed (Phase 4 wall-clock)
| Run | Wall-clock |
|---|---|
| biweekly-priya | 58s |
| performance-tom | 65s (slowest) |
| growth-ahmed | 58s |
| feels-off-james | 57s |
| **Average** | **59.5s** |

All four **well under the ~90s flag.** Slowest is performance-tom at 65s. Each run makes 14 model calls; the dominant stage is the 9-turn dynamic Q&A. No run flagged.

### App responsiveness (Navigation Timing, warm cache)
| Page | Page load | Slowest API request | Flag |
|---|---|---|---|
| `/` (home) | 147ms | `/auth/me` 286ms | ✅ |
| `/team` | 75ms | `/team/people` **801ms** | ✅ (<2s) |
| `/runs` | 98ms | `/runs/mine` **801ms** | ✅ (<2s) |
| `/new` | 76ms | `/team/people` **891ms** | ✅ (<2s) |
| `/library` | 119ms | `/runs/finished` 696ms | ✅ |
| `/tasks` | 89ms | `/regression/run` 47ms | ✅ |
| Tab-switch interaction | instant (<50ms) | — | ✅ |

**No flags:** every page load < 3s (warm loads are 75–147ms — very fast), every API request < 2s. The **slowest endpoints are `/team/people` and `/runs/mine` (~0.8–0.9s)** — DB-backed queries; still comfortably under threshold but the two to watch if the dataset grows. (Note: warm-cache page loads; first cold load pays the vite chunk fetch. FCP wasn't capturable in the iframe measurement context.)

---

## Phase 5 — Tidy up — ✅ done

**Test data removed (verified via DB re-query → 0 matches):**
- ✅ Deleted user `qa-night-manager@seronight.test` (+ its auto-created org, 0 other users/people/runs).
- ✅ Deleted 1 feedback note (`[QA NIGHT TEST]`).
- ✅ Deleted 1 error log (`[QA NIGHT TEST]`).
- (0 stray auth sessions — logout had already revoked them.)
- Cleanup ran a precise, marker-scoped delete (dry-run confirmed first). Sero looks untouched.

**Preview servers stopped:**
- ✅ Stopped my 2 preview servers: `sero-web-alt` (:3007) and `sero-customer` (:3002).
- ⛔ **Left running (NOT mine):** the API on **:3001** (PID 63188) and admin web on **:3000** (PID 128756) — Carl's own dev servers, untouched.

**Working tree — honest accounting (it is NOT "only the two report files"):**
I never edited a single source file (Read/Grep/Bash/preview only). The tree's extra changes are three separate things:

1. **Mine — the deliverables:** `docs/NIGHT-TEST-REPORT.md` + `docs/NIGHT-TEST-REPORT.html`.
2. **Mine — unavoidable engine output from the 4 authorized paid runs:** `content/questions/_index.json` (M) and ~19 new `content/questions/_runtime/q_*.yaml` (the pipeline generates a question bank per run — e.g. `q_migration_plan_win`, `q_team_bar_specifics`, `q_clearer_criteria_7`, `q_next_quarter_ownership_21` map exactly to my Priya/Tom/James/Ahmed runs). **Left in place on purpose** — the standing rule is *never bulk-delete `content/questions/` artifacts*, and these are legitimate engine state. The run **logs** (`logs/gate/*`, `logs/july/*`) are git-ignored, so they don't dirty the tree.
3. **NOT mine — a concurrent session:** `backend/engine/preparation.ts`, `backend/engine/golden-checks.ts`, `content/prompts/preparation.md`, `scripts/test-prep-wording.js`, and the new `docs/todo/plan-turn-runner-gates/` (PLAN + 3 phase files) all share mtime **2026-07-07 01:07** — a "plan-turn-runner-gates" workstream from **another session running in this shared repo folder**, active *during* my QA (they weren't in my Phase 0 baseline). **Left untouched** — reverting another session's work would be wrong (standing rule: never sweep the shared index).

So `git status` is *not* clean-to-just-reports, but every non-report change is either (a) expected paid-run engine output I'm told not to delete, or (b) a parallel session's in-progress work that isn't mine to revert. **No stray edit of mine exists to revert.**

**Screenshots:** none captured — `preview_screenshot` stalled all session (render-queue/animation artifact). Nothing to gather. The walk was done via DOM inspection instead.

---

## Post-QA follow-up (2026-07-07, after Carl reviewed)

Carl asked to fix findings #1, #2, #3. Outcome:
- **#2 (briefing mislabels a live answer as "his note") — ✅ FIXED & VERIFIED.** Added a **"Source labelling (hard)"** rule to `content/prompts/final-evaluation.md` that pins the two inputs apart (manager pre-meeting notes vs session transcript) and forbids `his note says "<transcript phrase>"`. Offline tests green. **Behavioural verification (2 paid `gate --only performance-tom` runs, Carl-approved, ~$0.39 each):** the mislabel is **gone in both** post-fix briefings (2/2 clean) — before: *"his own note says 'this team's bar still feels fuzzy'"*; after: *"Tom's own words show the gap… he said 'this team's bar still feels fuzzy'"*. Correct attribution to what he *said*.
  - **Side finding (unrelated to #2):** the 1st verify run hard-failed on **`FOCUS_SHAPE_LEAK`** in the *focus-points* stage (a best_practice reason opened "How he frames…" instead of the required "How they're…"). The 2nd run passed clean → **transient model nondeterminism** in focus-points, not a regression from the #2 edit (different stage; passed with identical code an hour earlier). Same family as the biweekly-priya focus-point self-flag (Phase 4b). Worth a separate look at focus-point opener-shape stability.
  - **Paid total tonight:** 4 (Phase 4) + 2 (verify) = 6 runs ≈ **$2.35** (under the $3 ceiling). The #2 fix is now **committed** (see Learnings 3 for how) — Carl's rule text landed verbatim in `final-evaluation.md`.

---

## Learnings (what the fix-and-verify follow-up taught us)

**1. The gate is nondeterministic — "PASS" is a roll, not a proof.** Re-rolling `performance-tom` with unchanged focus-points code produced FAIL (`FOCUS_SHAPE_LEAK`) then PASS on the very next roll. So Phase 4's clean "4/4, zero hard-fails" was **one sample per case** — it undercounts intermittent failures. A trustworthy stability read needs each case sampled **N times** (3–5), reporting a pass-*rate*, not a single verdict. This is the single most important methodology correction to the whole report.

**2. Focus-point opener-shape is the recurring weak stage.** Two independent hits tonight: biweekly-priya's focus-point stage self-flagged `passed:false`, and performance-tom tripped `FOCUS_SHAPE_LEAK` on a re-roll (best_practice reason opened "How he frames…" not the required "How they're…"). The `generate-focus-points` stage doesn't reliably hold the required opener grammar — a real, separate engine edge (distinct from the plan-turn thread-follow work), worth its own gate-or-prompt fix.

**3. The parallel-session commit hazard is real — it hit this very work.** While I was mid-task, a concurrent `chore: checkpoint` commit (`a92e7857`) ran a broad add and **swept my uncommitted `final-evaluation.md` fix and both report files into its commit** — so my later path-scoped `git commit -- final-evaluation.md` found "no changes". Nothing was lost (my rule landed verbatim), but the lesson stands: **in this shared repo folder, uncommitted work is not safe from another session's checkpoint.** Commit path-scoped *promptly* after a change, or isolate in a worktree — don't leave engine edits sitting uncommitted next to other live sessions.

**4. Fix-verify loop that worked:** offline prompt tests (free) → one Carl-approved paid gate → **read the actual `final.json` output**, not just the gate verdict. That's what caught that #2 was genuinely fixed *even though the gate verdict was FAIL* (on an unrelated stage). Verdict-only checking would have missed it in both directions.
- **#1 (off-thread Q&A) + #3 (growth arc skips gap/investment) — ROUTED, not edited here.** Both are the same plan-turn-runner behaviour (serving/thread-follow), which is the live scope of the concurrent **`plan-turn-runner-gates`** session (owns `plan-turn.md`, `queue-manager.ts`, `thread-follow.ts`). Editing those files from here would collide. Per Carl's choice (option A), the two findings were appended to [docs/todo/plan-turn-runner-gates/PLAN.md](todo/plan-turn-runner-gates/PLAN.md) as input for that owner. No engine behaviour code touched by this QA.



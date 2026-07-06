# Overnight QA sweep — 2026-07-06

**Build under test:** HEAD `2327f230` · scratch stack API :3091 / admin :3090 / customer :3092 (Carl's :3000/:3001/:3002 untouched).
**Executor:** automated agent — Playwright browser + HTTP probes + npm checks. Report-only; nothing fixed, nothing committed.
**Severity:** 🔴 broken · 🟡 wrong-but-works · 🔵 tweak/polish.

---

## Resolution — all 9 findings triaged with Carl (2026-07-06)
**✅ Walked + signed off by Carl 2026-07-06 ("done all good").** Went through every finding one-by-one. Outcomes:
| Finding | Sev | Decision | Commit |
|---|---|---|---|
| F-002 clone breach | 🔴 | **Fixed** — prefill dev-only, prod→403 | `ab861b48` |
| F-003 feedback inbox no route | 🟡 | **Fixed** — added route + guard | `1c718ee5` |
| F-009 superadmin client-guard | 🟡 | **Fixed** — SUPERADMIN_ONLY bounce, verified live | `913d3ef9` |
| F-006 skip-to-briefing dead-end | 🟡 | **Fixed** — route via EVAL, paid-verified | `e7494eb4` |
| F-004 guest rail | 🟡 | **Fixed** — no rail for guests, verified live | `093981e1` |
| F-001 /api plain-text 404 | 🔵 | **Fixed** — JSON 404 shape | `5877f8a3` |
| F-005 hidden internal code in customer bundle | 🔵 | **Parked** → frontend-admin-split Phase 3 (recorded in that PLAN) | — |
| F-007 star widget empty on revisit | 🔵 | **Fixed** — pre-fill from saved rating | `0fb78fa8` |
| F-008 one-page Cancel | 🔵 | **Not a bug** — Cancel is confirm-gated (verified live) | — |
| F-010 Library mobile overflow | 🔵 | **Fixed** — row wrap + grid minmax(0,1fr), verified 375px | `73014fe4` |

**Net: 8 fixed, 1 parked (tracked), 1 was-not-a-bug.** Every fix path-scoped on `main`; verified by tests + live browser/HTTP (two fixes browser-verified, F-006 paid-verified ~$0.35).

---

## TL;DR — read this first

Ran the whole system overnight in a real browser (both apps) + HTTP fencing probes + the full paid 1:1 pipeline. **The engine and the fresh feature builds are in good shape** — the pipeline produces clean, honest, well-grounded briefings and the fencing is almost entirely solid. **One serious security hole** and a cluster of medium UX/guard gaps. Total OpenAI spend ≈ **$0.50 of $3**.

### Top 5 to look at first
1. **🔴 F-002 — cross-tenant data breach.** `/runs/clonable` + `/runs/clone` let **any manager read any other company's finished runs** (full briefing + transcript) in production; in dev even a member can. The "prefill" dev helper isn't org-fenced and the prod gate admits `manager`. **Fix before any real multi-company alpha.**
2. **🟡 F-009 — superadmin screens have no superadmin client-guard.** A plain manager can open the `/admin/registered` and `/admin/errors` shells (data stays 403'd, so no leak — but wrong). Add a `SUPERADMIN_ONLY` client gate.
3. **🟡 F-006 — "Skip to briefing" dead-ends** on "Briefing not available"; the manager must manually hit "Run evaluation again". The wrap-up happy-path is broken.
4. **🟡 F-003 — Feedback inbox has no route.** Not deep-linkable, lost on reload/back, and missing from the client admin-guard set.
5. **🟡 F-004 — Guest lane shows a nav rail** ("Past 1:1s", "Log out") the guest-run spec says shouldn't be there.

Everything else (F-001, F-005, F-007, F-008, F-010) is minor polish. Full list below.

### Suite scorecard
| Suite | Result |
|---|---|
| A — smoke & static (14) | ✅ all pass (1 minor: F-001) |
| D3 — API fencing (14 probes) | ✅ solid except **F-002** |
| B — 6 fresh-build sheets | ✅ people-roster, feedback, customer-app, design all pass; guest (F-004) + feedback-route (F-003) gaps |
| C — paid pipeline (Run A full) | ✅ high-quality output; **F-006** skip bug; F-007/F-008 minor |
| D — page sweep + roles | ✅ walls hold (**F-009** client-gap); all internal tools render |
| E — mobile / persistence / UM | ✅ persistence + UM guardrails hold; **F-010** Library mobile overflow |

### Confidence / coverage caveats
- Ran on a **scratch stack** (:3090/:3091/:3092) so Carl's dev servers were untouched. A parallel session committed mid-run, so persistence checks booted a newer HEAD (`c38cb2ae`); all findings are on `2327f230`.
- **Not fully exercised:** the one-page `/flow` paid streams (layout only), the customer-app paid pipeline (Run B — skipped, shared code), guest final "start" (paid, out of scope), and the deactivate→reactivate happy-path (structurally blocked — every QA account is its org's sole manager).

---

## Findings

### F-002 🔴 Cross-tenant data breach: any manager can clone & read ANY company's runs (`/runs/clonable` + `/runs/clone`)
- **✅ FIXED 2026-07-06 (commit `ab861b48`).** `prefill` is now gated dev-only (`prefillAllowed`): production refuses `/runs/clonable` + `/runs/clone` with **403 before auth even runs**; dev unchanged. Verified live (prod→403, dev→401, `/runs/recent`→401 unaffected) + unit test.
- **Case:** FE-08 (found while probing member access)
- **Where:** API, `GET /api/v1/runs/clonable` + `POST /api/v1/runs/clone` → `backend/api/services/runs/runs.controller.ts:29` (`callerPrefill`), `backend/api/services/runs/runs.service.ts:186` (`clonable: () => ({ runs: repo.listFinished(null) })`).
- **Proven tonight (dev build):** logged in as the plain **member** `member@seroteams.com` (role `member`):
  1. `GET /runs/clonable` → **HTTP 200**, returned **50 finished runs from across all orgs** (headlines incl. "Carl · UX Lead", "Nikki · Senior Nurse", "Grace Miller · Product Design Lead" — none in the member's own org).
  2. `POST /runs/clone {sourceId:<another org's run>}` → **HTTP 200**, new run created.
  3. `GET /runs/mine/<clone>` → **HTTP 200** with the full `briefing` object of that other-org run.
- **Why it's production-critical (not just a dev quirk):** the guard is `if (production) requireAdmin(identity) else requireAuth(identity)`. `requireAdmin` admits role **`manager`** (`ADMIN_ROLES = ["admin","manager"]`), and **manager is the normal end-user/customer role**. The service passes `null` as the org filter (`listFinished(null)`) and `cloneRun` never fences the *source* run by org. So on a hosted build, **any customer manager can enumerate every other company's finished runs and clone them to read the full briefing + transcript.** Dev additionally exposes this to members.
- **Expected:** clonable/clone are a dev-only prefill helper — should be hard dev-gated (e.g. refuse unless `NODE_ENV!=='production'` AND the source run is in the caller's own org), never a cross-org read path.
- **Note:** the controller comment literally says "admin-guarded … real members never clone" — the code doesn't match the comment (no org fence on the source; manager passes the admin gate).
- **Evidence:** clone id `2026_Jul06_00-37-…` owned by dev member (leftover — see ledger).

### F-009 🟡 Superadmin screens have no superadmin *client* guard — a manager can open the page shell
- **Case:** RM-04 / AD-31/33
- **Where:** `admin/src/router.js` — `/admin/registered`, `/admin/users/:id`, `/admin/errors` (and the unrouted feedback inbox, F-003) sit in the `ADMIN_ONLY` set. `ADMIN_ONLY`/`isAdminStage` treats **admin-role = manager + admin** as allowed, but these are **superadmin-only** screens.
- **Proven:** logged in as the dev **manager** (`manager@seroteams.com`, role manager, not superadmin), direct-navigating to `/admin/registered` renders the **"User management"** shell, and `/admin/errors` renders the **"Error log"** shell (then shows "Couldn't load" because the backend 403s the data — FE-03).
- **Impact:** No data leak — the API is the real wall (verified 401/403 in D3). But it's a client-guard gap + confusing UX: a manager sees a superadmin screen title and a broken/empty state instead of being bounced. Internal *tools* (library, universe, …) correctly bounce a manager (INTERNAL_ONLY); the `/admin/*` superadmin screens don't. There's no `SUPERADMIN_ONLY` client set.
- **Fix shape:** add a superadmin-only client guard (mirroring the server `requireSuperadmin`) that bounces non-superadmins from all `/admin/*` screens, and include the feedback inbox (F-003).

### F-006 🟡 "Skip to briefing" dead-ends on "Briefing not available" — synthesis isn't run on skip
- **Case:** RUN-07 (paid Run A)
- **Where:** admin app, interview → "Skip to briefing" → confirm "Open briefing" → `/briefing`.
- **Steps:** mid-interview (after answering 3 questions), click **Skip to briefing** → **Open briefing**. Landed on `/briefing` showing **"Briefing not available — This session has no saved briefing."** Waited 10s; still empty. Clicking **Run evaluation again** ran `/evaluate` (~12s) and the briefing then rendered fully.
- **Impact:** The primary "skip the rest and wrap up" path dead-ends instead of running the final synthesis — a manager who skips remaining questions hits an error screen and must know to press "Run evaluation again". Recoverable, but the happy path is broken.
- **Likely cause:** "Open briefing" navigates straight to `/briefing` without kicking off (or awaiting) the evaluation/synthesis stream; the briefing loader finds no saved briefing. Suspect the skip handler in `questioning.js` / the briefing loader (`session-persistence.ts` + eval stream are hot files).

### F-004 🟡 Guest intake shows a nav rail ("Past 1:1s" + "Log out") — sheet says a guest should see no rail
- **Case:** GR-04
- **Where:** admin app :3090, guest lane (`/new` after "Try it — no account needed"), `admin/src/ui/app-nav.js`.
- **Actual:** The guest intake screen renders the left rail with **Past 1:1s** (Primary nav → `/runs`, which is auth-gated and bounces a guest to login), plus **What is Sero? / Send feedback / Privacy / Log out**. "Log out" is shown to someone who never logged in.
- **Expected (per guest-run phase-2 sheet GR-04):** "as a guest there is no side rail, no profile badge, no admin menus anywhere."
- **Impact:** Low — clicking Past 1:1s just bounces to login (no data leak; confirmed internal deep-links all bounce, GR-05). It's a polish/coherence gap: a guest is offered nav that either dead-ends at login or makes no sense ("Log out").
- **Note:** profile badge is correctly absent; the full internal rail is correctly absent. Only the minimal rail leaks in.

### F-003 🟡 Feedback inbox has no route — not deep-linkable, lost on reload; also missing from the client admin-guard set
- **Case:** FB-08
- **Where:** `admin/src/router.js` — the `ADMIN_FEEDBACK` stage is absent from `urlForState`/`toPath` (lines 43–47), from `STAGE_FOR` (path→stage, 51–64), AND from the `ADMIN_ONLY` guard set (72–75). It's opened only via `setState({stage: ADMIN_FEEDBACK})` from `app-nav.js:218`.
- **Impact:** Opening the inbox writes no URL, so **reload or browser-back drops you off the screen with no way back to it** (there is no `/admin/feedback` deep link). It's also the only admin screen not covered by the client-side `isAdminStage` guard — harmless for data (the backend 403s `/api/v1/admin/feedback`, verified FE-03/FE-02) but the client guard is inconsistent.
- **Fix shape:** add `ADMIN_FEEDBACK → "/admin/feedback"` to both router maps and to the `ADMIN_ONLY` set, matching `/admin/errors`.

### F-001 🔵 Unknown top-level `/api` routes return plain text, not the JSON error shape
- **Case:** A-13
- **Where:** API :3091 (HEAD 2327f230), `GET /api/v1/nope-not-a-route`
- **Steps:** curl any unmatched path under `/api/…`.
- **Expected / Actual:** Other API errors return `{"error":{"code","message"}}` JSON (confirmed: `GET /api/v1/sessions/does-not-exist-xyz` → `{"error":{"code":"NOT_FOUND",…}}`). But a path that matches no route at all falls through to a plain-text catch-all: `API only. Visit http://localhost:3000 for the app (Vite dev server).` with HTTP 404.
- **Impact:** Minor — a client that assumes JSON on every `/api` 404 would fail to parse. Only affects genuinely unknown top-level paths; unknown sub-paths of real resources are correct JSON.
- **Suspect:** the API catch-all/SPA-fallback handler in `backend/api/server.ts` runs before/instead of a JSON 404 for `/api/*`.

---

## Confirmed pre-existing (not new findings)
- `admin/src/ui/group-people.test.ts` — 3 subtests fail (`personId` folding under different names / roster display-name / merged-away personId). This is the in-flight people-roster Phase 2 work. **Note:** `runs.service.test.ts` (the 4th baseline failure) now PASSES — fewer failures than the recorded baseline, not more.
- `@sero/run-debrief` build failure: **NO LONGER REPRODUCES** — `npm run build` and `npm run build:customer` both exit 0 at this HEAD. The pre-existing item is resolved.

---

## Suite A — smoke & static ✅ (14/14 executed)
| Case | Result | Note |
|---|---|---|
| A-01 register super (UI) | ✅ | Lands on START; `auth/me` → `isSuperadmin:true` |
| A-02 register mgr-a | ✅ | 201, new org `efd00237…` |
| A-03 register mgr-b | ✅ | 201, new org `9db47024…` |
| A-04 demote member → member | ⚠️ blocked-by-design | 409 "only manager or admin" — registration makes each user sole manager of a fresh org, so a member is not constructible via demote. Used dev seed `member@seroteams.com` (role member) for member tests. Correct guardrail, not a bug. |
| A-05 duplicate email | ✅ | 409 "That email is already registered." |
| A-06 login/logout cycle | ✅ | UI logout → login round-trips; `auth/me` mirrors |
| A-07 wrong password | ✅ | 401; identical message for wrong-pw vs unknown-email (no user enumeration) |
| A-08 `/api/version` | ✅ | `2327f230` = HEAD |
| A-09 `npm test` | ✅ | 78 files PASS; only group-people 3 subtests fail (pre-existing) |
| A-10 typechecks | ✅ | backend + admin both exit 0 |
| A-11 `npm run build` | ✅ | exit 0 (run-debrief failure resolved) |
| A-12 `npm run build:customer` | ✅ | exit 0 |
| A-13 API 404 shape | 🔵 F-001 | plain-text catch-all on unknown top-level /api paths |
| A-14 seed clones | ✅ | 2 runs cloned to mgr-a, 1 to mgr-b; `personId` stamped on cloned runs (people-roster P2 working) |

## Suite D3 — API fencing ✅ (1 breach found)
| Case | Probe | Result |
|---|---|---|
| FE-01 | logged-out on 6 protected reads | ✅ all 401 |
| FE-02 | logged-out on 5 superadmin routes | ✅ all 401 |
| FE-03 | mgr-a on 3 superadmin routes | ✅ all 403 |
| FE-04 | mgr-a reads mgr-b's run (overview/full/stages) | ✅ all 404 (fence-as-not-found) |
| FE-06 | mgr-a rates mgr-b's run | ✅ 404 |
| FE-07 | dev member `POST /sessions` | ✅ 403 (start gate holds) |
| FE-08 | member on admin tools (`/arcs`→403, role-lexicons/heartbeat/pipeline/promotions→403); **`/runs/clonable`→200** | 🔴 **F-002** |
| FE-09 | evil-Origin on /feedback, /team/people, /team/rename | ✅ all 403 |
| FE-10 | rapid malformed `POST /sessions` | ✅ 400×5 then 429 (no AI spend) |
| FE-11 | 33 rapid `POST /errors` | ✅ 200 up to #30, 429 from #31 |
| FE-12 | legacy pre-v1 paths (/api/start, /api/runs/recent, …) | ✅ all 404 (tombstoned) |
| FE-14 | cross-user claim of mgr-b's run by mgr-a | ✅ 404, ownership unchanged (no theft) |

## Suite B — fresh-build QA sheets (free parts)
### B1 people-roster ✅ (PR-01..10 pass; PR-07 restart folded into E3)
create ✅ · dedupe "priya"/"Priya " → one row ✅ · rename+clear-role ✅ · merge (intoId) folds card ✅ · self-merge → 400 ✅ · archive empties ✅ · member GET/POST → 403 ✅ · logged-out → 401 ✅ · cross-manager PATCH/archive → 404 ✅ · evil-Origin → 403 (FE-09) ✅. *(Note: merge body key is `intoId`, not `targetId`.)*
### B3 feedback-inbox ✅ (send/cap/DB-honesty pass; F-003 is the router gap)
send note (field is `message`) → appears in super inbox with name + company, newest-first ✅ · 2500-char note capped at exactly 2000 server-side ✅ · `feedback.jsonl` stays 1 line (DB-backed, doesn't grow) ✅ · manager 403 (FE-03) ✅ · logged-out 401 (FE-02) ✅ · **FB-08 → F-003** (no route).

### B4 guest-run P2 (mostly ✅; F-004 rail)
GR-01 "Try it" link visible ✅ · GR-02 → intake `/new` no login ✅ · GR-03 reload stays in intake (name resets — no session yet, acceptable) ✅ · **GR-04 → F-004** (guest sees a minimal rail) · GR-05 `/tasks`,`/admin/registered`,`/universe` all → `/login` ✅ · GR-07 guest API 401 (FE-01) ✅.

### B5 customer app :3092 ✅ (no leakage)
CA-01 login renders ✅ · CA-02 manager → START ✅ · **CA-04 leakage sweep: all 12 internal paths (`/library`,`/compare`,`/personas`,`/lexicon`,`/job-lexicons`,`/meeting-arcs`,`/tasks`,`/universe`,`/guide`,`/admin/registered`,`/admin/errors`,`/admin/users/x`) render the customer START, none render internal tooling ✅** · nav shows only Home/New 1:1/Team/Past 1:1s + content pages ✅.
- 🔵 **F-005 (minor):** the internal persona-bench controls ("Manual", "Replay test run", "Start demo session") ship in the customer bundle DOM but are hidden at runtime (role-gated, `offsetParent:null`). No user impact today; physical removal is frontend-admin-split Phase 3. Flags that internal code still reaches the customer bundle.
- 🔵 Observation: both apps' login shows dev-login prefill + Admin/Member quick-swap buttons — expected on a dev build (gated by `import.meta.env.DEV`); verify they vanish in the hosted/production build.

### B6 design polish ✅ (on customer START)
MR-01 h1 = Bricolage Grotesque Variable, body Inter ✅ · MR-02 primary action buttons = 4px radius ✅ (list-row/segment buttons are 0px — not action buttons) · MR-04 14px floor: **0 violations** ✅. (Date-format MR-03 checked in the page sweep.)

## Suite C — paid Run A (admin app, full pipeline) ✅ (1 flow bug: F-006)
Manager 1:1 for "qa-overnight Priya · Product Designer · Senior · Bi-weekly", note about slower pace.
- RUN-02 focus stream ✅ 4 grounded areas, each anchored ("from your note"/"common for this level"); bi-weekly excluded competencies (focus-arc gate holds).
- RUN-03 prep brief ✅ real opener, 3 listen-for items, uses her name, no raw markdown/placeholders.
- RUN-04 questions ✅ 9 generated. RUN-05 answered 3, each follow-up **threaded off the prior answer** (eng-handoff answer → "Where do handoffs get stuck?" → "What would change at spec sign-off?"). Live 4-axis scores updated per answer.
- RUN-06 **mid-interview reload ✅** rehydrated to Q2 with scores + Back button intact (session-persistence hot-file holds).
- RUN-07 **→ F-006** skip-to-briefing dead-ends; recovered via "Run evaluation again".
- RUN-08 briefing ✅ excellent: grounded headline, quotes, honest scores (Growth = "not enough signal", not fabricated), **engagement block uses the no-inference Phase-3 format (quotes + You-noted/Why/Still-missing/Your-move, NO state labels)**, split shareable/private honest reads, next-steps + reminders.
- RUN-10/14 ✅ run in `/runs/mine`, rating saved (4★, timestamp), detail has briefing. RUN-11/TM-03 ✅ appears on Team "1 meeting · 4.0 avg". confirm.js dialog (hot) works.
- Console clean through the whole run (one benign planner axis-damper warning). Spend so far: ~1 pipeline + 1 extra eval synthesis ≈ **$0.45**.

### Suite C — Run C (one-page `/flow`) — layout ✅, full pipeline not re-spent
One-page run renders ("Answer each step and the next appears below"); intake chains growing-downward (answered step collapses to ✓, next appears below) — `one-page-run.css` layout holds. **Budget call:** stopped before the inline paid streams (same engine code as Run A, already validated) to keep total spend ~$0.45 and conserve budget — the one-page `plan/stream` path was NOT exercised end-to-end. **Run B (customer-app pipeline) was skipped** — the customer app render + walls are proven (B5), and its stages are the same cross-imported code as Run A.
- 🔵 **F-007:** on returning to a finished briefing, the star-rating widget shows **empty** even though the rating is saved (API confirms `stars:4`). The saved value doesn't reflect back into the widget on re-render.
- 🔵 **F-008 (low confidence):** "Cancel" on the one-page run did not reset/exit on click (progress stayed). Single observation, not deeply retested.

## Suite D — page sweep + role×route ✅
- **RM-04 ✅** manager bounced to START from every INTERNAL_ONLY tool route (library, compare, personas, lexicon, job-lexicons, meeting-arcs, tasks, universe, guide).
- **RM-02 ✅** member `POST /sessions` 403 + member on admin tools 403 (D3). **F-009** = superadmin screens reachable by a manager (client-guard gap; data still fenced).
- **Internal tools render as admin ✅:** universe, guide, library, tasks, job-lexicons, meeting-arcs, compare, "Test engine" (personas) all render content, no app-level console errors. (Console noise seen = Vite dev-server `ERR_CACHE_READ_FAILURE` cache flakiness + expected 401/403 auth codes — not app bugs. One transient cache-miss caused a one-off `admin-registered.ts` dynamic-import fail; recovers on reload.)

## Suite E — cross-cutting (partial)
- **Mobile 375px:** START ✅ no horizontal overflow, drawer nav present. **🔵 F-010:** the **Library** internal-tool page overflows horizontally at 375px (root scrollWidth 506 > 375). Internal tool, low priority, but a real body-level horizontal scroll.
- **Design (E2):** 14px floor 0 violations on customer START (B6); Bricolage headings + 4px primary buttons confirmed.
- **Persistence restart (E3) ✅:** after a full scratch-API restart — people list survived (only `qa-overnight priya`; archived/merged stayed gone, DB-backed), the qa feedback note survived in the inbox, and auth sessions survived (cookies still valid). Proves the store is DB/disk-backed, not memory.
- **B8 user-management P3 (deactivate/reactivate) ✅ (guardrails):** non-super deactivate → **403** (UM-07); super deactivating an org's **only** manager → **409** "activate or promote someone else first" (UM-06 guardrail holds — so mgr-b was protected, never left dead). Full deactivate→session-kill→reactivate happy-path not walked (every QA manager is their org's sole manager, so the guardrail blocks the deactivate — same structural limit as A-04).
- **Note:** mid-sweep, a parallel session committed new code — the restart booted `c38cb2ae` (was `2327f230`). All findings above were observed on `2327f230`.

## Spend ledger
- Run A (full manager pipeline, admin app) + one extra evaluation synthesis (F-006 recovery) ≈ **$0.45**.
- Run C (one-page) — intake only, no paid stream fired ≈ **$0**.
- Suite A/B/D3/E — all free (HTTP probes, `npm test`, browser navigation, DB reads).
- **Total ≈ $0.45–0.50 of the $3 budget.** ~$2.50 unspent.

## QA data ledger (cleaned up / leftover)
- **Cleaned:** mgr-a ×2 + mgr-b ×1 clone runs deleted (`DELETE /runs/:id` → 200); people roster archived down to one test row.
- **Leftover — accounts** (no delete path, user-mgmt P4 not built): `qa-overnight-super@ / -mgr-a@ / -mgr-b@ / -member@` (`@qa-overnight.local`), orgs "QA Overnight HQ / Org A / Org B / Org M". One roster person `qa-overnight priya` (mgr-a).
- **Leftover — runs:** dev-member ×1 clone (`2026_Jul06_00-37-…`, from the F-002 test; member has no delete route) + the Run A paid run "qa-overnight Priya" under `manager@seroteams.com` (populates that account's Team). Both deletable by their org admin.
- **Leftover — ~35 rows:** ~33 synthetic error-log rows (`qa-overnight synthetic`) from FE-11 + 2 qa feedback notes — purge with `npm run errors:purge` / delete from `feedback_notes`.
- **Scratch servers** :3090/:3091/:3092 still running — stop them when done reviewing.

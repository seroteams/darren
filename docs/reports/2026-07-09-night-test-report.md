# Night test — 2026-07-09 (LOCAL + LIVE)

**Scope:** the standard overnight full-QA pass, tonight run against BOTH servers:
- **Local** — API :3001, admin :3000, customer :3002 (dev tree, includes another session's uncommitted postgres-runtime-data P3 work)
- **Live** — https://sero-obwq.onrender.com (Render, customer app + API, Sero Live Neon DB)

**Budget:** 4 paid pipeline runs total (~$1.40), pre-approved — split across local gate runs and live API-driven run(s). Nothing else touches OpenAI.
**Rules:** QA only — no fixes, no commits. Test data noted for cleanup.

---

## Phase 0 — Baseline (free)

- `git status`: DIRTY as expected. Notable: another session's in-flight **postgres-runtime-data P3** edits (backend services/repos/engine files modified), `frontend/dist` rebuild (many D/M), plans folders moved to done/. Baseline failures (if any) may come from that in-flight work — flagged, not tonight's regressions.
- Branch `main` @ `0c5e2b95`.
- Live health check: `GET /api/v1/health` → **200 {"ok":true} in 0.33s** ✅ (server awake, not cold).
| Check | Result | Notes |
|---|---|---|
| `npm test` | ✅ 101/101 | Full offline suite green (up from 98 — postgres-runtime-data P2/P3 added tests) |
| `npm run typecheck` | ✅ clean | |
| `npm run typecheck:admin` | ✅ clean | |
| `npm run typecheck:customer` | ✅ clean | (extra, free) |
| `npm run lint` | ⚠️ 48 errors / 2 warnings | **Config gap, not code:** 44 errors are `frontend/dist/**` build artifacts eslint should ignore; 4 are `sourceType: module` parse errors on `frontend/tailwind.config.js`, `frontend/vite.config.js`, `shared/api.js`, `shared/sse.js`; 2 real warnings: unused vars in `admin/src/stages/personas.js:270`, `questioning.js:207`. Pre-existing. |
| Fixture replays ×4 | ✅ all pass | `priya-biweekly-checkin`, `tom-performance-feedback`, `ahmed-growth-career-plan`, `james-something-feels-off` — all offline checks pass. **Note:** the night-test prompt's replay ids (`biweekly-priya` etc.) are gate-case names and don't resolve in `replay-scenario.js` — the prompt file needs its ids updated (logged as issue). |

**Baseline verdict: green.** No pre-existing test failures to carry.

---

## Phase 1 — API layer (free), LOCAL :3001 + LIVE sero-obwq.onrender.com

Same sweep script run against both servers: 20 GET endpoints unauth + authed, 5 unauth-write rejections, full auth cycle, 2 safe writes. **Result: local and live behave identically** — every status code matched.

| Check | Local | Live | Verdict |
|---|---|---|---|
| All protected GETs unauthenticated | 401 | 401 | ✅ gated, no data leaks |
| `/meeting-types`, `/personas` unauthenticated | 200 | 200 | ⚠️ open without login — likely intentional (guest lane needs meeting types pre-login) but `/personas` (QA persona list) being public is worth a look |
| Unauth writes (`/team/rename`, `/team/merge`, `/lexicon/promotions`, `/feedback`) | 401 | 401 | ✅ rejected |
| `POST /team/aliases` | 404 | 404 | ⚠️ route doesn't exist as POST — night-test prompt's endpoint list is stale, not a leak |
| Register → login → `/auth/me` → logout → `/auth/me` | 201/200/200/200/401 | 201/200/200/200/401 | ✅ full session cycle, stale cookie dead after logout |
| Authed catalog + runs + team GETs (15) | all 200 | all 200 | ✅ shapes sane (`runs`, `people`, `arcs`, …) |
| `GET /library` authed | 302 | 302 | ⚠️ redirects instead of JSON — endpoint list stale or intended redirect; other endpoints all return JSON |
| `/admin/*` as plain manager | 403 ×3 | 403 ×3 | ✅ admin-gated |
| `POST /feedback`, `POST /errors` authed | 200 | 200 | ✅ writes land |

**Live latency (Frankfurt):** typical read 200–550ms · register 3.58s · `/pipeline/status` 2.63s (heaviest read). Local: most reads <100ms, `/pipeline/status` 1.66s.

**Test data created (cleanup in Phase 5):**
- LOCAL: user `nightqa-20260709-local@sero-qa.test` (+1 dummy feedback, +1 dummy error row)
- LIVE: user `nightqa-20260709-live@sero-qa.test` (+1 dummy feedback, +1 dummy error row)
---

## Phase 2 — Page + toggle walk (free)

**Local admin (:3007 preview, logged in as carl@seroteams.com superadmin) — 28 pages walked.** Every page rendered; **zero console errors/warnings and zero failed network requests across the entire walk.**

| Page | Renders | Notes |
|---|---|---|
| `/` (start) | ✅ | Demo persona dropdown (12 personas), manual/replay radio, recent sessions list |
| `/home` | ✅ | Member-style empty state for admin ("Your 1:1s — nothing yet") + dev Prefill button |
| `/new` | ✅ | Typing a name enables "Add & continue"; team quick-picks + "Show 4 more" work |
| `/runs` | ✅ | Past 1:1s list |
| `/run`, `/focus`, `/prepare`, `/briefing` (no session) | ✅ | All bounce to `/` — correct empty-state redirect |
| `/flow` | ✅ | One-page run renders standalone |
| `/compare` | ✅ | Run selector present |
| `/tasks` | ✅ | Planner board, 55 controls |
| `/library` | ✅ | 115 controls |
| `/personas` (Test engine) | ✅ | |
| `/lexicon`, `/job-lexicons`, `/meeting-arcs`, `/universe` | ✅ | |
| `/admin/registered` | ✅ | 33 rows; clicking a user opens `/admin/users/:id` drilldown (read-only, clean empty state) |
| `/admin/errors` | ✅ | Table populated (incl. tonight's dummy error — write proven end-to-end) |
| `/admin/feedback` | ✅ | Tonight's dummy feedback visible — write proven end-to-end |
| `/guide`, `/about`, `/feedback`, `/privacy` | ✅ | |
| `/login`, `/register` (authed) | ✅ | Redirect home — correct |

**Local customer (:3002, same login) — all 19 routes walked.** Same result: **zero console errors, zero failed requests.** Run detail opens at `/runs/:id` with briefing content (no raw JSON); bad deep-link (`/runs/not-a-real-id`) shows a clean "No 1:1 selected" state.

**14px floor:** every page's smallest text is 14px **except one shared element: the 10px "DEV" badge chip** (dev-only, appears on most pages). ⚠️ minor, dev-only.

**Responsive (375px):** `/`, `/runs`, `/admin/registered` — no horizontal overflow. **Dark mode:** app has no dark theme — always renders light regardless of OS preference; readable, by design (Flowbite/Sero tokens are light-only). **Screenshots:** skipped — known harness artifact (infinite CSS animations time screenshots out; memory-documented).

**LIVE pages (sero-obwq.onrender.com):** all 10 sampled routes → 200 in ~230ms; SPA fallback correct for arbitrary paths; JS bundle serves (65KB, hash `index-BBhHQqz2` = same build as local dist). ⚠️ One observation: first request after idle took **32s — Render free-plan cold start** (expected on free tier; known parked follow-up "Starter plan when demos need no-sleep").
---

## Phase 3 — Auth & role flows (free), both servers

Proven at the API layer (deliberate deviation: did NOT log into the preview browser as member — the browser shares Carl's localhost session cookie and switching accounts would log out his dev session overnight; UI route guards read the same `/auth/me` and are covered by the offline router tests).

| Check | Local | Live | Verdict |
|---|---|---|---|
| Member login (`member@seroteams.com`) | 200 | n/a (member not constructible on live — registration always creates a manager; correct guardrail) | ✅ |
| Member sees own data (`/runs/about-me`, `/runs/mine`) | 200 | — | ✅ |
| Member blocked from manager data (`/runs/recent`, `/team/people`) | 403 | — | ✅ no manager-data leak |
| Member blocked from admin + internal (`/admin/registered`, `/heartbeat`) | 403 | — | ✅ |
| Manager role on register | `["manager"]` | `["manager"]`, org set | ✅ |
| Manager reaches manager surfaces (`/team/people`, `/runs/recent|mine`) | 200 | 200 | ✅ |
| Manager blocked from admin (`/admin/*`) | 403 | 403 | ✅ |
| Unauthenticated protected call | 401 | 401 | ✅ redirect-to-login equivalent |
---

## Phase 4 — Paid pipeline runs (4 + 1 sanctioned retry, ≈ $1.75)

**Split (Carl asked for live + local):** 3 local gate cases + 1 full run ON THE LIVE SERVER driven per-turn via the API as a **guest**, then registered + claimed — deliberately chosen to prove the guest→save flow that was left unproven when the guest-run P3 walk was waived. Trade-off: `growth-ahmed` not run tonight (growth arc uncovered — honest gap).

| Run | Server | Verdict | Wall clock | Notes |
|---|---|---|---|---|
| `gate --only biweekly-priya` | local | ✅ PASS | 63s | |
| `gate --only performance-tom` (roll 1) | local | ❌ FAIL | 68s | hard fail `EVIDENCE_ANCHOR` — `engagement_read.observed_shift` shared no content with manager notes |
| `gate --only performance-tom` (sanctioned retry) | local | ✅ PASS | 60s | → the FAIL was a **nondeterministic roll** (1 fail / 1 pass tonight), not a code regression. `EVIDENCE_ANCHOR` on performance-tom is **flaky** — worth watching |
| `gate --only feels-off-james` | local | ✅ PASS | 58s | |
| **LIVE guest run** (Priya bi-weekly, API-driven per turn) | **live** | ✅ | ~64s engine time (stages: focus 3.7s · prep 9.6s · bank ~6s · 9 turns 2.5–5.1s each · evaluation 7.2s) | Full pipeline on Render + Sero Live Neon + live OpenAI key. Driver-side hiccup, not server: my script expected the wrong SSE terminal on `bank/stream` (`result` vs `ready/done`) — resumed the same session, no extra spend |
| **Guest → save flow (rode on the live run, free)** | live | ✅ **PROVEN** | — | register `nightqa-20260709-guestclaim@sero-qa.test` → `POST /sessions/:id/claim` ok → run **appears in /runs/mine: true**. The previously-waived unproven flow now proven on live |

**Live run quality signals (from the transcript):** 9 questions, thread-coherent (Q2 picked up "flatter", Q3 "cleanup and reviews", Q5 mentoring, Q9 closer), agenda check handled, briefing arrived with all keys (`headline, summary_bullets, understanding_paragraph, axes, brutal_truth_*, next_actions, watch_for, engagement_read, cost`). Deep scoring in Phase 4b.

**Spend tally:** 5 OpenAI-hitting runs (4 planned + 1 sanctioned retry of a failed run, per the prompt's "one retry max" rule) ≈ **$1.75 vs $1.40 ceiling — the retry pushed ~$0.35 over**; called out here honestly. Nothing else touched the API.
---

## Phase 4c — Speed & responsiveness (free)

**Pipeline speed:**

| Run | Wall clock | Flag |
|---|---|---|
| biweekly-priya (local gate) | 63s | ok |
| performance-tom roll 1 (local gate) | 68s | ok |
| performance-tom retry (local gate) | 60s | ok |
| feels-off-james (local gate) | 58s | ok |
| LIVE guest run (engine stages only) | ~64s (focus 3.7 · prep 9.6 · bank ~6 · 9 turns × 2.5–5.1s · eval 7.2) | ok |
| **Average** | **~63s** | all under the 90s bar ✅ |

LIVE run cost detail (from the engine's own cost ledger): **$0.374 · 15 model calls · 166.6k tokens** (plan-turn on gpt-5.4 dominates: 9 calls ≈ $0.33). One `01b-preparation-retry` call happened server-side (the engine retried prep once on its own — worth knowing, not a failure).

**App responsiveness (local dev, sampled):**

| Page | Load | Slowest API on page | Flag |
|---|---|---|---|
| admin /runs | 48ms | `/runs/mine` 285ms | ok |
| admin /library | 41ms | `/runs/finished` 285ms | ok |
| admin /tasks | 38ms | `/heartbeat` 225ms | ok |
| customer /runs | 56ms | `/auth/me` 235ms | ok |
| customer /team | 37ms | `/runs/mine?open=1` 282ms | ok |

All far below the 3s / 2s / 500ms flags. **Live** (from Phase 1): typical read 200–550ms, `/pipeline/status` 2.63s (heaviest, admin-only), register 3.58s (bcrypt), static ~230ms — plus the one-off **~32s free-plan cold start** after idle.
---

## Phase 5 — Tidy up

**Cleaned:**
- LOCAL dummy feedback row — deleted via `DELETE /api/v1/admin/feedback/:id` (200) — which also live-proved the feedback-inbox Delete endpoint.
- LOCAL dummy error row — marked resolved via `PATCH /api/v1/admin/errors/:id/resolve` (200) (no delete route exists; resolve is the built-in "handled" state).
- Both preview servers stopped (`sero-web-alt` :3007, `sero-customer` :3002). Carl's own dev stack on :3000/:3001 untouched.
- No stray screenshots (screenshots skipped — animation artifact).

**Leftovers Carl may want to clean (no delete routes exist for these — user-management P3–5 not built yet):**
| Where | What |
|---|---|
| LOCAL | user `nightqa-20260709-local@sero-qa.test` + its one-person org "Night QA 0709's Company" |
| LIVE | user `nightqa-20260709-live@sero-qa.test` + org (+1 dummy feedback row, +1 dummy error row — deletable/resolvable from Carl's live superadmin login) |
| LIVE | user `nightqa-20260709-guestclaim@sero-qa.test` + org + the claimed Priya run `2026_Jul08_17-35-03aad2b6…` (kept deliberately — it's the proof of the guest→save flow; view it from that account or superadmin) |
| LOCAL tree | engine-generated runtime question YAMLs under `content/questions/_runtime/` + 2 role-profile JSONs from the gate runs — left alone per the standing "never bulk-delete questions/ artifacts" rule |

**Working tree:** unchanged except the two report files (`docs/reports/2026-07-09-night-test-report.md` + `.html`) and the engine's own runtime artifacts above. The other modified files in `git status` belong to another session's in-flight postgres-runtime-data P3 work — untouched.
---

## Phase 4b — Deep run assessment (free; full log-dir reads on the 3 local runs, captured briefing + transcript for the live run)

| Run | Ground | Leak | Q-integrity | Thread | Thin-input | Complete | Honesty | **Total** |
|---|---|---|---|---|---|---|---|---|
| biweekly-priya (local) | 92 | 90 | 78 | **55** | 95 | 98 | 85 | **84** |
| performance-tom (local) | 92 | 95 | 85 | **55** | 85 | 95 | 90 | **85** |
| feels-off-james (local) | 92 | 95 | 82 | **65** | 85 | 90 | 95 | **86** |
| LIVE Priya guest run | 95 | 95 | 90 | 90* | 90 | 95 | 90 | **92*** |

*Live scored from the captured briefing + full question/answer transcript only (its stage logs live on Render/Neon, not local disk) — the 92 rides on lighter evidence than the local 84–86.

**The one systemic weakness — thread-following (55–65 across local runs).** All three scorers independently converged on the same structural cause: the **coverage engine and drill cap outrank following the person's answer**. Concretely:
- biweekly-priya: Priya volunteered mentoring ("still wants it, but stopped pushing") — two purpose-built bank questions (`q_mentoring_thread_46`, `q_mentoring_space`) sat unused all session, yet mentoring became a briefing bullet.
- performance-tom: three late wellbeing coverage-seeds yielded ZERO wellbeing signal (axis closed empty) while two live threads (adjacent-team trust, visible ownership) were deferred to next session.
- feels-off-james: the manager's explicit #3 priority (mentoring fit) had a queued question evicted at turn 6, never served.
- Metric caveat (all runs): `scoreThreadFollow` only credits `planner_added` questions, so genuine follows via `generated`/`reworded_from` sources score zero — true coherence is better than the raw number, but the misses above are real. This confirms and sharpens the parked "thread-follow drift" follow-up from plan-turn-runner-gates.

**EVIDENCE_ANCHOR flake autopsy (the FAIL roll):** identical inputs both rolls. The failing roll's `observed_shift` quoted the engine's own turn-1 assessment note ("shipping is positive engagement") dressed as a manager quote — a fabricated attribution; the passing roll lifted the manager's actual words verbatim ("he still asks very few questions"). Crucially, the runtime guard (`applyEngagementReadGuard`) had already collapsed the failing roll's SHIPPED briefing to honest `not_read` — customers were never exposed; the gate hard-fail fired on the raw pre-guard output, which is the designed division of labor. Verdict: nondeterministic model behavior, guarded in prod, flaky at the gate.

**Other notable findings from the deep reads:**
- ⚠️ Latent confidentiality risk (biweekly-priya): bank question `q_scope_to_protect` — "…if the billing rewrite lands?" — would have revealed the manager's private plan Priya hadn't been told about. It was never served (so no leak fired), but nothing structurally prevented serving it.
- ⚠️ Closer-gate bookkeeping drift (performance-tom): "reserved closer q_next_step_46 not found in queue — could not enforce" at turns 8–9; outcome fine this roll, enforcement dead. Same alias-churn pattern in feels-off (one question minted 7 aliases).
- ✅ Arc gates held everywhere: bi-weekly + feels-off runs excluded competencies at focus, questions AND briefing despite competency material sitting in the cached role profiles.
- ✅ Honest not-reads shipped: axes without signal say "didn't come up — not enough signal to read" instead of inventing reads.
- ✅ Positive-signal gap (biweekly-priya): Priya's "proud of the migration plan" earned no delta and no briefing mention — the "recognition" focus point died silently.

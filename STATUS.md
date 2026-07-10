# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.
Not sure which file is which? [docs/reference/trackers.md](docs/reference/trackers.md) maps where everything lives.
Closed tracks live in [docs/plans/done/](docs/plans/done/) — this file only holds what's live or awaiting your walk.

📍 **Feedback inbox — ✅ CLOSED 2026-07-08:** both phases (inbox screen + per-row Delete) green-lit by Carl ("close it") and moved to [done/](docs/plans/done/feedback-inbox/plan.md). Was already built + committed; wiring re-confirmed intact after the `0006`→`0011` DB drift.

📍 **Checkpoint 2026-07-08 (night) — 🎉 SERO IS LIVE ON THE INTERNET.** Render deploy went green tonight at
**https://sero-obwq.onrender.com** — verified live via the Render API + real health/homepage/deep-link checks,
running tonight's build (`10c08ad`) against the Sero Live Neon DB. render-deploy P1+P2+P3 essentially done; only
Carl's own paid live run (log in on phone → one 1:1, ~$0.35) remains before P3 closes formally. Render API key +
service id stored in `.secrets/` (gitignored). **Next session: render-deploy P4 = the `/commit` + `/release`
skills** (the two-word local→live workflow). Open follow-ups: rotate the live DB password (it passed through chat),
optional cleaner custom domain. ⚠️ This STATUS edit is **left uncommitted on purpose** — the file also carries a
parallel session's pre-go-live-close edits; committing would sweep their work (safe-commit rule).

📍 **Checkpoint 2026-07-08:** agent toolbox landed + committed — 4 new skills (**checkpoint · phase-close · safe-commit · night-test**), guardrails hook wired (and fixed), reviewrun builds its own context block, CLAUDE.md slimmed to pointers, [cheat sheet](docs/reference/claude-cheat-sheet.html) + [usage retrospective](docs/reports/2026-07-08-claude-usage-retrospective.html). Commits `73ceac7b`→`956b4bb4`. Nothing awaiting a walk — the toolbox is live now.

---

## ▶ Your move

> **🔨 [validation-kit](docs/plans/doing/validation-kit/plan.md) — the build that proves managers come back. P1 + P2 ✅ green-lit + committed 2026-07-10 · P3 next.**
> We're formally at **VALIDATION STAGE** (YC-committee audit 2026-07-09: product 8/10, business 3/10 — zero external
> users). This track builds the corridor-test kit: **P1 ✅** to-do page as live checklist (/tasks renders every
> active plan as a live ⬜/🔨/✅ checklist from the heartbeat) · **P2 ✅** return-signal in User management — each
> manager's row now answers the validation question in 5 seconds: first run, gap days, mint "came back" badge
> (2nd prep ≤ 14 days), internal accounts labelled; DESTINATION-checked against a direct Neon query (Carl walked
> both on a verified-fresh API; test-first, 111/111 + typecheck, $0) · **P3** one-tap feedback on the live
> briefing (needs a run-linked feedback store + migration) · **P4** first-run guidance (on intake — zero-run
> managers never see Home) · **P5** phone + copy pass. No nudge features anywhere (pass bar = *unprompted*
> return). P3 touches `server.ts`/`shared/api.js` — sequential, worktree if the tree is busy.
> **▶ Your move:** say "build validation-kit Phase 3". Separately, yours alone: name the 3
> corridor managers + flip Render to the paid tier.

> **🔨 [engine-hardening](docs/plans/doing/engine-hardening/plan.md) — NEW track (2026-07-10): 3 robustness wins mined from the old-Sero RUNNER.md. Invisible to managers — doesn't touch the validation metric. P1 + P2 ✅ green-lit + committed · P3 next.**
> From Carl's review of RUNNER.md (old Sero): three engine-hardening ideas the current engine lacks. All offline/unit-testable — **$0, no paid runs.**
> **P1 ✅ committed 2026-07-10 (`372bd9ad`, $0):** per-call **latency capture** — every recorded AI call carries `ms`, run summary sums `total_ms`. Live fetches timed; cassette-replay stays `ms: 0`.
> **P2 ✅ green-lit + committed 2026-07-10 ($0):** **concurrency cap + circuit breaker** on live AI calls — new `ai-guard.ts` (semaphore capped by `AI_MAX_CONCURRENCY`, default 4, + a closed→open→half-open breaker); wired into `callAI`'s live path only, cassette-replay bypasses it so evals stay deterministic. Test-first, 6 tests (5/5 loops), suite 113/113.
> **▶ Your move:** say "build engine-hardening Phase 3" → positive validation checks on the briefing (names the person / cites real data), warn-level first. *(Heads-up: project typecheck currently shows foreign errors in another session's `feedback.service.test.ts` — not this track.)*

> **🔨 [thread-follow](docs/plans/doing/thread-follow/plan.md) — NEW track (2026-07-09): make the engine follow the person's answer, not just march its queue. P1 ✅ green-lit + committed · P2 next.**
> From the 8–9 Jul night test: thread-following scored 55–65/100 on every run (the one systemic weak muscle) —
> people volunteered threads (Priya's mentoring, Tom's adjacent-team trust) and the coverage engine / drill cap
> marched over them. Root cause is gate order in [queue-manager.ts](backend/engine/queue-manager.ts).
> **P1 ✅ green-lit + committed 2026-07-09 ($0):** drill-cap now *pins* a runtime thread-follow at slot 0 (mirrors
> coverage's guard) so a minted follow can't be eaten. 2 test locks (red→green); suite 105/105. Honest note:
> P1 changes no existing run's output — it's groundwork; today thread-follow bails exactly when drill-cap acts, so
> the payoff only lands with P2. **▶ Your move:** say "build P2" → relax the mint-bail so a genuine new thread
> follows even under drill pressure; ONE paid gate case (~$0.35) proves the metric moves without new leakage.

> **✅ [agent-native](docs/plans/done/agent-native/plan.md) — TRACK CLOSED 2026-07-08: all 5 phases green-lit in one day, $0 spend.**
> The codebase is now agent-native: **maps** are true (engine-map.md + fixed `.cursor` rule) · the **whole pipeline
> replays offline** from any saved run (`scripts/replay-pipeline.js`, ~5s/$0; `scripts/repro-from-bundle.js` answers
> REPRODUCES yes/no on a bug bundle) · your three recurring **judgment calls are written tables**
> ([agent-decisions.md](docs/reference/agent-decisions.md)) · **web↔CLI drift** and **prompt↔gate drift** both break
> `npm test` with named errors. Tests 92→**96**, all offline. Folder → [done/](docs/plans/done/agent-native/plan.md);
> parked follow-ups listed in its plan.md. **▶ Your move:** nothing — track closed.

> **✅ [render-deploy](docs/plans/done/render-deploy/plan.md) — TRACK CLOSED 2026-07-08: Sero is LIVE at https://sero-obwq.onrender.com, all 4 phases green-lit.**
> Carl's ask: "develop locally and easily get it live" — delivered end-to-end. Render free plan (Frankfurt), a
> `render.yaml` blueprint **auto-deploys on every push to `main`**, and two skills make it two words:
> **`/commit`** (save locally, never push) + **`/release`** (free checks → push → watch the Render API until live →
> plain-words report; fix only with Carl's yes). The agent watches deploys via a Render API key in `.secrets/`.
> - **P1** (`1b67f792`) — Node pinned to 24, public `GET /api/v1/health`, `.secrets/` gitignored. Double-check
>   caught + fixed a deploy-blocker: the origin guard was localhost-only (would 403 every browser save on Render).
> - **P2** (`95a7a817`/`4fc008b6`) — `render.yaml` blueprint + `RENDER_SETUP.md` click-by-click; secrets `sync:false`.
> - **P3** — deployed + Carl's paid live run passed (log in + one 1:1 on the live site).
> - **P4** (`eb722d60`) — `/commit` + `/release` skills; Carl ran `/release` (100/100 checks, correctly skipped
>   other sessions' unsaved work, confirmed latest commit already live). "close it".
> Folder → [done/](docs/plans/done/render-deploy/plan.md). **Parked follow-ups:** pre-approve `git push`+Render-curl
> in settings.json (auto-mode blocked — approve the prompt on first `/release`); custom domain; Starter plan when
> demos need no-sleep. *(`TONIGHT.md` deleted at close-out.)*
> **▶ Your move:** nothing — track closed. Sero is on the internet.

> **✅ [postgres-runtime-data](docs/plans/done/postgres-runtime-data/plan.md) — TRACK CLOSED 2026-07-09: all 7 phases ✅, $0 track spend. Postgres is the single source of truth in both environments; a live 1:1 writes ZERO files.**
> P7 closed on Carl's blanket "finish it" go: every disk writer echo-gated, DB-mode disk fallbacks
> removed, tooling on SQL (`purge-runs.ts` replaces `purge-logs.js`). Free offline proof: full live-config
> write surface → zero files, zero dirs. 109/109 · shipped live `25fb3926` (health green). Rollback
> (echo-on + file mode) stays in the code. ⚠️ Honest residual: the live-site walk (run → delete →
> restart-resume) hasn't been eyeballed — unit locks + the offline proof cover the paths.
> Carl's ask: "we need to move all data into the database — we will have a live and local environment."
> **7 phases**, files keep being written until the last one (they ARE the rollback): ① foundations +
> live/local safety catch · ② dual-write · ③ read cutover (privacy-wall SQL — strictest QA) · ④ questions ·
> ⑤ small stores · ⑥ import all ~250 old runs (Carl's call) · ⑦ retire the files. Locked: import everything;
> local = Sero Local Neon, live = Sero Live Neon (created 2026-07-08, URL parked in `.env`).
> **P1 ✅ green-lit + committed (`a11f3594`):** new tables on Neon (`0009`+`0010`, dead `runs` dropped),
> self-migrating boot, live/local safety catch (proven both ways).
> **P2 ✅ green-lit + committed (`57d44b4b`, 2026-07-08, $0):** every new run now dual-writes to Postgres AND disk — the run row (with
> fast index columns) + all pipeline stage prompt/response artifacts. Disk stays canonical (echo on), so
> nothing can be lost; a `RUN_FILE_ECHO` switch turns disk off in live. FK dropped (`0011`) so the CLI lane
> writes too. Proven **free**: a scripted run's row + all 7 stage artifacts landed in Neon, then cleaned up.
> `npm test` **96/96** · typecheck clean. Per-turn Q&A files + log-sidecars deferred (honest note in phase-2.md).
> **P3 🔨 BUILT (2026-07-09, $0, test-first) — the read cutover:** every run read (Library, member "Past 1:1s",
> superadmin views, stage tabs, compare, pipeline status, suggest-fix) now answers from **Postgres** when
> `DATABASE_URL` is set; the file walk stays the DB-less mode AND the one-line rollback. Write path completed
> first (per-turn files + transcript/axis/cost + pipeline-lock dual-write on all three lanes, echo-gated — also
> stops live writing turn files to Render's throwaway disk). Privacy is **double-fenced**: SQL narrows on indexed
> columns, then the engine's own wall functions re-check every row on the authoritative state — a drifted column
> can hide a run, never leak one. Proven free: **parity test deep-equals 11 reads across both stores on real
> Neon (all green)** + 7 DB-less fencing tests per list variant. `npm test` **101/101** · typecheck clean ·
> offline replay PASS. Honest deferrals in phase-3.md (Map-miss DB fallback → P7; person-profile → P5).
> **P3 ✅ closed 2026-07-09 (Carl: "close"; browser walk waived — flagged + his explicit call).** Walk-prep on
> the real wiring caught **2 bugs the tests missed** (non-uuid dev ids would 500 the Library; a claimed guest
> run kept the placeholder org → invisible in fenced lists) — fixed `bd3f2da7`; every wall then verified over
> real HTTP with `logs/` parked (member: empty list, 404 on probe, 403 on admin routes).
> ⚠️ Standing note: until P6 imports the old runs, local lists show only runs made since P2's dual-write
> (2026-07-08) — the ~250 older disk runs are safe on disk, just not listed yet.
> **P4 🔨 BUILT (2026-07-09, $0, test-first):** the invented-question pool now lives in `generated_questions`
> — a boot-hydrated in-memory cache keeps every engine call synchronous, `UNIQUE(alias)` in the database IS
> the "never ask the same question twice" gate, and `_runtime` run records stay out of the selection pool.
> Reading before hydration fails loudly (no silent empty pool); server + CLI boot both hydrate. Proven free:
> a DB-mode cassette replay ($0, real engine) landed 10 pool questions + 36 `_runtime` records with fresh
> alias suffixes — dedup consulted the full alias universe. `npm test` **102/102** · typecheck clean.
> **P4 ✅ closed 2026-07-09 (Carl: "A" — walk waived; the paid gate case was not run, his call).**
> **P5 🔨 BUILT (2026-07-09, $0, one commit per store):** people aliases · guest cap (→ `app_state` — the old
> file counter handed out a FRESH free-guest budget on every Render deploy; now it survives) · superadmin
> audit (→ append-only `audit_log` rows) · arc overlays + role profiles (boot-hydrated caches, disk edits
> self-migrate, cache-hit test = the cutover can never trigger paid regeneration) · lexicon traces. Two
> verified no-ops: people-profiles is dead code (roster replaced it — cleanup chip raised) and the old
> feedback writer was already gone. **After P5, no app data is file-only.** `npm test` **104/104** ·
> typecheck clean · real DB-mode boot proven. Every store still echoes to files = the rollback.
> **P5 ✅ closed 2026-07-09 (Carl: "a" — walk waived, his call).**
> **P6 ✅ closed 2026-07-09 (Carl: "a" — local Library glance, walk waived; imports re-verified free at close: local 102 sessions / 2,207 artifacts, live 70 / 1,248, pool 4,912 both).** [backfill-runs.ts](scripts/backfill-runs.ts) imported
> **100 old runs + 1,787 artifacts + 4,912 questions** into local Neon — your full Library history is in the
> database. Honest numbers: 158 dirs skipped (no session-state — CLI/smoke lanes the app never listed) and
> 7 runs skipped because their old demo org no longer exists (the FK fence refused them, correctly).
> Idempotent — a second full run changed nothing. An imported June run reads perfectly through the new
> store (briefing, 9 turns, all stage tabs). `npm test` **105/105**.
> **LIVE import ✅ ran on your go (2026-07-09):** ownership remapped by email (local ids don't exist on
> live) — **68 runs + 1,222 artifacts + the question pool are in the LIVE Neon DB**; your live account owns
> its history (15 runs); 53 old ownerless runs sit in the superadmin Guest-runs pile; 39 runs owned by
> local-only test accounts skipped honestly. Verified read-only through the member fence.
> ⚠️ **The live SITE shows this only after the next /release** — it still runs pre-cutover code that reads
> Render's (empty) disk. The data is already waiting in the live DB.
> **▶ Your move:** nothing — track closed and live. One loose end below: the pool-hang fix push.

> **✅ [engine-improvements](docs/plans/done/engine-improvements/plan.md) — TRACK CLOSED 2026-07-08 ($0 spend).**
> From reading all 169 runs' manager inputs ([report](docs/reports/manager-inputs-2026-07-07.html)): a 5-item list
> that shrank to one real code fix after validation. Double-checked against the repo before closing — fix wired,
> nothing uncommitted, `npm test` **96/96** green.
> - **✅ B (committed `c12ad562`)** — the smoke-test gate was **blind to the two honesty fields** (`confidence`/`dontAssume`): it checked 6 of the engine's 8 required prep keys, so a briefing could ship without its honesty guard and every test stayed green. Fixed: the gate reads the engine's own `PREP_REQUIRED_KEYS` (can't drift again).
> - **🟢 #2 / #3 closed by evidence** — engine already infers a grounded intent + hedges (Medium confidence + `dontAssume`) on thin / observation-only notes. No build needed.
> - **⏸️ Parked follow-ups (decision-blocked, NOT unfinished code)** — kept in the plan for later: **#1** stonewall exit (turn-loop behaviour change, brief at [01-stonewall-exit.md](docs/plans/done/engine-improvements/01-stonewall-exit.md)) · **B2** make the engine refuse a weak brief (live-path change) · **#4** paid coverage past the bi-weekly (spends money).
> Folder → [done/](docs/plans/done/engine-improvements/plan.md). **▶ Your move:** nothing — track closed. Un-park any follow-up as a fresh Darren-Method phase when you want it.

> **✅ [hide-ai-words](docs/plans/done/hide-ai-words/plan.md) — TRACK CLOSED 2026-07-08: both phases green-lit, $0 spend.**
> On "Words of each role" a manager can now hide any AI word (hover → trash) and put it back from a
> "Hidden words (N)" area; the AI's file is never touched (overlay sidecar only) and hidden words stop
> reaching real 1:1s. P1 `9a6f1ca9`; P2 walked in the browser by Carl ("its done") after a same-day
> re-verify (96/96 tests, typecheck clean, routes live). Folder → [done/](docs/plans/done/hide-ai-words/plan.md).
> **▶ Your move:** nothing — track closed. (Your kanban card on /tasks is browser-local — drag it to Done yourself.)

> **✅ [plan-turn-runner-gates](docs/plans/done/plan-turn-runner-gates/plan.md) — TRACK CLOSED 2026-07-08: all 3 phases green-lit ("CLOSE IT"), $0 spend.**
> Promoted the plan-turn.md *mechanical* contract rules from "model is asked to obey" to "runner enforces in code".
> **P1** item-shape gates in reconcile (`0d4325f1`) · **P2** queue-shape gates in [queue-manager.ts](backend/engine/queue-manager.ts)
> — `enforceCloserOnFinalTurn` + `enforceBudgetLength`, 9 tests incl. 2 regression locks · **P3** note-tag leak: a full
> trace found **no live leak** (the tagged note reaches only the manager dashboard + decision-logic parsers that need it;
> the customer eval input already excludes it), so it locked the safe state with a guard test + comment instead of
> speculative strip code — **deviation Carl accepted on close**. Free proof on close: `npm test` **98/98** · typecheck
> clean · **no paid runs**. Carl waived the free console fixture-walk. Folder → [done/](docs/plans/done/plan-turn-runner-gates/plan.md).
> **▶ Your move:** nothing — track closed. Overnight-QA *behaviour* findings (thread-follow drift, growth-arc stage-skip)
> stay parked in the plan as a likely separate follow-up.

> **✅ [guest-run](docs/plans/done/guest-run/plan.md) — TRACK CLOSED 2026-07-09: all 4 phases, ~$0.15 total spend.**
> Your "open way first" idea, delivered end-to-end: a no-account visitor walks in through `/` or `/login`,
> runs a full 1:1 (shared daily budget `GUEST_RUNS_PER_DAY` + per-IP cap), sees "Want to keep this 1:1?"
> on the briefing, and register/login auto-claims the run into their Past 1:1s; you watch the unclaimed
> pile on the superadmin **Guest runs** screen (`/admin/guests`, walls proven live: manager 403 + no rail
> row + deep-link bounce, anonymous 401). Closes: P1 walked · P2 walked · **P3 walk waived** (your "B",
> after the pool-starvation derailment) · **P4 sign-off delegated** ("Sign this off if you can").
> ⚠️ Two honest residuals ride until a real guest: the full save flow live (P3), and a populated Guest
> runs list — it reads Postgres, so it fills from NEW guest runs until postgres P6 imports the old ones.
> Folder → [done/](docs/plans/done/guest-run/plan.md). **▶ Your move:** nothing — track closed.

> **✅ [frontend-admin-split](docs/plans/done/frontend-admin-split/plan.md) — TRACK CLOSED 2026-07-08: all 5 phases (1·2·2b·3·4) green-lit in one day, $0 spend.**
> The split is real and ENFORCED: the customer app is its own built app (`:3002` dev) · the admin app
> carries no customer shell and never ships — **the public/Render deploy serves the customer app only**
> (your pick A; server.ts serves `frontend/dist` in prod, render.yaml builds it — a wrong-app deploy
> was caught and fixed before your Render setup) · **F-005 dead** (persona bench = admin-only module) ·
> an always-on test ([test-customer-serving.js](scripts/test-customer-serving.js)) rebuilds the customer
> bundle, greps it for internal-tool code + key patterns, and boots a real prod server to prove what `/`
> serves — on every `npm test`, forever. Along the way: the customer app caught up on 4 drifted features
> (welcome door, join links, guest reload, member only-runs). Tests 96→**98**, 3 typechecks.
> Folder → [done/](docs/plans/done/frontend-admin-split/plan.md); parked follow-ups in its plan.md.
> **⚠️ Render sequencing:** do your Render setup AFTER this is pushed — the blueprint fix must reach
> GitHub first. **▶ Your move:** nothing — track closed.

> **✅ [manager-ready](docs/plans/done/manager-ready/plan.md) — TRACK CLOSED 2026-07-08 (both phases green-lit, $0 spend).**
> Managers (the paying customers) get their own clean rail — **Home · New 1:1 · Team · Past 1:1s** — and bounce
> off internal tools (P1, green-lit 2026-07-05). The design polish landed too (P2, green-lit 2026-07-08 after a
> measured live walk): **Bricolage Grotesque headings**, **4px buttons**, **one date format** ("Mon 18 Nov 2024",
> shared `formatDate` — since adopted by intake + member-home as well), 12px remnants fixed. All work was already
> committed (`bf7e62f7`, `c6eca72f`) and survived the styles/design/ split; `npm test` 96/96 on close.
> Folder → [done/](docs/plans/done/manager-ready/plan.md). **▶ Your move:** nothing — track closed.

> **✅ [page-heartbeat](docs/plans/done/page-heartbeat/plan.md) — TRACK CLOSED 2026-07-08: all 3 phases Carl-walked, $0 total.**
> The three admin pages that described the app by hand now read it live and say what changed in
> plain words. **P1** /guide renders from `GET /api/v1/heartbeat` (`4e4ea787`) · **P3** /tasks fills
> itself from the live plan folders, "Update from docs" reconciles the Docs cards (hand-added cards
> untouched) · **P2** the Universe's pipeline ring derives from the app's real flow (`TOPBAR_STAGES`)
> and Update announces ring changes — walked live with a staged fake stage, announced both ways
> ("Pipeline step added/removed: Shadow review"), baseline survives the reload via a snapshot.
> Folder → [done/](docs/plans/done/page-heartbeat/plan.md). **▶ Your move:** nothing — track closed.

> **✅ [user-management](docs/plans/done/user-management/plan.md) — TRACK CLOSED, ALPHA-COMPLETE 2026-07-09.**
> Superadmin can now fully manage every registered tester: **Phase 1** flat User-management table · **Phase 2**
> change role (`PATCH …/role`) · **Phase 3** deactivate/reactivate (login blocked + live sessions killed now) ·
> **Phase 4** delete a user (`DELETE …/:id`) — runs kept-but-orphaned in one transaction (owner cleared in both the
> `sessions.user_id` column AND the `state.userId` jsonb), every FK cleared, 4 guardrails (self / superadmin / last
> active lead / still-manages-a-roster), proven test-first + a real local-Neon integration check. **Phase 5**
> (reset-password/invite) **🅿️ parked by Carl** — lowest value now, highest risk (a public no-login endpoint);
> build when real users need self-service recovery + a security check. Walks waived this session (Carl's call);
> `npm test` **109/109** · root+admin typecheck + admin build clean. Folder → [done/](docs/plans/done/user-management/plan.md).
> **▶ Your move:** nothing — track closed.

> **📄 [GTM validation one-pager](docs/reference/gtm-validation-plan.md) — DRAFTED (2026-07-05), needs your names.**
> The corridor-test plan Darren asked for: who the first 2–3 friendly managers are (criteria + a blank
> table for your names), how to run the corridor test (watch, don't demo; leave them alone a week), what
> to watch for, and the pass bar — a **second unprompted prep within ~2 weeks**. Review it, fill in the
> three names, done — that item goes from F to real.

---

## ✅ [pre-go-live](docs/plans/done/pre-go-live/overview.md) — TRACK CLOSED 2026-07-08 (9/9)

**PG9 (roster + polish) green-lit 2026-07-08** in Carl's blanket go — the last open phase, so the whole
pre-go-live build is done: manager Runs list, reopen, ratings, auto-built Team, person detail +
"Since last time", superadmin key, Registered screen, admin drilldown, and Tidy-up merge/rename
(now backed by the real roster since the people-roster track). Re-verified on close: whole-tree
`npm test` **98/98** · typecheck + builds green · total track spend ~$0.35/$3.
Folder → [done/](docs/plans/done/pre-go-live/overview.md).

---

## Parked / backlog plans (NOT in-flight)

Nothing below is actively being worked — scaffolded ideas in `docs/plans/`, waiting for a scope pick or a turn.

| Plan | State |
|---|---|
| [run-qa-fixes-jul04](docs/plans/future/run-qa-fixes-jul04/plan.md) | Moved to future/ 2026-07-09 (tie-off audit): Phase 1 ✅ done 2026-07-04; Phases 2–4 parked — each needs a ~$0.35 paid walk, revisit with real tester feedback |
| pool-hang fix (`c98d8324` → folded into main as `9e92b14f`) | ✅ DONE — folded in after P7 per this handoff (P7 gates AND the coalescing queue coexist, 109/109) and **pushed + LIVE 2026-07-09 on Carl's explicit go** (deploy `d3a8b4f3`, health green). The worktree branch `claude/unruffled-gauss-88b854` was deleted 2026-07-09 (tie-off audit) |
| [planner-grounding](docs/plans/future/planner-grounding/plan.md) | parked — awaiting scope pick (A/B/C/all) |
| [briefing-readability-p0](docs/plans/future/briefing-readability-p0/plan.md) | parked |

When one becomes live, move it up into "Your move" above and start its phases.

---

## How to read the boxes
`⬜ not started` · `🔨 in progress` · `✅ done (tested + green-lit)`
A pass isn't ✅ until its QA is walked and green-lit — I never self-certify.
Closed tracks are moved out of this file to [docs/plans/done/](docs/plans/done/) — check there for anything not listed above.

- Last updated: 2026-07-10 (engine-hardening P2 ✅ green-lit — concurrency cap + circuit breaker on live AI calls; P3 positive validation checks next)

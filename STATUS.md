# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.
Not sure which file is which? [docs/reference/trackers.md](docs/reference/trackers.md) maps where everything lives.
Closed tracks live in [docs/plans/done/](docs/plans/done/) — this file only holds what's live or awaiting your walk.

📍 **Checkpoint 2026-07-08:** agent toolbox landed + committed — 4 new skills (**checkpoint · phase-close · safe-commit · night-test**), guardrails hook wired (and fixed), reviewrun builds its own context block, CLAUDE.md slimmed to pointers, [cheat sheet](docs/reference/claude-cheat-sheet.html) + [usage retrospective](docs/reports/2026-07-08-claude-usage-retrospective.html). Commits `73ceac7b`→`956b4bb4`. Nothing awaiting a walk — the toolbox is live now.

---

## ▶ Your move

> **🔨 [agent-native](docs/plans/doing/agent-native/plan.md) — track (2026-07-08): make the codebase agent-native (agents verify/reproduce for $0, fewer "ask Carl" stops). P2 ✅ + P1 ✅ (the flagship) + P3 ✅ · P4 next.**
> **P3 ✅ green-lit (2026-07-08, $0, docs only):** the three "ask Carl" judgment calls are now written tables —
> [docs/reference/agent-decisions.md](docs/reference/agent-decisions.md): **A** paid-run tree (6-rung free ladder,
> only 3 spend-justifying situations) · **B** flag/retry/refuse policy (honesty rule operational; B2 + stonewall
> stay YOUR parked decisions) · **C** 7-check 🟢/🟡/🔴 good-enough rubric. Pre-walked against your real cto-check
> calls; cross-linked from guardrails 3 & 4.
> From the principal-architect audit. **5 phases, run order 2→1→3→4→5:** ② stale maps ✅ · ① cassette
> replay ✅ · ③ decision tables for the 3 Carl-gated calls · ④ web↔CLI parity test · ⑤ prompt↔gate registry.
> **P1 ✅ green-lit (2026-07-08, $0 — the "seed cassette" spend turned out unnecessary):** the whole 5-stage
> pipeline now replays **offline from any saved run folder** — `node scripts/replay-pipeline.js logs/<month>/<run-id>`
> → cassette → real engine → deterministic verdict, in ~5s at $0.00 with no API key; and
> `node scripts/repro-from-bundle.js <bundle>` answers **REPRODUCES: yes/no** for a bug report. Live-proven on a
> real July run (identical verdict, incl. its INFERRED_STATE_LEAK fail — faithful reproduction). Runs before
> ~Jul 01 lack per-turn planner raws (script says so). Seam: `backend/engine/cassette.ts` + `callAI`.
> **P2 ✅ (`2a67ec93`):** stale `.cursor` map rewritten, 18 dead comment refs fixed, new
> [docs/reference/engine-map.md](docs/reference/engine-map.md).
> `npm test` **94/94** · typecheck clean · lint's 44 problems pre-existing (noted in plan.md).
> **▶ Your move:** say "start phase 4" (orchestrator parity guard — a test that catches web↔CLI stage drift).

> **🔨 [render-deploy](docs/plans/doing/render-deploy/plan.md) — TONIGHT'S TRACK (2026-07-08): host Sero on Render.com + the /commit → /release workflow. P1 BUILT + double-checked, awaiting Carl's walk. Runbook: [TONIGHT.md](TONIGHT.md).**
> Carl's ask: "develop locally and easily get it live" — Render free plan (Frankfurt), blueprint auto-deploys
> every push to `main`, agent watches deploys via a Render API key in `.secrets/` (never committed).
> **4 phases:** ① pre-flight (Node pinned, `/api/v1/health`, `.secrets/` ignored) · ② `render.yaml` +
> `RENDER_SETUP.md` checklist · ③ Carl sets Render up, agent verifies live · ④ `/commit` + `/release` skills.
> **P1 🔨 BUILT (2026-07-08, $0) + double-checked on Carl's ask (running it tonight):** Node pinned to 24
> (`.node-version` + engines), public `GET /api/v1/health` answers `{"ok":true}` (test-first; proven on a real
> boot), `.secrets/` gitignored. **Double-check caught a deploy-blocker:** the origin guard only allowed
> `localhost` — on Render every browser save/start would 403. Fixed test-first ([origin.ts](backend/api/middleware/origin.ts),
> same-origin passes, foreign sites still 403; proven on a scratch boot both ways). Also pinned down for tonight:
> Render's `DATABASE_URL` = `.env`'s parked **LIVE_DATABASE_URL** (Sero Live Neon) + `APP_ENV=live`, and the
> blueprint build is `npm ci --include=dev` (plain ci skips vite under NODE_ENV=production). Baseline was 88/88;
> now `npm test` **91/91** · typecheck + build clean. Free-plan trade-offs Carl accepted: sleeps after 15 min
> idle, disk wiped per deploy (run-log detail + generated questions reset; users/logins/run list safe in Neon).
> **▶ Your move:** walk P1 — open `http://localhost:3001/api/v1/health`, expect `{"ok":true}`; click around,
> nothing else changed. Green light → commit + P2 (blueprint + your checklist).

> **🔨 [postgres-runtime-data](docs/plans/doing/postgres-runtime-data/plan.md) — NEW track (2026-07-08): move ALL app data into the database, for the live + local split. P1 ✅ committed · P2 BUILT, awaiting your walk.**
> Carl's ask: "we need to move all data into the database — we will have a live and local environment."
> **7 phases**, files keep being written until the last one (they ARE the rollback): ① foundations +
> live/local safety catch · ② dual-write · ③ read cutover (privacy-wall SQL — strictest QA) · ④ questions ·
> ⑤ small stores · ⑥ import all ~250 old runs (Carl's call) · ⑦ retire the files. Locked: import everything;
> local = Sero Local Neon, live = Sero Live Neon (created 2026-07-08, URL parked in `.env`).
> **P1 ✅ green-lit + committed (`a11f3594`):** new tables on Neon (`0009`+`0010`, dead `runs` dropped),
> self-migrating boot, live/local safety catch (proven both ways).
> **P2 🔨 BUILT (2026-07-08, $0):** every new run now dual-writes to Postgres AND disk — the run row (with
> fast index columns) + all pipeline stage prompt/response artifacts. Disk stays canonical (echo on), so
> nothing can be lost; a `RUN_FILE_ECHO` switch turns disk off in live. FK dropped (`0011`) so the CLI lane
> writes too. Proven **free**: a scripted run's row + all 7 stage artifacts landed in Neon, then cleaned up.
> `npm test` **88/88** · typecheck clean. Per-turn Q&A files + log-sidecars deferred (honest note in phase-2.md).
> **▶ Your move:** walk P2 — run a real 1:1 in the app; it should look identical (files still written), and I
> can show you the run + artifacts in Neon. Optional: 1 small paid gate case (~$0.35). Green light → commit + P3.

> **✅/⏸️ [engine-improvements](docs/plans/doing/engine-improvements/plan.md) — NEW engine track (2026-07-07, from the back-catalogue read). B DONE + committed; #1 written up as a decision brief.**
> From reading all 169 runs' manager inputs ([report](docs/reports/manager-inputs-2026-07-07.html)): a 5-item improvement list that shrank to 2-and-a-bit after validation.
> - **✅ B (committed `c12ad562`)** — the smoke-test gate was **blind to the two honesty fields** (`confidence`/`dontAssume`): it checked 6 of the engine's 8 required prep keys, so a briefing could ship without its honesty guard and every test stayed green. Fixed: the gate now reads the engine's own `PREP_REQUIRED_KEYS` (can't drift again). `npm test` **86/86** · typecheck clean · **no paid runs**.
> - **🟢 #2 / #3 closed by evidence** — engine already infers a grounded intent + hedges (Medium confidence + `dontAssume`) on thin / observation-only notes. No build needed.
> - **⏸️ #1 (stonewall exit)** — NOT a blind build: it's a turn-loop behaviour change (the loop rides the full budget even when a manager gives one-word answers every turn). Decision brief with the calls you need to make: [01-stonewall-exit.md](docs/plans/doing/engine-improvements/01-stonewall-exit.md).
> - **⏸️ B2 (make the engine *refuse* to ship a weak brief) + #4 (paid coverage of performance/growth/feels-off)** — parked for your go (B2 = live-path behaviour change; #4 = spends money).
> **▶ Your move:** read [01-stonewall-exit.md](docs/plans/doing/engine-improvements/01-stonewall-exit.md) and pick the stonewall policy (my recommend: **3 strikes → offer reschedule once → close**) and I build #1 fast. Docs committed (`6fb067f2`).

> **🔨 [plan-turn-runner-gates](docs/plans/doing/plan-turn-runner-gates/plan.md) — NEW engine track (2026-07-07). ALL 3 PHASES BUILT (batch, Carl: "complete all phases") — awaiting your walk. P1 green-lit.**
> Follow-up to the plan-turn.md prompt sharpen: promote the *mechanical* contract rules from "model is asked to
> obey" to "runner enforces in code". Built back-to-back, TDD + free checks, committed locally; none self-certified
> ✅ except P1 which you green-lit.
> - **P1 ✅ green-lit (`0d4325f1`)** — item-shape gates in [reconcile-queue.ts](backend/engine/reconcile-queue.ts):
>   an all-off-whitelist-axis item now drops (was materialising empty `{}`); empty / >18-word planner names drop
>   (reworded → falls back to original). 6 tests.
> - **P2 🔨 built (`51dea277` swept + `1fdec4d2`)** — queue-shape gates in [queue-manager.ts](backend/engine/queue-manager.ts):
>   `enforceCloserOnFinalTurn` (reserved closer leads on the final turn) + `enforceBudgetLength` (≤ budget+1, exactly
>   budget when ≤2). 9 tests incl. 2 regression locks. Dangling ref_alias already enforced by reconcile (sanitize-to-new)
>   — no destructive drop added.
> - **P3 🔨 built (`3f560c6b`)** — trace found **no live note-tag leak** (tagged note reaches only the manager
>   dashboard + decision-logic parsers that need it; the customer eval input already excludes it). Locked the safe
>   state with a guard test + comment instead of speculative strip code.
> `npm test` **86/86** · typecheck clean · **no paid runs**. **Your move: walk each phase's QA scenarios** (all free —
> `npm test` + a fixtures-only replay). Overnight-QA *behaviour* findings (thread-follow drift, growth-arc stage-skip)
> are logged in the PLAN as a likely *separate* follow-up, not phases here.

> **🔨 [feedback-inbox](docs/plans/doing/feedback-inbox/plan.md) — NEW track (started 2026-07-05). Phase 1 (the whole slice) BUILT, awaiting your walk.**
> Your ask: a page that shows what testers send via "Send feedback", with its own DB table.
> Done in one slice, the error-log pattern: **`feedback_notes` table live on Neon** (migration
> `0006`), the send-form now writes the table (the old JSONL file's one line was a throwaway QA
> note, not migrated), **`GET /api/v1/admin/feedback`** behind the superadmin wall, and a
> read-only **Feedback inbox** screen in the Admin rail under Error log. Live-proven end-to-end
> on a scratch pair (:3033 web → :3031 API): sent a note in the UI → row in Neon → inbox showed
> it ("just now · Carl · Sero (dev)"); manager 403, logged-out 401; test rows cleaned up.
> `npm test` **72/72** · both typechecks clean. Committed except two files carrying OTHER
> sessions' in-flight work: `shared/api.js` + `admin/src/ui/app-nav.js` (flagged in the PLAN —
> whichever track commits first carries them). ⚠️ **Restart your dev API** before walking on
> :3000/:3001. Walk: [phase-1.md](docs/plans/doing/feedback-inbox/phase-1.md).

> **🔨 [guest-run](docs/plans/doing/guest-run/plan.md) — Phase 1 ✅ · Phase 2 (guest front door) BUILT, awaiting your walk (2026-07-05).**
> Your "open way first" idea: no-account visitor runs a full 1:1, saves it at the end by registering/logging in.
> **P2 BUILT:** "Try it — no account needed" on the login screen → straight into intake; mid-run reload returns
> a guest to their run; back/forward + deep links bounce guests off everything internal; logged-in flows
> untouched. Test-first (`isGuestStage`), 73/73 · both typechecks · browser-proven logged-out (via 127.0.0.1,
> which skips the login cookie). **Walk:** the 4 scenarios in [phase-2.md](docs/plans/doing/guest-run/phase-2.md) —
> browse as a guest, do NOT press the final start (that's Phase 3's paid walk). Commit note: login.js also
> carries another track's in-flight login-photos work (declared in the commit).
> **P1 built test-first (claim endpoint + daily guest cap):** anonymous starts are back open but budgeted —
> `GUEST_RUNS_PER_DAY` (default 10) across all guests/day, plain "come back tomorrow" refusal, counter survives
> restarts; `POST /api/v1/sessions/:id/claim` hands an ownerless run to the newly logged-in caller (owned-by-
> someone-else answers 404, re-claim is a no-op); members still 403 on start; board reversal note written.
> Proof at $0: 73/73 tests · typecheck · live scratch-API walk incl. ownership verified ON DISK.
> **Walk:** the 5 scenarios in [phase-1.md](docs/plans/doing/guest-run/phase-1.md) (all free).
> Green light → Phase 2 (the "Try it" front door). Then: ③ save-at-end (one paid walk, your go) · ④ Guest runs screen.

> **🔨 [frontend-admin-split](docs/plans/doing/frontend-admin-split/plan.md) — RESTARTED on the Darren check (2026-07-05): Phase 2 BUILT, awaiting your walk.**
> The customer app is now **real**: `npm run dev:customer` → **http://localhost:3002** — login/register,
> the manager rail (Home · New 1:1 · Team · Past 1:1s), the whole prep flow, member screens — and **no
> internal tools anywhere** (`/universe`, `/tasks`, `/admin/*` don't exist there; bundle grep shows zero
> internal-tool code). Admin app on :3000 untouched. Free checks: customer build ✓ · `npm test` 69/69 ·
> typecheck ✓ · admin build ✓. **Walk:** the 4 scenarios in the PLAN's "Current state". Green light →
> commit + Phase 3 (slim the admin app), then Phase 4 (serve + fence = the deferred security bundle-proof).
> Phases 3–4 wait for your go — one at a time.

> **🔨 [manager-ready](docs/plans/doing/manager-ready/plan.md) — Phase 1 ✅ green-lit + committed · Phase 2 BUILT, awaiting walk (2026-07-05).**
> **P1 ✅ ("looks good continue"):** managers get their own rail — **Home · New 1:1 · Team · Past 1:1s** — and
> bounce off internal tools; admin + member rails untouched; 69/69 tests.
> **P2 BUILT — the design polish, awaiting your walk (not committed):** headings now render in **Bricolage
> Grotesque** (the Figma personality, finally in the app), **buttons sharpened to 4px**, **one date format
> everywhere** ("Mon 18 Nov 2024", shared `formatDate`, locale-proof), two 12px text remnants fixed. Live-verified:
> h1 font, 4px radius, date sample; 69/69 · typechecks clean. **Walk:** open any page — do the headings feel like
> your Figma? Check button corners + Library dates. Scenarios: [phase-2.md](docs/plans/doing/manager-ready/phase-2.md).
> ⚠️ Commit note: `design.css` also holds the mobile track's uncommitted CSS — on your green light their phases
> should commit first (or one commit declares both).

> **🔨 [page-heartbeat](docs/plans/doing/page-heartbeat/plan.md) — real UPDATE buttons (started 2026-07-05).**
> From the 25-page audit: Guide, Universe and the Tasks board were hand-typed snapshots of the app;
> everything else already refreshes itself. 3 phases: ① heartbeat endpoint + Guide · ② Universe ring ·
> ③ Tasks board reality check (warns, never rewrites your statuses).
> **Phase 1 ✅ — walked + green-lit by Carl 2026-07-05 ("ALL GOOD"), code committed `4e4ea787`.**
> `GET /api/v1/heartbeat` re-reads the repo per request; /guide's Screens + Commands render from it and
> "Check for changes" reports adds/removals in plain words (proven with a dummy file, both directions).
> `npm test` 65/65 · both typechecks clean. **Next: Phase 2 — Universe's pipeline ring goes honest** (⬜,
> waiting for Carl's go).

> **🔨 [user-management](docs/plans/doing/user-management/plan.md) Phase 3 — deactivate / reactivate a user: STARTING (2026-07-05).**
> Nullable `deactivatedAt` on `users` + `POST …/deactivate` & `…/reactivate`; login must reject deactivated users;
> **live session killed immediately** (kicked now, not just blocked next login); guardrails (no self, no superadmin,
> no org's last active lead); audit all. Baseline before touching: `npm test` **65/65** green.
> **Phase 1 ✅** — flat **User management** table (`d2bf9ec2` + `53f1f132`), companies as white cards (`af1992f3`);
> role pills; row opens the drilldown. **Phase 2 ✅** (`ac0359a7`, verified + closed 2026-07-05) — change role via
> `PATCH /api/v1/admin/users/:id/role`, superadmin-gated + origin-guarded, blocks demoting a company's last
> manager/admin (409). **Phase 0 finding:** the `runs` table has NO `userId` column (owner via `state.userId` on
> disk), so Phase 4 "keep-but-orphan runs" needs **no migration**; the real FKs to clear on delete are
> `auth_sessions` + `invitations.invitedBy`; **no email infra** → Phase 5 uses a copyable reset link.
> Phases 0 (write findings), 3–5 still ⬜.

> **📄 [GTM validation one-pager](docs/reference/gtm-validation-plan.md) — DRAFTED (2026-07-05), needs your names.**
> The corridor-test plan Darren asked for: who the first 2–3 friendly managers are (criteria + a blank
> table for your names), how to run the corridor test (watch, don't demo; leave them alone a week), what
> to watch for, and the pass bar — a **second unprompted prep within ~2 weeks**. Review it, fill in the
> three names, done — that item goes from F to real.

---

## Now active: [pre-go-live](docs/plans/doing/pre-go-live/overview.md) — the standing line

The manager's Team & Runs, ratings, and a superadmin window on the alpha. **9 phases, one at a time.**
**PG1–PG8 ✅ closed (through 2026-07-04)** — member "Past 1:1s" + reopen + rate, the auto-built Team, each
person's "Since last time" recap, the read-only cross-company **superadmin key**, the **Registered** superadmin
screen (PG7, `c95a0052` + `a1781799`), and the admin user → teams → runs drilldown (PG8). Full detail lives in
[docs/plans/doing/pre-go-live/progress.md](docs/plans/doing/pre-go-live/progress.md).

**PG9 (roster + polish) is built but NOT yet closed — the last open pre-go-live phase.** On **Team**, a **Tidy up**
mode lets you **merge** two cards for the same person (history + average combine) and **rename** a person; it sticks
after reload. Awaiting your walk (or say "close pg9" to close it like PG8). Free checks: `npm test` **60/60** ·
typecheck + admin build green; routes verified live (gated). QA sheets:
[PG8](docs/plans/doing/pre-go-live/008-admin-user-drilldown/99-qa-signoff.md) ·
[PG9](docs/plans/doing/pre-go-live/009-roster-polish/99-qa-signoff.md). No hosting. Budget used ~$0.35/$3.

---

## Parked / backlog plans (NOT in-flight)

Nothing below is actively being worked — scaffolded ideas in `docs/plans/`, waiting for a scope pick or a turn.

| Plan | State |
|---|---|
| [run-qa-fixes-jul04](docs/plans/doing/run-qa-fixes-jul04/plan.md) | Phase 1 (C1 — strip tester notes) ✅ approved 2026-07-04 (`02d825c2`, walk waived); Phases 2–4 ⬜ (prompt changes — need a paid walk) |
| [planner-grounding](docs/plans/future/planner-grounding/plan.md) | parked — awaiting scope pick (A/B/C/all) |
| [briefing-readability-p0](docs/plans/future/briefing-readability-p0/plan.md) | parked |

When one becomes live, move it up into "Your move" above and start its phases.

---

## How to read the boxes
`⬜ not started` · `🔨 in progress` · `✅ done (tested + green-lit)`
A pass isn't ✅ until its QA is walked and green-lit — I never self-certify.
Closed tracks are moved out of this file to [docs/plans/done/](docs/plans/done/) — check there for anything not listed above.

- Last updated: 2026-07-08 (trimmed: closed tracks moved out to the done/ archive; this file now holds only live + awaiting-walk work)

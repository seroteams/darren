# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.
Not sure which file is which? [docs/reference/trackers.md](docs/reference/trackers.md) maps where everything lives.
Closed tracks live in [docs/plans/done/](docs/plans/done/) — this file only holds what's live or awaiting your walk.

📍 **Feedback inbox — ✅ CLOSED 2026-07-08:** both phases (inbox screen + per-row Delete) green-lit by Carl ("close it") and moved to [done/](docs/plans/done/feedback-inbox/plan.md). Was already built + committed; wiring re-confirmed intact after the `0006`→`0011` DB drift.

📍 **Checkpoint 2026-07-08:** agent toolbox landed + committed — 4 new skills (**checkpoint · phase-close · safe-commit · night-test**), guardrails hook wired (and fixed), reviewrun builds its own context block, CLAUDE.md slimmed to pointers, [cheat sheet](docs/reference/claude-cheat-sheet.html) + [usage retrospective](docs/reports/2026-07-08-claude-usage-retrospective.html). Commits `73ceac7b`→`956b4bb4`. Nothing awaiting a walk — the toolbox is live now.

---

## ▶ Your move

> **✅ [agent-native](docs/plans/done/agent-native/plan.md) — TRACK CLOSED 2026-07-08: all 5 phases green-lit in one day, $0 spend.**
> The codebase is now agent-native: **maps** are true (engine-map.md + fixed `.cursor` rule) · the **whole pipeline
> replays offline** from any saved run (`scripts/replay-pipeline.js`, ~5s/$0; `scripts/repro-from-bundle.js` answers
> REPRODUCES yes/no on a bug bundle) · your three recurring **judgment calls are written tables**
> ([agent-decisions.md](docs/reference/agent-decisions.md)) · **web↔CLI drift** and **prompt↔gate drift** both break
> `npm test` with named errors. Tests 92→**96**, all offline. Folder → [done/](docs/plans/done/agent-native/plan.md);
> parked follow-ups listed in its plan.md. **▶ Your move:** nothing — track closed.

> **🔨 [render-deploy](docs/plans/doing/render-deploy/plan.md) — TONIGHT'S TRACK (2026-07-08): host Sero on Render.com + the /commit → /release workflow. P1 ✅ green-lit + committed · P2 next. Runbook: [TONIGHT.md](TONIGHT.md).**
> Carl's ask: "develop locally and easily get it live" — Render free plan (Frankfurt), blueprint auto-deploys
> every push to `main`, agent watches deploys via a Render API key in `.secrets/` (never committed).
> **4 phases:** ① pre-flight (Node pinned, `/api/v1/health`, `.secrets/` ignored) · ② `render.yaml` +
> `RENDER_SETUP.md` checklist · ③ Carl sets Render up, agent verifies live · ④ `/commit` + `/release` skills.
> **P1 ✅ green-lit + committed (`1b67f792`, 2026-07-08, $0):** Node pinned to 24
> (`.node-version` + engines), public `GET /api/v1/health` answers `{"ok":true}` (test-first; proven on a real
> boot), `.secrets/` gitignored. **Double-check caught a deploy-blocker:** the origin guard only allowed
> `localhost` — on Render every browser save/start would 403. Fixed test-first ([origin.ts](backend/api/middleware/origin.ts),
> same-origin passes, foreign sites still 403; proven on a scratch boot both ways). Also pinned down for tonight:
> Render's `DATABASE_URL` = `.env`'s parked **LIVE_DATABASE_URL** (Sero Live Neon) + `APP_ENV=live`, and the
> blueprint build is `npm ci --include=dev` (plain ci skips vite under NODE_ENV=production). `npm test` **96/96**
> (whole-tree) · typecheck + build clean. Free-plan trade-offs Carl accepted: sleeps after 15 min
> idle, disk wiped per deploy (run-log detail + generated questions reset; users/logins/run list safe in Neon).
> **▶ Your move:** say "start P2" → the `render.yaml` blueprint + your `RENDER_SETUP.md` checklist.

> **🔨 [postgres-runtime-data](docs/plans/doing/postgres-runtime-data/plan.md) — NEW track (2026-07-08): move ALL app data into the database, for the live + local split. P1 ✅ · P2 ✅ green-lit + committed · P3 next.**
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
> **▶ Your move:** say "start P3" → read cutover (the app trusts the DB; org/member privacy walls become SQL — strictest QA).

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

> **🔨 [guest-run](docs/plans/doing/guest-run/plan.md) — P1 ✅ · P2 ✅ green-lit 2026-07-08 · P3 (save-at-end) 🔨 BUILT, awaiting your walk.**
> Your "open way first" idea: no-account visitor runs a full 1:1, saves it at the end by registering/logging in.
> **P2 ✅ (walked 2026-07-08, "yeah looks good"):** guest lane frontend — by walk time there were TWO guest
> doors (the `/` start screen from the closed start-screen track + the "Try it" link on `/login`), both →
> intake; mid-run reload keeps a guest in their run; guests bounce off everything internal; no rail/badge
> (leak fixed `093981e1`); logged-in flows untouched. 73/73 at build · both typechecks.
> **P1 ✅ (claim endpoint + daily guest cap):** `GUEST_RUNS_PER_DAY` (default 10) shared daily budget +
> `POST /api/v1/sessions/:id/claim` hands an ownerless run to the newly logged-in caller.
> **P3 🔨 BUILT (2026-07-08, $0) — awaiting your walk:** after the briefing a guest sees "Want to keep
> this 1:1?" → Create a free account / Log in → auto-claim → lands straight on the saved run; guests see
> no star rating or Finish & review. Test-first (5 new claim tests, red→green); 96/96 · both typechecks.
> Browser-proven free: an old ownerless run's briefing shows the save card; the register button marks the
> run; scenario 1 walked live (bogus marker + login → normal home, claim 404 swallowed, no dead end).
> **▶ Your move:** scenarios 2–3 in [phase-3.md](docs/plans/doing/guest-run/phase-3.md) are ONE paid
> end-to-end guest walk (~$0.35–0.60) — say go and walk it. Then ④ Guest runs screen.

> **🔨 [frontend-admin-split](docs/plans/doing/frontend-admin-split/plan.md) — P2 ✅ · P2b ✅ green-lit (2026-07-08) · Phase 3 (slim the admin app) STARTING.**
> **Why it's live again:** render-deploy serves `admin/dist` at the public URL, so this track is what
> makes the public URL customer-only (you picked "split now", 2026-07-08).
> **P2 ✅ (`53f25881`):** the customer app on **:3002** is real and approved.
> **P2b ✅ green-lit + committed (2026-07-08, $0):** the P2 snapshot had drifted — four customer features
> existed on :3000 but not :3002. All four mirrored in (no admin files touched): ① guest-first **welcome**
> front door at `/` ② **/join/:token** invite links ③ guest mid-run **reload** resumes ④ **member
> only-runs view**. Walked by Carl; `npm test` 96/96 · typecheck · build ✓.
> **P3 🔨 next:** physically move the customer stages out of `admin/` so the admin bundle is internal-only
> (kills F-005 — hidden persona-bench DOM in the customer bundle — and ends snapshot drift for good).
> Then P4 (serve + fence = the bundle-proof). One at a time.

> **✅ [manager-ready](docs/plans/done/manager-ready/plan.md) — TRACK CLOSED 2026-07-08 (both phases green-lit, $0 spend).**
> Managers (the paying customers) get their own clean rail — **Home · New 1:1 · Team · Past 1:1s** — and bounce
> off internal tools (P1, green-lit 2026-07-05). The design polish landed too (P2, green-lit 2026-07-08 after a
> measured live walk): **Bricolage Grotesque headings**, **4px buttons**, **one date format** ("Mon 18 Nov 2024",
> shared `formatDate` — since adopted by intake + member-home as well), 12px remnants fixed. All work was already
> committed (`bf7e62f7`, `c6eca72f`) and survived the styles/design/ split; `npm test` 96/96 on close.
> Folder → [done/](docs/plans/done/manager-ready/plan.md). **▶ Your move:** nothing — track closed.

> **🔨 [page-heartbeat](docs/plans/doing/page-heartbeat/plan.md) — real UPDATE buttons. Phases 1 + 3 ✅ · only Phase 2 (Universe ring) left ⬜.**
> From the 25-page audit: Guide, Universe and the Tasks board were hand-typed snapshots of the app.
> **Phase 1 ✅** — green-lit 2026-07-05 ("ALL GOOD"), committed `4e4ea787`: `GET /api/v1/heartbeat` +
> /guide renders live with a plain-words changelog.
> **Phase 3 ✅ — green-lit 2026-07-08 after Carl's full live walk (all 4 scenarios, $0).** The planner
> fills itself from the live plan folders: **Update from docs** reconciles auto-managed "Docs" cards
> (add/update/move/remove; your own cards never touched — Carl's pick, option A), and since `1e9a42b4`
> the board quietly syncs on open too (hardcoded seed removed). Walk proved: card pulse on a status
> move, fade-to-Done on a folder move, removal on delete. `npm test` **96/96** · both typechecks clean.
> **▶ Your move:** say go on Phase 2 (Universe ring goes honest) — the last phase of this track.

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

- Last updated: 2026-07-08 (render-deploy P1 + postgres-runtime-data P2 green-lit + committed — `1b67f792`, `57d44b4b`)

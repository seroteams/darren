# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.
Not sure which file is which? [docs/TRACKERS.md](docs/TRACKERS.md) maps where everything lives.

---

## ▶ Your move

> **🔨 NEW TRACK: [mobile-responsive](docs/todo/mobile-responsive/PLAN.md) — the whole app on a phone (started 2026-07-05).**
> Carl's scope call: **all 38 screens, full polish**, own track, existing styles (no Flowbite re-skin here).
> 5 phases: ① responsive shell (rail → drawer + mobile header) ② auth + member screens ③ run pipeline on a
> phone ④ global sweep + admin core (tables, iOS zoom, touch targets) ⑤ QA tools + Universe.
> **Phase 1 BUILT + browser-verified at 375×812 — awaiting your walk (not committed).** Below 768px the rail
> is now a slide-in drawer behind a ☰ header; in-session the stage bar goes compact under it; desktop is
> untouched (rail + hover-expand verified at 1280). Free checks green: `npm test` 65/65 · typecheck · build.
> Walk it: phone mode in devtools (or real phone via Vite `--host`) → scenarios in
> [phase-1.md](docs/todo/mobile-responsive/phase-1.md). No paid runs in this track.

> **🔨 [page-heartbeat](docs/todo/page-heartbeat/PLAN.md) — real UPDATE buttons (started 2026-07-05).**
> From the 25-page audit: Guide, Universe and the Tasks board were hand-typed snapshots of the app;
> everything else already refreshes itself. 3 phases: ① heartbeat endpoint + Guide · ② Universe ring ·
> ③ Tasks board reality check (warns, never rewrites your statuses).
> **Phase 1 ✅ — walked + green-lit by Carl 2026-07-05 ("ALL GOOD"), code committed `4e4ea787`.**
> `GET /api/v1/heartbeat` re-reads the repo per request; /guide's Screens + Commands render from it and
> "Check for changes" reports adds/removals in plain words (proven with a dummy file, both directions).
> `npm test` 65/65 · both typechecks clean. **Next: Phase 2 — Universe's pipeline ring goes honest** (⬜,
> waiting for Carl's go).

> **🔨 [design-system](docs/todo/design-system/PLAN.md) — Sero × Flowbite. Phase 1 ✅ green-lit ("NICE LETS GO", `d7651e7f`) · Phase 2 BUILT, awaiting walk (2026-07-05).**
> The Sero look = **Flowbite 2.5.2 + Carl's colours**. Done: component sheet at
> `admin/public/sero-flowbite/index.html` (nav: Admin → Design system) with colours, type, buttons, badges,
> inputs (both variants), **toasts/alerts**, **the one table style**, cards, dropdown+modal, nav, side panel,
> the **10-rule "before you build" checklist**, and the component inventory. Full-app UI audit done (top
> drifts: inputs/dropdowns/progress/errors ×2 each, inline hex in 8 files — future cleanups, parked).
> **Phase 2 built:** root `DESIGN.md` (auto-loads every session — verified `hasDesign: true`), archived doc
> banner, memory saved. **Walk:** (1) sheet still looks right, (2) ask any fresh agent to mock a small screen
> — it should come out Sero without being told. Green light = commit + close out to done/.

> **🔨 [error-log](docs/todo/error-log/PLAN.md) — NEW track, built 2026-07-05 on Carl's "GO GO".**
> A superadmin **Error log** screen: every error any user hits, across **your local dev and the published live
> Sero** (one Neon, each row tagged **Local / Live**, filterable), newest first. **Phase 0 ✅** (plan + schema check).
> **Phase 1 built — awaiting your QA walk:** `error_logs` table live on Neon (verified by query); every API 5xx now
> records one row (secret-safe, fire-and-forget, `console.error` kept as backstop). Offline green: `npm test` **65/65**,
> typecheck clean; **not committed** until you sign off. **Next: Phase 2 — the screen + nav item.** Phases 2–4 ⬜.
>
> **🔨 [user-management](docs/todo/user-management/PLAN.md) Phase 3 — deactivate / reactivate a user: STARTING (2026-07-05).**
> Nullable `deactivatedAt` on `users` + `POST …/deactivate` & `…/reactivate`; login must reject deactivated users;
> **live session killed immediately** (kicked now, not just blocked next login); guardrails (no self, no superadmin,
> no org's last active lead); audit all. Baseline before touching: `npm test` **65/65** green.
>
> **Phase 2 ✅ done + VERIFIED end-to-end + committed (`ac0359a7`), closed 2026-07-05.** Carl walked it (worked);
> destination verified at the store: `Dev Member` is now `manager` in the **live Neon `users` table** (05:44:58) and a
> matching `role member→manager` line is in the **audit file** — not screen-only. `PATCH /api/v1/admin/users/:id/role`,
> superadmin-gated + origin-guarded, **blocks demoting a company's last manager/admin** (409). The stale-API 404 Carl
> first hit was fixed by restarting the :3001 process (concurrency respawns fresh code).
>
> **✅ [test-engine-hub](docs/todo/test-engine-hub/PLAN.md) Phase 1 — persona-run job service: DONE 2026-07-05 (walk delegated to Claude, all scenarios passed live; committed `e148db2a`).**
> One page: ▶ Run on a persona → full engine runs on its scripted answers → review with the 8-dimension grid.
> Phase 1 landed the API doors + guard rails, **verified against a live instance**: idle status ✓, unknown
> persona 404 ✓, missing id 400 ✓, start 202 ✓, double-start 409 ✓, honest dry-run label ✓, done in ~5s ✓,
> slot frees after ✓, logged-out 401 ✓, $0 OpenAI. (Tested on a throwaway :3002 instance with the dev
> side-door; the :3001 API Carl uses was untouched.) **Next: Phase 2 — the real engine runner (free,
> offline-tested) — on Carl's go.** Only Phase 3 spends money (one ~$0.35 run, Carl's own click).
>
> **Phase 1 ✅ done + committed** — the flat **User management** table (`d2bf9ec2` screen + `53f1f132` rename),
> companies as **white cards** (`af1992f3`); role pills; the whole row opens the drilldown. **Phase 0** mostly
> done — superadmin access confirmed; **key finding: the `runs` table has NO `userId` column** (a run links to
> its owner via `state.userId` on disk), so Phase 4 "keep-but-orphan runs" needs **no migration**; the real FKs
> to clear on delete are `auth_sessions` + `invitations.invitedBy`; **no email infra** → Phase 5 uses a copyable
> reset link. Phases 0 (write findings), 3–5 still ⬜.
> PG8 ✅ **closed 2026-07-04** (Carl's call — read-only walk skipped; verification stands). PG9 (below) is still built-but-un-walked.

**Now active: [pre-go-live](docs/pre-go-live/OVERVIEW.md) — the manager's Team & Runs, ratings, and a
superadmin window on the alpha.** 9 phases, one at a time.
**PG1–PG5 ✅ (through 2026-07-04) · PG6 (Superadmin gate) ✅ — signed off + committed 2026-07-04.** The
member side is done: **"Past 1:1s"** list + reopen + rate, the auto-built **Team**, and each person's page
with a **"Since last time"** recap and one-tap **"Prep your next 1:1"**. Behind the scenes, your account now
has a read-only, cross-company **superadmin key** — server-resolved allowlist, read-only by construction,
one audit line per access, proven by 13 tests (the dev side-door can't pass). No screen yet.

**PG7 ✅ (both steps green-lit 2026-07-04, `c95a0052` + `a1781799`).** The **Registered** superadmin screen
is live: every alpha company + its people with the return-visit signal (run counts, last-active, week
counts) and the alpha-wide ★ rating summary; nav item superadmin-only, backend 403 the real wall.

**PG8 ✅ done — closed 2026-07-04 on Carl's call ("close pg8").** Admin: user → teams → runs, incl. opening a
1:1's briefing **read-only** behind the superadmin gate. Steps 01–02 were walked earlier ("clicked through —
done"); the Step 03 read-only walk was **skipped by Carl's decision** — technical verification stands (route
gates live 401, `runDetail`/`getAdminRun` wired end-to-end, `npm test` 60/60). A route bug caught during the
earlier walk (per-user route 404'd every id) was fixed + guarded by a test.

**PG9 (roster + polish) is built but NOT yet closed** — on **Team**, a **Tidy up** mode lets you **merge** two
cards for the same person (history + average combine) and **rename** a person; it sticks after reload. With
PG8 closed, PG9 is the **last open pre-go-live phase** — still awaiting your walk (or say "close pg9" to close
it like PG8). Free checks: `npm test` **60/60** · typecheck + admin build green; routes verified live (gated).
QA sheets:
[PG8](docs/pre-go-live/008-admin-user-drilldown/99-qa-signoff.md) ·
[PG9](docs/pre-go-live/009-roster-polish/99-qa-signoff.md).
Live state: [docs/pre-go-live/PROGRESS.md](docs/pre-go-live/PROGRESS.md). No hosting. Budget used ~$0.35/$3.

> 📍 **Checkpoint (say "check point" to come back here).** Saved 2026-07-05 — **full-save commit before the
> design-system build**: whole working tree committed (incl. in-flight `universe.ts` WIP, new runtime questions,
> autostart scripts, hide-ai-words / error-log / test-engine-hub folders). UI-idea prototype folders gone from
> `admin/public/`; stale `dist/sero-original` cleaned (gitignored). Also standing: user-management **Phase 2
> built + COMMITTED `ac0359a7`** (needs an API restart to walk); PG8 closed, PG9 built-awaiting-close.
> **New active track: design-system (Sero × Flowbite)** — Phase 1 (component sheet) building next.
> In any fresh session, say **"check point"** and I'll read this file + the PROGRESS log + recent
> commits and give you the full "where we are, your move" picture — no digging needed.

> This track **supersedes** the deferred **member-nav Phase 2** (real Runs) and **009's deferred "real
> Team content"** — both folded in here so trackers don't multiply.

### Just finished: Roles admin/manager/member ✅ (side-task, closed 2026-07-04 → done/)

Renamed the account-role model **owner/admin/member → admin/manager/member** (Carl's call). Both phases done
same day, archived at [docs/todo/done/roles-admin-manager-member/](docs/todo/done/roles-admin-manager-member/PLAN.md).
- **Phase 1** (`dc6a9f7d`): enum renamed + migration `0003` **applied to live Neon** — every `owner` → `manager`,
  `carl@seroteams.com` → `admin` (verified by DB query: admin=1, manager=11, member=1, no owner). Signup now
  creates managers; console gate (`requireAdmin`) opens to admin+manager; dev side-door → admin.
- **Phase 2** (`b0f0c26d`): frontend `isAdmin` mirrors the backend (manager+admin) so migrated managers keep the
  console; dead `"owner"` role value purged from fixtures. Company-*ownership* wording kept (different concept).
- Superadmin is unchanged — still `carl@seroteams.com` via the `SUPERADMIN_EMAILS` allowlist, independent of role.
- **Note:** wherever older tracker text says "a normal owner" (e.g. PG8 below), that's now "a normal manager".
- Free checks green: `npm test` 57/57 · backend + admin typecheck clean. **Pending: Carl's browser eyeball** (log
  in as manager/admin/member) — mechanics verified, visual walk is yours whenever.

### Just finished: cleanup-audit ✅ (closed 2026-07-04 → done/)

The July 4 deep-dive audit's cleanup — all 4 phases done in one day, archived at
[docs/todo/done/cleanup-audit/](docs/todo/done/cleanup-audit/PLAN.md). Quick fixes (17 hidden type
errors → 0) · dead cruft deleted (~1,650 lines + 75MB logs + 8 stale branches, all archive-tagged) ·
one shared escapeHtml + relTime for the admin app · one shared prompt-filler for all 5 engine builders.
Tests grew 52 → **57** and the runner now auto-finds every test. Proven by a live gate case
(**PASS**, 1 ok / 0 regressed). OpenAI billing was topped up mid-session; spend ~$0.35.
Parked follow-ups (engine unit tests, god-file splits, purge-guard) live in the archived PLAN.md.

<details><summary>Phase 009 — non-hosting ultra batch (✅ closed 2026-07-01 → done/)</summary>

**Phases 1 · 3 · 4 · 5 · 6 · 7 ✅ done (6 & 7 walked + signed off 2026-07-01). Phase 2 ⏸ parked (→ hosting, later) · Phase 8 ⏸ deferred (→ pre-go-live continuity). Every actionable 009 phase is complete; the folder is archived to `done/`.**

009 turned Sero into something real managers can safely use on real teams, and got the codebase
newcomer-clean. Full plan: [docs/todo/done/009-ready-to-share/](docs/todo/done/009-ready-to-share/PLAN.md).

> **Ultra batch (2026-07-01):** Carl OK'd finishing every remaining non-hosting phase in one run —
> **nothing live, no paid runs.** I build + offline-verify (`npm test`/`typecheck`) + commit each locally.
> Everything I ship is **"built — awaiting your QA"**, never self-certified ✅. You walk the QA scenarios
> (collected per phase below) whenever you're ready. Hosting (Phase 2) stays parked.

- **Phase 1 ✅ — Safety floor (execute 008). Signed off 2026-07-01, committed `e68c4c8c`.** You walked all
  6 QA scenarios (cross-company wall, role limits, key-search zero-hits, DB clean, no-login wall) and gave
  the go. Human expert sign-off **waived for alpha** (accepted risk — keep to 2–3 friendly managers;
  deferred, not cancelled). Build badge: 3/4 of the 008 steps flipped done; the human-expert step stays
  open by design.
- **Phase 4 ✅ — Clear the QA pile (done 2026-07-01).** All 9 built-but-un-QA'd features ticked:
  repo-tidy P1 🟢 · frontend-admin-split P1 🟢 · tracker-consolidation P1 🟢 · member-nav P1 🟢 (fix
  `fc77b8ba`) · stage-data-tabs 🟢 · sent-preview 🟢 · repo-tidy P2 🟢 · todo-board-rebuild P3 🟢 · 
  briefing-grounding-fixes P1 🟢. Nothing half-built left on screen.
- **Phase 2 ⏸ — PARKED (2026-07-01, Carl's call): not hosting yet.** Picks back up when Carl wants a
  shareable URL. The rest of 009 does not depend on it.
- **The ultra batch — progress:**
  - ✅ tidy/audit + member-nav reconcile (committed)
  - ✅ **Phase 3 (privacy + first run)** (`05abd1e0`) — **verified end-to-end 2026-07-01, both roles**
    (member + owner, live): privacy note + consent link, first-run "how it works" on member Home, real
    Team/Runs empty states (no "Coming soon"), register landing fix. Walk it anytime — nothing self-certified blind.
  - ✅ **Phase 5 (feedback + one-pager)** (`92aff101`) — **verified end-to-end** (test-first backend):
    feedback note reaches `content/data/feedback/feedback.jsonl` (destination verified), empty → 400,
    logged-out → 401; About one-pager + both in the nav footer. Feedback file is git-ignored.
  - ✅ **Phase 6 (repo-tidy 3–4 + hermetic tests)** — `sessions.controller` split 698→134 (`b51aec29`),
    `npm test` hermetic (`c66a455a`), admin TS pilot (`70e0f339`). Walked + signed off 2026-07-01.
  - ✅ **Phase 7 (docs + newcomer README)** — tracker-consolidation + README two-source clarity (`0f5f6677`).
  - ⏸ **Phase 8 (continuity / "remembering") — deferred**, folded into the pre-go-live track.
- **Baseline (free, 2026-07-01):** `npm test` **52/52** · `npm run typecheck` clean. Paid gate needs your go-ahead.

</details>

**Member navigation — Phase 1 ✅ (committed + signed off).** Corrected 2026-07-01: this was already
committed (`d864a3a3` + landing fix `fc77b8ba`) and QA-ticked (`1aea2b1b`) — the earlier "built,
uncommitted" note was stale. Member rail = Home · Team · Runs, members land on a clean Home, admins
untouched, dev Admin/Standard quick-swap works. Phase 2 (Real Runs) has backend groundwork landed
(`ca23831e`/`9a2a7148`/`f30783d9`) but the Runs *page* is still the placeholder — that's the genuinely
open member-nav work. Plan: [docs/todo/member-nav/](docs/todo/member-nav/PLAN.md).

- Last updated: 2026-07-04

---

### Just finished: Admin access guard (Option A) ✅ (closed)
Internal tooling login-gated (Phase 1 `370033b5`) + admin-role-gated (Phase 2, 2026-07-01) + dev Admin/Standard
quick-swap (`53dbd0ae`). Member refused the tooling (403), owners unaffected. Archived at
[docs/todo/done/admin-access-guard/](docs/todo/done/admin-access-guard/PLAN.md). Parked: Option B (`/api/admin/*`
prefix), Option C (separate customer `frontend/`), roles-management UI.

---

### Just finished: Auth hardening ✅ (closed)
Both post-007 holes shut, tested, committed. Phase 1 (live sessions fenced by company, `12fc3071`) · Phase 2
(runs endpoints require login, session *start* stays open by your call). Archived at
[docs/todo/done/auth-hardening/](docs/todo/done/auth-hardening/PLAN.md). Prior: Phase 007 login screen ✅
([docs/todo/done/login-screen/](docs/todo/done/login-screen/PLAN.md)).

---

## Parked / backlog plans (NOT in-flight)

Nothing below is actively being worked. They're scaffolded ideas in `docs/todo/`,
waiting for a scope pick or a turn. Listed here so the folder count never *looks*
like 8 things are half-done at once — they aren't.

| Plan | State |
|---|---|
| [test-engine-hub](docs/todo/test-engine-hub/PLAN.md) | **ACTIVE (see "Your move" up top).** Phase 1 ✅ (job service, walked 2026-07-05, `e148db2a`) · Phases 2–4 ⬜. RUN-a-persona eval hub; merges Personas/Regression/Compare. Only Phase 3 costs (~$0.35). |
| [run-qa-fixes-jul04](docs/todo/run-qa-fixes-jul04/PLAN.md) | Phase 1 (C1 — strip tester notes) ✅ approved 2026-07-04 (committed `02d825c2`, walk waived); Phases 2–4 ⬜ (prompt changes — need a paid walk) |
| [user-management](docs/todo/user-management/PLAN.md) | **ACTIVE (see "Your move" up top).** Phase 1 ✅ · Phase 2 ✅ (change role, `ac0359a7`, verified + closed 2026-07-05) · **Phase 3 🔨 (deactivate/reactivate) starting.** Phases 0, 4–5 ⬜. |
| [planner-grounding](docs/todo/planner-grounding/PLAN.md) | parked — awaiting scope pick (A/B/C/all) |
| [briefing-readability-p0](docs/todo/briefing-readability-p0/PLAN.md) | parked |
| [briefing-grounding-fixes](docs/todo/done/briefing-grounding-fixes/PLAN.md) | ✅ closed out → done/ 2026-07-05 (`3d339e47`) |
| [see-before-sent](docs/todo/done/see-before-sent/PLAN.md) | ✅ folded into sent-preview + archived 2026-07-04 |
| [sent-preview](docs/todo/done/sent-preview/PLAN.md) | ✅ done (both phases walked 2026-07-01) — archived to done/ 2026-07-05 |
| [stage-data-tabs](docs/todo/done/stage-data-tabs/PLAN.md) | ✅ done (all 3 phases walked 2026-07-01) — archived to done/ 2026-07-05 |
| [repo-tidy](docs/todo/done/repo-tidy/PLAN.md) | ✅ done (all 4 phases; 3–4 via 009 P6) — archived to done/ |
| [tracker-consolidation](docs/todo/done/tracker-consolidation/PLAN.md) | ✅ done (all 4 phases; 2–4 via 009 P7) — archived to done/ |
| [todo-board-rebuild](docs/todo/done/todo-board-rebuild/PLAN.md) | ✅ done (all phases walked 2026-07-01; closed on Carl's nod 2026-07-05) — archived to done/ |

When one becomes live, move it up into "Your move" above and start its phases.

---

## Just-finished plan: Phase 006 — The front door (Auth) ✅

📄 [docs/todo/done/auth-front-door/PLAN.md](docs/todo/done/auth-front-door/PLAN.md)
**Goal:** real register/login with safe passwords, guarded pages, signup that creates the company (data
fenced per-company) — plus a dev-only one-click login that's sealed shut for real customers. **All delivered.**

| # | Phase | Status |
|---|---|---|
| 1 | Accounts tables ready | ✅ committed `2e43a42e` |
| 2 | Register & login with safe passwords | ✅ committed `d1a6b8c6` |
| 3 | Keep people in, guard the doors (+ dev side-door) | ✅ committed `c303f136` |
| 4 | Signup creates the company | ✅ committed |

**Before that:** Postgres Foundation → [docs/todo/done/postgres-foundation/PLAN.md](docs/todo/done/postgres-foundation/PLAN.md) (all 4 phases ✅, committed `b079b88b`).

---

## How to read the boxes
`⬜ not started` · `🔨 in progress` · `✅ done (tested + green-lit)`
A pass isn't ✅ until its QA is walked and green-lit — I never self-certify.

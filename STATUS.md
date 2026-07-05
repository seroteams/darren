# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.
Not sure which file is which? [docs/TRACKERS.md](docs/TRACKERS.md) maps where everything lives.

---

## ▶ Your move

> **⬜ [guest-run](docs/todo/guest-run/PLAN.md) — NEW plan set up 2026-07-05, awaiting your read-through before Phase 1.**
> Your "open way first" idea: a visitor with no account clicks **"Try it — no account needed"** on the login
> screen, runs a full 1:1, and after the briefing is asked *"Want to keep this?"* — register/log in and the
> run becomes theirs. Guest runs stay **ownerless** (not inside your org); you watch them on a new superadmin
> **Guest runs** screen; a **daily cap** (default 10/day) protects the OpenAI budget on top of the per-IP limit.
> 4 phases: ① backend claim + cap · ② guest lane front door · ③ save-at-end + claim wiring (ONE paid walk,
> ~$0.35–0.60, waits for your go) · ④ superadmin Guest runs screen. Board note: the old "anonymous-start —
> close before widening" decision is consciously reversed for invited demos (Phase 1 writes the reversal note).
> **Walk:** read [PLAN.md](docs/todo/guest-run/PLAN.md) + the 4 phase files. Green light → baseline (free) + Phase 1.

> **🔨 [no-inference-ruling](docs/todo/no-inference-ruling/PLAN.md) — MoSCoW review done, Phase 1 BUILT, awaiting your read (2026-07-05).**
> Reviewed [the prompt-improvement spec](docs/sero-prompt-improvement-spec.md) against the real code. Big find:
> the spec's "highest risk" field `disengagementSignal` **doesn't exist** — the live one is `engagement_read`,
> and it *does* carry the state labels the ruling bans. The prompts are already mostly compliant; the real gap
> is the **three unbuilt gates** (INFERRED_STATE_LEAK · THIN_INPUT_SUPPRESSION · EVIDENCE_ANCHOR). 4 phases:
> ① fix the spec + training-ban rule (**built** — spec now points at `engagement_read`, honest about the 8-case
> test set; CLAUDE.md §6 has the "never train on manager notes" rule) · ② the three gates · ③ `engagement_read`
> re-spec (one paid case, ~$0.35, your go) · ④ hardening. Routing nudges parked. Baseline `npm test` **69/70**
> (the one fail is another session's mid-work `scenario-pack.test.ts`, pre-existing). **Walk:** the 3 read-through
> scenarios in [phase-1.md](docs/todo/no-inference-ruling/phase-1.md). Green light → commit + Phase 2.

> **🔨 [frontend-admin-split](docs/todo/frontend-admin-split/PLAN.md) — RESTARTED on the Darren check (2026-07-05): Phase 2 BUILT, awaiting your walk.**
> The customer app is now **real**: `npm run dev:customer` → **http://localhost:3002** — login/register,
> the manager rail (Home · New 1:1 · Team · Past 1:1s), the whole prep flow, member screens — and **no
> internal tools anywhere** (`/universe`, `/tasks`, `/admin/*` don't exist there; bundle grep shows zero
> internal-tool code). Admin app on :3000 untouched. Free checks: customer build ✓ · `npm test` 69/69 ·
> typecheck ✓ · admin build ✓. **Walk:** the 4 scenarios in the PLAN's "Current state". Green light →
> commit + Phase 3 (slim the admin app), then Phase 4 (serve + fence = the deferred security bundle-proof).
> Phases 3–4 wait for your go — one at a time.

> **📄 [GTM validation one-pager](docs/gtm-validation-plan.md) — DRAFTED (2026-07-05), needs your names.**
> The corridor-test plan Darren asked for: who the first 2–3 friendly managers are (criteria + a blank
> table for your names), how to run the corridor test (watch, don't demo; leave them alone a week), what
> to watch for, and the pass bar — a **second unprompted prep within ~2 weeks**. Review it, fill in the
> three names, done — that item goes from F to real.

> **🔨 [manager-ready](docs/todo/manager-ready/PLAN.md) — Phase 1 ✅ green-lit + committed · Phase 2 BUILT, awaiting walk (2026-07-05).**
> **P1 ✅ ("looks good continue"):** managers get their own rail — **Home · New 1:1 · Team · Past 1:1s** — and
> bounce off internal tools; admin + member rails untouched; 69/69 tests.
> **P2 BUILT — the design polish, awaiting your walk (not committed):** headings now render in **Bricolage
> Grotesque** (the Figma personality, finally in the app), **buttons sharpened to 4px**, **one date format
> everywhere** ("Mon 18 Nov 2024", shared `formatDate`, locale-proof), two 12px text remnants fixed. Live-verified:
> h1 font, 4px radius, date sample; 69/69 · typechecks clean. **Walk:** open any page — do the headings feel like
> your Figma? Check button corners + Library dates. Scenarios: [phase-2.md](docs/todo/manager-ready/phase-2.md).
> ⚠️ Commit note: `design.css` also holds the mobile track's uncommitted CSS — on your green light their phases
> should commit first (or one commit declares both). ⚠️ Pre-existing at HEAD: `vite build` fails on
> `@sero/run-debrief` (another session's mid-work commit — not this track).

> **✅ [live-data-cleanup](docs/todo/done/live-data-cleanup/PLAN.md) — CLOSED 2026-07-05, all 4 phases same-day (Carl: "go for it, happy to complete").**
> The "is everything really connected?" audit: **all 38 screens are live-wired** — the real find was the
> half-finished v1 API migration. Fixed end-to-end: every frontend call (incl. 10 SSE stream URLs the audit
> initially missed) now hits `/api/v1/`; all ~54 dead legacy `/api/*` routes deleted from the server; the
> unconsumed `pipeline/manifest` chain removed; **member-nav** archived to done/ (superseded by pre-go-live).
> Report: [docs/audits/live-data-audit-2026-07-05.md](docs/audits/live-data-audit-2026-07-05.md). Live-proven
> on a scratch API (legacy → 404, v1 answers); `npm test` 69/69 · admin build ✓. No paid runs.
> ⚠️ **Restart your dev API server** — an old process still serves the deleted routes until restarted.
> Spot-check scenarios stay in the phase files if you ever want the click-through (arcs, job lexicons,
> test-engine strip, start page, new 1:1).

> **✅ [mobile-responsive](docs/todo/done/mobile-responsive/PLAN.md) — the whole app on a phone: CLOSED 2026-07-05 (all 5 phases green-lit same day, "commit, its good").**
> All 38 screens now work at phone width, desktop untouched: below 768px the rail is a slide-in drawer
> behind a ☰ header with a compact in-session stage bar; auth/member/pipeline screens fit and type without
> iOS zoom; User management/Error log tables scroll with the first column pinned; Compare stacks; Universe
> takes touch drags. A real /guide 27px overflow was found + fixed on the way. ~600 additive CSS lines +
> small JS in app-nav/session-topbar/universe; no engine changes; no paid runs; final checks `npm test`
> 69/69 · typecheck · build. Leftovers parked in the archived PLAN (member bottom tabs, Universe pinch,
> UM card view). Cleanup for you whenever: delete throwaway `mobile-qa@test.local`.
> **design.css is quiet now — manager-ready Phase 2 is unblocked.**

> **🔨 [page-heartbeat](docs/todo/page-heartbeat/PLAN.md) — real UPDATE buttons (started 2026-07-05).**
> From the 25-page audit: Guide, Universe and the Tasks board were hand-typed snapshots of the app;
> everything else already refreshes itself. 3 phases: ① heartbeat endpoint + Guide · ② Universe ring ·
> ③ Tasks board reality check (warns, never rewrites your statuses).
> **Phase 1 ✅ — walked + green-lit by Carl 2026-07-05 ("ALL GOOD"), code committed `4e4ea787`.**
> `GET /api/v1/heartbeat` re-reads the repo per request; /guide's Screens + Commands render from it and
> "Check for changes" reports adds/removals in plain words (proven with a dummy file, both directions).
> `npm test` 65/65 · both typechecks clean. **Next: Phase 2 — Universe's pipeline ring goes honest** (⬜,
> waiting for Carl's go).

> **✅ [design-system](docs/todo/done/design-system/PLAN.md) — Sero × Flowbite: CLOSED 2026-07-05 (both phases green-lit same day).**
> The Sero look = **Flowbite 2.5.2 + Carl's colours**, now law: component sheet at
> `admin/public/sero-flowbite/index.html` (nav: Admin → Design system) with the 10-rule "before you build"
> checklist, toasts/alerts, the one table style, both input variants + all core components — and a root
> **`DESIGN.md`** that **auto-loads for every agent, every session** (verified `hasDesign: true`). New/touched
> screens follow it; no bulk re-skin. Parked follow-ups (in the archived PLAN): inline-hex cleanup in 8 files,
> dropdown/progress/error consolidation, ⭐ states batch (empty/loading/tabs/toggles) on the sheet.

> **✅ [error-log](docs/todo/done/error-log/PLAN.md) — CLOSED 2026-07-05 (all 5 phases, green-lit "yes can close").**
> The superadmin **Error log** is live: backend 500s + browser crashes/failed loads land in one Neon table, on a
> screen with **Local/Live + API/Browser** filters, click-through **detail** (stack), **mark-resolved**, and
> `npm run errors:purge`; white card + row hover, top-aligned so filter switches don't jump. Carl walked it +
> green-lit; demo rows cleared. Commits `4a3f03fb` `a15af8b1` `52145f05` `96ee8cf9` `30ad405b` `5313fbdd` `a6f67a2b`.
> Folder moved to `done/`. Also added: per-session **git worktrees** (`scripts/new-worktree.ps1` + `docs/PARALLEL-SESSIONS.md`)
> after concurrent sessions co-mingled a commit + wiped this screen's CSS once.
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
> **✅ [test-engine-hub](docs/todo/done/test-engine-hub/PLAN.md) — CLOSED 2026-07-05 (all 4 phases green-lit; Carl ran it: "yeah its good it runs :)").**
> Merged Personas / Regression / Compare into one **"Test engine"** page: ▶ Run per card (cost stated up front) →
> full engine runs on the persona's scripted answers → 2s live progress → "Review it" into the 8-dimension grid →
> last-run verdict badge. Plus a **free safety-check strip** (no AI) and **"Compare with previous run"** deep-linking
> two runs into Compare. Nav slimmed to one entry (Regression + Compare rows gone, regression.js deleted). Carl
> ran a real persona end-to-end. One paid run (~$0.35). `npm test` 67/67 · typecheck clean · admin build ✓.
> Folder archived to done/.
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
open member-nav work. **Update 2026-07-05: that open work shipped via pre-go-live PG1–5, so the folder is
closed** → [docs/todo/done/member-nav/](docs/todo/done/member-nav/PLAN.md) (live-data-cleanup Phase 4).

- Last updated: 2026-07-05 (guest-run plan set up, awaiting Carl's read · no-inference-ruling Phase 1 built · frontend-admin-split Phase 2 built · GTM one-pager drafted)

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
| [test-engine-hub](docs/todo/done/test-engine-hub/PLAN.md) | ✅ **CLOSED 2026-07-05 → done/** — all 4 phases green-lit; Carl ran a persona through the hub ("it runs"). Merged Personas/Regression/Compare into one "Test engine" page. One paid run (~$0.35). |
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

# Audit fix-up (full-app audit, 25 Jul 2026)

**Goal:** every finding Carl green-lit from the full-app Playwright audit is fixed, so a manager can refresh a 1:1 without losing it, the shell stops looking broken on long pages, the words obey the em-dash rule, and a manager can no longer demote an admin.
**Driver:** Carl
**Created:** 2026-07-25
**Mockup:** https://claude.ai/code/artifact/1ce6ba66-56f8-4459-992b-96916db80ea3 — awaiting Carl's sign-off

Source of the findings: `audits/full-app-audit-2026-07-25/report.html` (256 page loads, 4 roles, 963 buttons clicked). Phone version: https://claude.ai/code/artifact/28b1ae68-48c1-402e-ac60-bd123d072b53

**Deliberately NOT in this plan:** the primary-button contrast (F2). Carl ruled it out on 2026-07-25: "dont worry about the contrast ratio of buttons please." The action blue stays `#5aa9e6`.

## Done means
- Open a past 1:1, hit refresh, and it is still there. Back works. The URL can be pasted into a new tab.
- Scroll to the bottom of Library and the navy nav is still there.
- The Design system page shows its brand marks.
- Signed in as a manager, an admin row on the My Team screen offers no way to change their role.
- `npm run lint:copy` reads the engine and content too, and a freshly generated briefing carries no em dashes.
- The Meeting arcs screen has no em dashes.
- Tapping Add request with an empty box says something.
- Team and Members are one screen, called "My Team".
- The 11 tester notes in the Feedback inbox are read and triaged.

## Resolved before we start
- **Where the refresh bug lives:** `frontend/src/router.js` parses `/runs/:id` correctly (returns `RUN_DETAIL` + `myRunId`). The gap is in boot: `MEMBER_ONLY` is the only set that mentions `RUN_DETAIL`, and it deliberately excludes it (design audit A6). A manager therefore has no branch that honours the deep link, so boot falls through to the runs list. Fix is in boot, not the router.
- **Which blue to use for the nav fix:** `--app-nav-bg` is `--sero-primary-800` (`#1b5d91`). No new colour needed for Phase 2.
- **Why the brand marks 404:** they are requested at `/sero-flowbite/brand/*.svg` but the admin app is served under `/admin/`, so the files at `admin/public/sero-flowbite/brand/` sit at `/admin/sero-flowbite/…`. `google-g.svg` already does this correctly with `import.meta.env.BASE_URL`.
- **Why lint:copy passes while briefings break the rule:** `scripts/lint-copy.js` has `SCAN_DIRS = ["admin/src", "frontend/src"]`. The em dashes live in `backend/engine` (144 quoted strings outside tests) and in model output at runtime. `backend/engine/answer-suggester.ts:56` instructs the model to use one.
- **Where the role wall is missing:** `backend/api/services/members/members.service.ts` `setRole` guards only the last-active-lead case. `deactivate` additionally guards superadmin emails. Neither compares the actor's rank to the target's.
- **The build stamp ships to live:** `admin/src/ui/build-stamp.js` is mounted unconditionally from `boot-shell.js` and its own comment calls it "always-on". `position:fixed; z-index:9999; pointer-events:auto`, 243×27px.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Quick wins | Brand marks show, the build stamp stops blocking clicks, search boxes get a name, auth screens use the brand face, one date format per column | ✅ |
| 2 | Shell and layout | Nav reaches the bottom of long pages, header buttons clear the account chip, the 1:1 wizard centres and drops the sidebar | ✅ closed unwalked |
| 3 | The refresh dead end | `/runs/:id` opens on refresh, on Back, and from a pasted URL | 🔨 Built 2026-07-28, awaiting Carl |
| 4 | Permissions and silent controls | A manager cannot change an admin's role, Add request answers back, tap targets reach 44px | 🔨 Built 2026-07-29, awaiting Carl |
| 5 | Em dashes, all three layers | Prompt line gone, lint widened, generated prose guarded | ⬜ |
| 6 | Error log readability | Message head in the table, full statement in the row detail, paged at 50 | ⬜ |
| 7 | Member view, motion, small sweep | Member home says what it is, three motion wins, the 11 smaller things | ⬜ |
| 8 | Team and Members become one screen | One "My Team" screen with an access column; the second nav item goes | ⬜ |
| 9 | Triage the tester notes | The 11 Feedback-inbox notes read, the real ones turned into work, the rest closed | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 4 🔨 BUILT 2026-07-29**, awaiting Carl. The rank hole is closed: `requireAdmin` lets
managers through, so a plain manager could demote **or switch off** the admin account running
the workspace. One shared `canActOn` guard now covers both endpoints (fixing only `setRole`
would have left the same escalation reachable through `deactivate`), and the Members table
hides the ⋯ on an admin row for a non-admin. Also: the member's "Add request" button no longer
fails silently, and the small tap targets get 44px hit areas without changing their look.
Proved against the real HTTP API (409 on both routes, 200 on a peer control) and on screen.
202/202, ten new tests. **Not walked, no screenshot** — see [phase-4.md](phase-4.md).

**Phase 3 🔨 BUILT 2026-07-28** (commit `69edbb24`), awaiting Carl. `/runs/:id` now survives a
refresh, a Back and a pasted link in both apps. Two causes, not one: boot never carried
`myRunId` on the admin/owner path (the member path always did, which is why it looked
intermittent), and popstate never bumped `stageTick`, so Back from one run to *another* left
the shell's render gate seeing no change and the previous run still on screen. 202/202, eight
new tests, typecheck and three linters clean. **Not walked, no screenshot** — see
[phase-3.md](phase-3.md).

**Phase 1 ✅ green-lit 2026-07-25** (commit 72a7c64b). Carl walked all five quick wins on the local build: brand marks back, a row under the build badge clickable, the badge still copying its SHA, "never active" replacing "last active no runs yet", and one date format down Past 1:1s. Proof table: [phase-1.md](phase-1.md); screenshots in `audits/full-app-audit-2026-07-25/p1-proof/`.

**Phase 2 ✅ CLOSED 2026-07-27 — without a Carl walk.** Two changes, as re-scoped: the header actions now clear the signed-in chip (one CSS rule on `.page-header`, because the cause was the missing eyebrow, not the missing lede — the re-scope had that wrong too), and the customer app's 1:1 lane drops the left rail for everyone, not just guests. Before/after by `elementFromPoint`, the four free checks green, one new regression test. No screenshots: the Browser pane doesn't composite frames in this session and another chat holds the Playwright profile. Detail: [phase-2.md](phase-2.md).

⚠️ **How this closed.** Carl instructed on 2026-07-27: *"no more walk throughs please. just go, i have done lots of walk throughs already."* So this phase is signed off **without his QA walk**. What was actually verified, by the building session and re-verified in the 27 Jul clean-up: the change is present in commit `259a25a8`, `frontend/src/ui/app-nav-flow.test.ts` guards it, and the free suite is green (197/197, typecheck clean). What was **not** done: Carl seeing it on screen. Note the plan text above described the fix as a `min-height`; the commit message records that a min-height would have changed nothing and a padding rule was used instead — the prose was stale, the work is real.

Mockup approved 2026-07-25 (Carl picked A; he renamed the merged screen to "My Team" first): https://claude.ai/code/artifact/1ce6ba66-56f8-4459-992b-96916db80ea3
Board: https://claude.ai/code/artifact/b01de778-a0b8-4cf7-b65d-48fdbd1f71f1 (`board.html`, regenerate with `node scripts/plan-board.js audit-fixes-jul-25`).

**Baseline, taken 2026-07-25 before any edit:** `npm test` 186/186, `npm run typecheck` clean, `lint:copy` PASS, `lint:tokens` PASS. Nothing was already red, so anything that breaks from here is ours. Same four checks all still green after the phase.

## 📍 HANDOVER — written 2026-07-25 for the next session

Read this first. Carl approved **option A** and then asked for a fresh chat, so the next session builds Phase 2. Nothing is half-finished: every commit is clean and no app code is uncommitted.

**Do this, in order**

1. Claim a lane in [LANES.md](../../../LANES.md) for `admin/src/ui/page-header.ts`, `admin/src/ui/page-header.test.ts` and the flow-stage CSS. ⚠️ Do NOT touch `admin/src/ui/app-nav.js`, `router.js`, `stages/start.js`, `stages/test.js` or `stages/guide.js` — lane `49a426fe` holds those and had them modified while this plan was running.
2. Read [phase-2.md](phase-2.md) in full. It has been re-scoped: **two changes, not three**, and it explains why.
3. Build only those two:
   - **F4** — a `min-height` on `.page-header` so the actions row centres clear of the profile badge's y 12→52 band even when a screen has no lede. Proven cause: no lede → 48px header → actions centre at y 48 → under the fixed badge. `document.elementFromPoint` at the button's top-left currently returns `DIV.profile-badge profile-badge--menu` on Past 1:1s.
   - **F13 (design call, not a bug)** — the flow stages drop the left rail so a 1:1 gets the whole width, the way the guest lane already does. Guest column: 432→1008 of 1440. Manager today: 556→1132, which is correctly centred beside the rail, so the win is the rail going away, not re-centring.
4. Verify by paint, not by geometry, and not from a full-page screenshot (see the warning below). Then hand Carl the scenarios at the bottom of phase-2.md and wait.

**The lesson that cost this plan a finding.** F3 ("the sidebar stops halfway down long pages") was retracted before building. `.app-nav` is `position: fixed`, so in a `fullPage: true` screenshot it paints once at the top and *looks* like it stops after one screen. A follow-up check then measured the shell wrapper instead of the rail and read its 900px height as proof. **For anything layout-related: capture the viewport after scrolling, and confirm with `document.elementFromPoint`.** F13's arithmetic was wrong for a related reason: 248px rail + (1192 − 576)/2 = 556, so the column was centred all along.

**The environment this was verified in** (all free, no OpenAI calls):
- `.claude/launch.json` has `audit-api` (:3261), `audit-web` (admin, :3263), `audit-customer` (:3265) and `audit-report` (static server for the audit folder, :4193).
- Three accounts in the Sero (dev) org, password `SeroAudit2026!`: `audit.admin@seroteams.com` (admin + on the superadmin allowlist via the launch config), `audit.manager@seroteams.com` (5 cloned 1:1s, 5-person team), `audit.member@seroteams.com` (linked to the roster person Nina Petrova).
- ⚠️ The audit accounts and their seeded people/runs are still in the dev database. They show up in Members and User management. Harmless, and useful for re-checking findings, but they are not real data.

**The audit itself:** `audits/full-app-audit-2026-07-25/`. The JSON, `report.html` and `artifact.html` are committed; the 462 screenshots are git-ignored (174MB) and exist locally only. Phone version of the report: https://claude.ai/code/artifact/28b1ae68-48c1-402e-ac60-bd123d072b53

**Tracker note:** STATUS.md was NOT updated at this phase close. It is claimed by another live chat (lane `0e03aa19`, design-consolidation P7), so editing it would sweep their work. Carl decides when that lane clears; the tick belongs to Phase 1 whenever it happens.

## Parked
- **Primary-button contrast (F2).** Ruled out by Carl 2026-07-25. `--sero-primary-800` would give 6.97:1 if he ever changes his mind.
- **A right rail on the list pages** (next 1:1 due, unfinished prep, recently added). Carl chose the cheaper half of F13: centre the flow screens only. The empty right third of the list pages stays empty for now.
- **A real member history screen.** Carl chose the copy reframe for F10, not the build. Still needs a ruling on what a member may see before it could happen.
- **Google sign-in's hardcoded `localhost:3001` in dev.** Deliberate (cookies ignore ports) but it breaks any dev instance not on 3001. Noted, not scheduled.
- **The dev credential prefill on the Log in screen.** Worth confirming it cannot reach live, but not part of this plan.

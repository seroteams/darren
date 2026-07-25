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
| 1 | Quick wins | Brand marks show, the build stamp stops blocking clicks, search boxes get a name, auth screens use the brand face, one date format per column | ⬜ |
| 2 | Shell and layout | Nav reaches the bottom of long pages, header buttons clear the account chip, the 1:1 wizard centres and drops the sidebar | ⬜ |
| 3 | The refresh dead end | `/runs/:id` opens on refresh, on Back, and from a pasted URL | ⬜ |
| 4 | Permissions and silent controls | A manager cannot change an admin's role, Add request answers back, tap targets reach 44px | ⬜ |
| 5 | Em dashes, all three layers | Prompt line gone, lint widened, generated prose guarded | ⬜ |
| 6 | Error log readability | Message head in the table, full statement in the row detail, paged at 50 | ⬜ |
| 7 | Member view, motion, small sweep | Member home says what it is, three motion wins, the 11 smaller things | ⬜ |
| 8 | Team and Members become one screen | One "My Team" screen with an access column; the second nav item goes | ⬜ |
| 9 | Triage the tester notes | The 11 Feedback-inbox notes read, the real ones turned into work, the rest closed | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Folder set up 2026-07-25, nine phases, nothing built. The mockup for the four visible phases (1, 2, 7, 8) is with Carl: https://claude.ai/code/artifact/1ce6ba66-56f8-4459-992b-96916db80ea3

Board: https://claude.ai/code/artifact/b01de778-a0b8-4cf7-b65d-48fdbd1f71f1 (`board.html`, regenerate with `node scripts/plan-board.js audit-fixes-jul-25`).

Waiting on: Carl reading the phases or the board and confirming, plus a nod on the mockup. Then Phase 1.

Baseline not yet taken. Phase 1 starts with `npm test` + `npm run typecheck` (free) so anything already red is on the record before we touch it.

## Parked
- **Primary-button contrast (F2).** Ruled out by Carl 2026-07-25. `--sero-primary-800` would give 6.97:1 if he ever changes his mind.
- **A right rail on the list pages** (next 1:1 due, unfinished prep, recently added). Carl chose the cheaper half of F13: centre the flow screens only. The empty right third of the list pages stays empty for now.
- **A real member history screen.** Carl chose the copy reframe for F10, not the build. Still needs a ruling on what a member may see before it could happen.
- **Google sign-in's hardcoded `localhost:3001` in dev.** Deliberate (cookies ignore ports) but it breaks any dev instance not on 3001. Noted, not scheduled.
- **The dev credential prefill on the Log in screen.** Worth confirming it cannot reach live, but not part of this plan.

# UX audit fixes — manager + member

**Goal:** Every defect from the 2026-07-15 UX audit is fixed: one obvious way to start the next 1:1 from anywhere, members only ever see member things, the app speaks one language, history compounds, and returns are measurable.
**Driver:** Carl
**Created:** 2026-07-15
**Source:** the audit report (artifact `sero-ux-audit-report`, published 15 Jul 2026) — 22 findings (M1-M15, B1-B7), 10 copy rewrites (C1-C10), 8 panel extras (X1-X8), 4 parked ideas (O1-O4).

## Done means
- On the person page and Past 1:1s, the "prep next 1:1" action is visible without scrolling.
- A stale session can never dead-end a returning manager.
- A member logging in and a member reloading land on the same screen, and can never enter the manager prep flow.
- No manager can see engine hashes or Pass/Fail QA machinery.
- One noun ("1:1") everywhere; the cancel dialog makes sense; the member About page speaks to members.
- A person named in intake shows up on Team.
- A free local script prints who ran 1:1s and when, so the Gate-1 "returned unprompted" question is answerable.

## Scope decisions (Carl's interview, 2026-07-15)
- All defects in scope; **feature-shaped ideas parked** until Gate 1 (O1 member input, O2 pocket card, O3 shared agreed-cards, O4 customer trust panel, X2 verifiable privacy, X3 briefing ceremony, B7's "give the member something to do").
- Phases cut **by fix-bundle in impact order** (the panel's consensus order), not by persona or severity.
- Instrumentation **in** (X4+X6, server-side events only, no nudges — measuring, not nudging, so it doesn't contaminate the validation metric).
- M4 QA page: **hide behind internal flag now**; customer-facing replacement (O4) parked.
- M12 settings sheet, X1 star reframe: **in**, craft batch.
- X5 finish→person-page return hook: **in**, Phase 1.
- X8 system teeth: **light version** — extract one shared run-list component (Phase 1) + add a "DESIGN.md 11-rule check" line to the phase-close ritual.

## Resolved before we start (dependency sweep, 2026-07-15)
Verified against the real code so phases don't stall on unknowns:

- **Shared stages bind the ADMIN router, always.** Cross-imports are relative paths (frontend/vite.config.js:9 — no aliases), so `login.js`'s `import "../router.js"` resolves to admin's router even inside the customer build. That's the actual mechanism behind B1. ⇒ Phase 2's landing helper must be **injected per-app** (each `main.js` passes it via ctx/store), never imported inside a shared stage.
- **M10 may be partly built already.** `intake.js:100-101,394` (this branch) now carries `personId` and comments say free-typed names create a roster person — but no matching server code was found (`grep matches-or-creates backend/` = 0 hits), and the audited runtime still showed orphaned run-people. ⇒ Phase 4 **starts with a live test** of current behaviour; scope shrinks to backfill/orphan-matching if the create path already works.
- **No change-password endpoint exists** (`grep backend/api/services/auth` — register/login/reset only). ⇒ M12 needs a new route→service→repo chain + tests (backend-conventions, TDD), not just a UI sheet. Phase 5 estimate raised accordingly.
- **`runs/mine` supports `includeOpen`** (runs.repo.ts:83) and `mineDetail` reads any owned run. ⇒ M4's "Review opens run detail" redirect is feasible for in-progress runs; verify the flag at build.
- **X5 depends on `personId` being present** — old runs and free-text intakes may have none. ⇒ Finish lands on the person page **when the run has a roster person, else Home** (fallback written into Phase 1).
- **Migrations auto-run on boot** (server.ts:140 `runMigrations()`; latest is 0017). ⇒ Phase 4's events table ships as migration 0018 and applies itself on the next live deploy — no manual live-DB step.
- **Dev-autologin ids are non-uuid and fail PG inserts** (known pitfall). ⇒ Phase 4's event writes must skip/tolerate dev-lane ids; verify saves via the API or a real account, never a bare DB query on the dev lane.
- **No app tests assert the copy strings being rewritten** (grep for the audit strings in `*.test.*` = 0 hits) — Phase 3's blast radius is smaller than feared; `team-card` label tests are the one place to watch.
- **Cookies span ports in dev** (the member session bled from :3000 to :3002 during the audit). Dev-only quirk — not a finding, do not "fix".

### Dev vs live
- **Where it builds:** this checkout's dev server (3000/3001/3002) is what Carl walks; live is Render (`sero-obwq.onrender.com`, customer app + /admin) pinned by commitId. Branch decision recorded below in Current state.
- **Release cadence:** phases commit locally on green light (safe-commit pathspec rule); nothing pushes until Carl says `/release`. Live deploys are verified by the live build badge / `/api/version`, not Render's status.
- **In-flight collisions:** `admin-live-deploy` (P2: serve /admin live) and `monthly-checkin` (this branch) touch adjacent files (router.js, intake meeting-type cards, session chrome). Overlap files get checked against both tracks before each phase starts; Phase 3's stage renames avoid the guided runner's internal-only labels.
- **Live users:** seeded accounts exist only in dev — all test scenarios run locally. Phase 4's metrics only start counting on live after the eventual release.

## The checklist — where every item landed
| Item | What | Lands in |
|---|---|---|
| M1 prep button below history | fix order | Phase 1 |
| M2 three start patterns / load-bearing empty state (X9) | one rule | Phase 1 |
| M3 resume dead-end | self-heal | Phase 1 |
| X5 finish lands on person page | return hook | Phase 1 |
| X7 native alert() on resume fail | styled state | Phase 1 |
| X8 run-list extracted as shared component | system tooth | Phase 1 |
| B1 split-brain member home | one home | Phase 2 |
| B2 member enters manager intake | role gate | Phase 2 |
| B6 dead member run-detail route | remove | Phase 2 |
| M9 person page dies on refresh (+X7 bounce flash) | hydrate from URL | Phase 2 |
| M4 QA verdict page visible to managers | internal-only | Phase 2 |
| M13 terminology zoo | one noun | Phase 3 |
| M7 / C3 cancel-vs-reset dialog | "Discard this prep?" | Phase 3 |
| B5 / C4 "prepped about you" | rewrite | Phase 3 |
| B3 member About page in manager voice | member-voiced rewrite | Phase 3 |
| B4 three names for member list | one name | Phase 3 |
| C1 "What missed?" · C2 "Skip (optional)" · C5 echo subtitle · C6 "THEM" · C7 "a read on" · C8 stage names · C9 "One-page run" · C10 card meta | rewrites | Phase 3 |
| M14 copy nits umbrella | covered by C1-C10 | Phase 3 |
| M10 intake people don't join Team | auto-join | Phase 4 |
| X4 returns not measurable · X6 time-per-prep unknown | server events + report script | Phase 4 |
| M5 top-bar overflow + double counters | one progress system | Phase 5 |
| M6 two blue primaries on expanded row | accent budget | Phase 5 |
| M8 dead-clickable person cards | whole card opens | Phase 5 |
| M11 invite link via window.prompt | copy-row in sheet | Phase 5 |
| M12 no manager settings | minimal account sheet | Phase 5 |
| M15 mobile row wrap | truncation rule | Phase 5 |
| X1 stars read as rating the person | "prep rating" reframe | Phase 5 |
| O1 O2 O3 O4 · X2 · X3 · B7 feature half | — | **Parked** (below) |

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The return path | Start-next-1:1 above every list, resume self-heals, finish lands on the person, shared run-list component | ✅ |
| 2 | Right doors, right roles | One member home, member gates on manager flows, QA page internal-only, person deep-links survive | ✅ |
| 3 | One language | The noun sweep, the dialog fix, member-voiced copy, all ten rewrites | ✅ |
| 4 | History compounds & returns count | Intake people join Team; a free returns report script (derived from existing tables) | ✅ |
| 5 | Craft batch | Top-bar, accent budget, clickable cards, invite sheet, account sheet + change password, star reframe, mobile wrap | ✅ 7/7 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Baseline
UI-only fixes — baseline is the free checks: `npm test` + `npm run typecheck` before Phase 1 starts (record results here). No engine/prompt changes anywhere in this folder, so no paid gate run is needed.
**Baseline recorded 2026-07-15 (before Phase 1):** typecheck clean; test suite green (the 4 intermittent env-dependent suites — customer-serving / persona-bench — pass when a dev server is up). After Phase 1: all tests green incl. 2 new suites, typecheck clean, both apps build.

## Current state
**Board:** https://claude.ai/code/artifact/b5f23732-4629-4350-86ae-b3ea662541a8 — the visual "Where we are" board (generated by `node scripts/plan-board.js ux-audit-fixes`; republish to this same URL at each phase-close).
Folder created 2026-07-15 from the audit + Carl's two interview rounds (all recommendations accepted). Dependency sweep done same day — see "Resolved before we start"; phase files amended with the wiring constraints it found.
**Landed on `main`** (the branch model was retired mid-track — trunk-only, silent path-scoped commits). **Phase 1 committed `6346f891`; Phase 2 `4a9e4cec` (+earlier).**
**Phase 1 ✅ GREEN-LIT 2026-07-17** — Carl walked it live and gave the go. Six return-path fixes: prep button above history, persistent Start on Past 1:1s, resume self-heals (no native alert), finish → person page, prep skips re-identifying a known person. X8 full component-extraction parked (placement-rule-only deviation accepted).
**Phase 2 ✅ GREEN-LIT 2026-07-17** — Carl walked it and gave the go. Right doors, right roles: B1 one member home per app (a shared `landingStage` resolver; login + reload agree), M9 person deep-links survive a refresh (fixed in BOTH boots), M4 QA verdict page internal-only (manager's Review → clean run detail), B2 render-time member guard on the prep flow. B6 confirmed already-resolved by past-1on1-view — not removed. Offline proof: suite 148/148 (+landing 3/3), typecheck clean, both apps build; no paid runs.
**Phase 3 ✅ SELF-SIGNED 2026-07-17 (Carl delegated sign-off, "go to the end")** — One language: M13 noun sweep (one "1:1"; stage names now "During the meeting"/"Pulling it together"), M7/C3 discard dialog, B3/B4/B5/C4 member voice + "Your 1:1s", C1/C2/C6/C7/C9/C10 rewrites, new VOICE.md. Deviation: "Recent sessions" → "Recent 1:1s" (not the plan's "In progress", which would mislabel finished runs). Suite 148/148, typecheck clean, both build. Some strings screen-verified (topbar), most build-proven.
**Phase 4 ✅ SELF-SIGNED 2026-07-17** — Returns measurable: M10 verified already-built (resolveForRun match-or-creates a roster person), X4/X6 free `report-returns.ts` over a unit-tested pure aggregator. Deviation: derived from existing tables (auth_sessions + sessions) instead of a new events table/migration. **Verified against the real local DB** (correct numbers). Suite 149/149.
**Phase 5 ✅ COMPLETE 2026-07-17 (7 of 7)** — M5 one progress system (setup counter no longer lies: "Step 1 of 2" for a known person; top-bar short labels <1180px + owns its overflow) · M6 accent budget (Resume the only blue; Delete → ⋯) · M8 clickable cards · M11 invite sheet (no window.prompt) · M12 account sheet + change-password (verified end-to-end over HTTP) · X1 "prep rating" · M15 phone rows. **M5/M6/M8 verified live; M12 verified over HTTP.** Suite 154/154, typecheck clean, both build.
**Also, post-audit (Carl's live walk):** the 2-hour prep TTL bug fixed (preps now live 7 days) + the person-page "Start 1:1 with X" CTA enlarged.
**All 5 phases built. Remaining: Carl's own walk of P3/P4/P5 + the editable name/company follow-up (thin).**

**2026-07-21 — CLOSE-OUT PASS (Carl re-handed the audit PDF).** Re-verified all 22 findings against current code via 3 parallel explorer passes: 20/22 confirmed fixed in source (with `(audit M#)` comments); 2 small residuals + tails handled. Live spot-walk (customer app :3002, dev-login Manager + Member): manager Home renders "Prep a 1:1"/"Recent 1:1s" (P3), member Home renders "Your 1:1s" + interactive Requests & goals (P3/B7), member About is member-voiced with no forbidden CTA (B3), `report-returns.ts` prints the Gate-1 signal "4 of 9 managers returned on 2+ days" (P4/X4/X6). Screenshots not captured — the Browser pane can't pixel-capture this SPA (`document.hidden` render issue); verified via live DOM + suite instead.
- **B4 (member Home h1)** ✅ fixed — `<h1>Welcome to Sero</h1>` → "Your 1:1s" (nav/heading/eyebrow now one name); redundant eyebrow dropped. Rendered live.
- **M2 (start-button labels)** ✅ fixed — aligned `runs.ts` (Past 1:1s) + admin nav to the established house string "Start 1:1" (`team.test.ts`, Carl 2026-07-17). Home CTA kept "Start a new 1:1" (the "new" contrasts with Resume — intentional).
- **B6 (member run-detail branch)** — PARKED, deliberately not changed: it degrades gracefully (a member hitting `/runs/:id` gets a styled "No 1:1 selected" / "Couldn't open this 1:1" notice, never a crash), nothing in the member UI links to it, and Phase 2 kept the route because past-1on1-view uses it. Removing risks regressing the member view for ~zero gain.
- **M12 edit-your-name** ✅ BUILT (Carl chose to finish it before closing): new `POST /api/v1/auth/update-profile` (session-scoped — id from the cookie, never the body), auth service `updateProfile` + repo `updateName`, `shared/api.js` client, and an editable "Your name" field in the account sheet that live-updates the store. TDD: 3 new service tests (trim, empty-name reject, unknown-user). Verified over HTTP against the real DB (login → rename → `/me` persists → empty-name 400 → seed restored) and the account-sheet name field confirmed rendering live.
- **M12 company edit** ✅ BUILT (Carl chose to finish it too): manager/admin-only `GET`/`POST /api/v1/auth/{company,update-company}` (org id from the session, never the body; `requireAdmin` gate — a member is 403'd), auth service `getCompany`/`updateCompany` + repo `orgName`/`updateOrgName`, `shared/api.js` client, and a manager-only "Company" section in the account sheet (fetched on open, since the org name isn't in the login identity; hidden entirely for members). TDD: 3 new service tests (trim, empty-name reject, unknown-org). Verified over HTTP against the real DB (manager reads + renames own org → persists; **member 403 on both read and write**; original restored) and the section confirmed rendering for a manager + absent for a member.
- Offline proof: `npm test` 167/167 (auth file now 32 cases), `npm run typecheck` clean; both apps build. Awaiting Carl's confirm to mark the folder fully closed.

## Parked
- O1 "Bring one thing" — member's single optional prompt feeding the prep brief (IDEO). Revisit after Gate 1.
- O2 The minute-before pocket card (IDEO). After Gate 1.
- O3 Shared "what we agreed" cards — member timeline entries become tappable outcomes (IDEO/Kaiser X). After Gate 1.
- O4 "How Sero reached this" customer panel replacing the QA page's raw material (Kaiser X). After Gate 1.
- X2 Make the privacy promise verifiable by the member (needs O-series thinking). After Gate 1.
- X3 Stage the briefing as a ceremony (reveal/signature moment). After Gate 1.
- B7 The member surface stays read-only for now — its copy improves in Phase 3; giving members a voice is O1.
- Full component-extraction pass (Frog's bigger option) — only the run-list is extracted now.

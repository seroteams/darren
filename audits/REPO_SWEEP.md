# REPO SWEEP — Phase 1 Discovery (2026-07-18)

Read-only audit; nothing was changed. HEAD at sweep: `e08093d9` on `main` (3 commits ahead of origin,
no local branches, stash empty). Seven parallel lenses, every finding cited. Continues the clean-up
series — last report [docs/reports/cleanup/2026-07-17.md](../docs/reports/cleanup/2026-07-17.md);
progress diff in §5. Live sessions may move HEAD — re-verify `git status` before any Phase-2 action.

**Headline:** code hygiene stays excellent (zero TODOs — 5th clean sweep; zero junk strays; all npm
scripts and env flags live; 12 of the 07-17 picks now resolved). The real findings are elsewhere:
**trackers that contradict git in five places**, a **stage chain that has quietly drifted in 11 ways
between the live path and the CLI path** (one of them a genuine product-trust gap), **four remote
branches holding unmerged work including an engine fix**, and a confirmed-dead 508-line module.

---

## 1. Docs vs reality — every contradiction (Fact / Assumption / Unknown)

Not silently reconciled; each row is exactly what the doc says vs what disk/git says.

| # | Doc says | Reality | Tag |
|---|---|---|---|
| C1 | SERO_BOARD.md:25 — axis-memory "Not live yet — Carl to /release (~19 mixed commits pending)" | Close commit `c9840820` is an ancestor of origin/main; origin HEAD `f4f690f9` (07-17) self-describes as deployed; only 3 commits unpushed | **Fact** |
| C2 | SERO_BOARD.md:19 + personal-data-security plan.md:30 — P2 hardening "built, NOT committed" | Committed as `2ebd718c` (plus P3 interim `f577ed63`, `04b8684b`, `32307b17`); precedes origin HEAD, so likely deployed | **Fact** |
| C3 | Committed STATUS.md (old 385-line file) | The one-screen rewrite (−356/+29) sits **staged but uncommitted** — disk and history disagree | **Fact** |
| C4 | structure.md:24 — frontend/ is a "placeholder… README only" | frontend/ is the full second Vite app — the deployed customer surface (split closed 07-08) | **Fact** |
| C5 | structure.md:35,65-66 + SERO_BOARD.md:270 — logs/may is the git-tracked regression baseline | `git ls-files logs/` = 0 files; the keep-set was untracked in the personal-data-security purge (`f577ed63`, `04b8684b`). Baseline now exists only on this machine | **Fact** |
| C6 | engine-map.md:20 — "content/prompts/ (7 files)" | 8 prompt .md files + rule-registry.ts + 2 .notes.yaml | **Fact** |
| C7 | engine-map.md:8-15 — pipeline = 5 stages + side input | Two model-call surfaces missing: guided check-in runner (backend/engine/guided/wrapup.ts + guided-wrapup.md) and lexicon review (backend/engine/lexicon-reviewer.ts + review-session-for-lexicon.md) | **Fact** |
| C8 | structure.md top-level table | Omits shared/ (live cross-app SSE/API code), testing/ (tester pack), images/; root list omits STATUS.md, DESIGN.md, VOICE.md, render.yaml, drizzle.config.ts | **Fact** |
| C9 | SERO_BOARD.md:278 "evals/trust-checks.js"; :293 "src/question-validator.js" | Files are evals/trust-checks.ts and backend/engine/question-validator.ts; no src/ exists | **Fact** |
| C10 | SERO_BOARD.md:211-212 vs :267-268 vs :25 — "in sync 07-04" / "ahead of origin" / tests "153/153" and "146/146" on one board | Actually 3 ahead of origin; three dated answers to the same question coexist | **Fact** |
| C11 | STATUS.md:33 — 4 parked plans | docs/plans/future/ holds 9 folders | **Fact** |
| C12 | STATUS/board/plan — wrap-up-exit "building now" | P1 built, committed (`70a2998d`), paid-tested 4/4 (`3aaec419`); it's awaiting Carl's walk + one open call (backend turn≥4 floor) | **Fact** |
| C13 | admin-live-deploy plan.md:23-24 — P2/P3 "built on branch, awaiting walk" | Same file's :52 says the branch merged (`ffc5165d`) and was deleted — table contradicts its own note | **Fact** |
| C14 | SERO_BOARD.md:16 — ui-look-and-feel "P4–P6 ⬜" | plan.md:45,61 — P4's Recap slice is done and green-lit | **Fact** |
| C15 | STATUS.md:6 files Pulse under "New look-and-feel" | Pulse is admin-live-deploy P3; may be deliberate if a polish pass also touched it — can't fully verify which pass produced what Carl sees | **Assumption** |
| C16 | Trunk-only rule (CLAUDE.md §6) — no branches | 5 remote claude/* branches exist; 4 hold unmerged work (see §2.2) — whether any is still wanted is unresolvable from here | **Unknown** |

Verified-consistent (no finding): all engine-map named files/functions exist at stated paths; STATUS.md's
building list matches docs/plans/doing/ 1:1; board's closed-track names all have done/ folders; all
doc-named npm scripts exist. Full clean-lens detail in the sweep transcript.

---

## 2. Repo state

### 2.1 Uncommitted changes
- `STATUS.md` — staged 385-line → 37-line rewrite, uncommitted (another session's edit; see C3). **Report only — not touched.**
- ~213 untracked `content/questions/_runtime/*.yaml` — protected runtime artifacts, never junk (standing rule). The agreed gitignore line (07-12) still hasn't landed; note `.gitignore:65`'s "authored banks (tracked)" comment must be reconciled when it does.

### 2.2 Branches / stashes / worktrees
- Local: `main` only. No stashes, no worktrees. ✅
- Remote: 5 `claude/*` branches on origin.
  - `claude/future-plans-audit-jul15` — **fully merged** into main (merge-base verified). Pure remnant.
  - **4 unmerged, each holding commits main lacks:** `design-deployment-live-wgyuab` (/new setup rework), `live-error-fix-a3e4vx` (**engine fix: max_completion_tokens for OpenAI calls**), `sero-search-system-lyn5vc` (search Phase 2), `site-cleanup-unused-code-pljlzy` (a cleanup pass). Fold-or-discard is a per-branch decision — **do not delete**.

### 2.3 TODO / FIXME / HACK / XXX
**Clean ✅** — zero marker comments across admin/, frontend/, backend/, shared/, scripts/, evals/, testing/ (verified case-sensitive, case-insensitive, and comment-shaped; all "todo" hits are task-board domain vocabulary). 5th consecutive clean sweep.

### 2.4 Orphaned / duplicate / dead files
| What | Where | Evidence | Tracked? |
|---|---|---|---|
| 2.0 MB triplicate of login photos + unreferenced "Sero Logo.png" | `images/` (6 files) | login.js:19-23 loads only public/login/ copies; zero refs to images/ anywhere except a repo-map skip-list | tracked |
| Dead 508-line module: static review-page generator | backend/engine/review-html.ts | zero imports of file or any of its 6 exports repo-wide; its last importer (recorded June) no longer exists | tracked |
| Worktree-creation script for the retired flow | scripts/new-worktree.ps1 | no caller; flow retired by Carl 2026-07-15; still name-dropped by 2 docs pages + safe-commit skill | tracked |
| Skill docs still teaching the retired worktree/branch ceremony | .claude/skills/{safe-commit:33, goodnight:3,14,58,76, checkpoint:13, commit:13} | contradicts CLAUDE.md §6 ("drop their branch/worktree/PR parts") | tracked |
| Manual benchmark cluster, 3rd sweep dormant | scripts/benchmark.js + verdict-template.html + suggest-judge.js | no npm script, no code caller; launch.json's verdict-review serves its old output | tracked |
| Stale logs | logs/may (1.1 MB), logs/index.html, logs/_baseline_dir.txt, logs/_baseline_sweep_current.log | 6–8 weeks old; logs/** now fully gitignored so pure disk clutter | **untracked — delete is permanent** |
| Cursor-era config | .cursor/rules/*.mdc, .cursorignore (tracked); .cursor/debug-be19bb.log (untracked scratch) | workflow moved to Claude Code; second rulebook can drift from CLAUDE.md | mixed |
| Fossil map entry for a removed screen | admin/src/stages/guide.js:98 `"regression.js"` | no such stage file exists in either app; entry is inert | tracked |
| Shipped /test gallery mocks | admin/src/stages/tests/{live-pulse.js, setup-redesign.js} via test.js:7-8 | features shipped `ffc5165d` / `16180040`; promises-loop mock still matches an open track (keep it) | tracked |
| Leftover debug log line | backend/api/handlers/stream-helper.ts:139 | per-event subscriber-count console.log; only real debug candidate in the repo | tracked |
| launch.json accretion | .claude/launch.json:145 (port says 3013, serves 3025), :246-252 (sero-prod-iso → backend/api/server.js, file doesn't exist) | ~15 accreted one-off entries; live sessions may be using some ports right now | tracked |
| True copy-paste forks between the apps (all stage/ui modules are shared by import — these 4 are not) | main.js 491↔381, router.js 219↔123, app-nav.js 354↔219, router.test.ts 66↔45 | diverging line counts; every boot/route/nav bug fixed twice | tracked (refactor proposal, not a deletion) |

**False stray (protective note):** scripts/batch-m4-verify.js looks prunable per scripts/README.md's own "prune when clearly dead" line, but eval.js:20 spawns it every run. **Live — never delete.**

### 2.5 Files in wrong rooms
- `RENDER_SETUP.md` at repo root → belongs in docs/reference/ (3rd sweep flagging).
- `docs/ONE-ON-ONE-RUNNER-CONCEPT.md` at docs/ root → docs/archive/ (its companion png already archived — half-finished move).
- `scripts/verdict-template.html` — an HTML asset living in scripts/ (rides with the benchmark-cluster decision).
- `docs/reports/` — 2 living dashboards mixed flat with ~12 dated one-offs.

---

## 3. Protected — do not touch, and why

**The coupling cluster is one immovable unit:** `content/prompts/rule-registry.ts` (7 registered rows)
ties `content/prompts/{generate-focus-points, generate-questions, final-evaluation}.md` to constants in
`backend/engine/golden-checks.ts` and `evals/trust-checks.ts`, verified offline by
scripts/test-rule-registry.js (runs in npm test). Every anchor re-verified present this sweep. Moving or
rewording **either side** of any pair silently un-enforces a rule or turns npm test red.

- **Registered mirrors (7):** FOCUS_REASON_OPENER, FOCUS_BANNED_REASON_PATTERNS (16-phrase ban list), FOCUS_LABEL_SECOND_PERSON, JARGON_PATTERNS (with a deliberate 'bandwidth' carve-out balanced across three prompt files), QUESTION_ARC_LEAK, MANAGER_BRIEFING_BANS (incident history), INFERRED_STATE_LEAK.
- **Unregistered mirrors — no offline alarm, extra care:** RULE_ECHO_PHRASES (golden-checks.ts:364-370 ↔ final-evaluation.md:195-196), the FOCUS_ARC gate (golden-checks.ts:61-83 ↔ preparation.md:150), CROSS_SESSION_VOCAB, and the wellbeing constants. Drift here is only caught by a **paid** gate run. *(Parked flag, prompt/detector territory: consider registering RULE_ECHO in rule-registry.ts — Carl's call, not a tidy.)*
- **Third leg:** `backend/engine/serve-checks.ts` — its detectors are re-imported by trust-checks.ts so the live briefing screen and the gate run identical code. Moving it breaks both at once.
- **Load-time hazard:** golden-checks.ts reads the focus-points catalogue **at module import** (paths.mts:9) — moving that catalogue is an instant crash for reviewer, preparation, question-generator and 6+ test scripts.
- **Fan-in:** trust-checks.ts has 5 hardcoded importers; golden-checks.ts has 12+, including the deliberate reviewer.ts circular pair.
- **scripts/gate.js EXECUTES on import — confirmed:** top-level `main().catch(...)` at gate.js:269, no `require.main` guard. Requiring it starts a ~$3 paid sweep. Grep only.
- **evals/golden/** — 8 human-ratified cases incl. 2 adversarial sentinels (leak-devon, thin-sam) that must never be re-baselined (evals/README.md:51-53); rule-registry provenBy ids point into _index.json. Nothing in the folder is disposable.

Safe actions in this territory are **doc-path corrections only** (dead `src/golden-checks.js` refs in
contracts.md:35 + features.md:58; stale `trust-checks.js` prose in ~7 docs). The comment-only refs inside
gate.js and test-trust-checks.js are left alone.

---

## 4. Stage-chain parity — session-streams.ts vs engine/cli/stages/*.ts

**What guarantees parity:** both wirings call the same five shared engine cores (generate.ts,
preparation.ts, question-generator.ts, queue-manager.ts, reviewer.ts) — model, temperature, retries,
prompt templates and in-engine guards are in parity **by construction**. The offline guard
(backend/tests/pipeline/test-stage-parity.js vs stage-sequence.ts) asserts the stages are called — but
**not what inputs they get**, and that's where all 11 drifts live. All are behaviour-touching:
**flagged only, nothing goes in Phase 2.**

| # | Drift | Live | CLI | Cites |
|---|---|---|---|---|
| P1 | Focus history | deduped against prior sessions | none — empty FOCUS_HISTORY_BLOCK | session-streams.ts:61-68 vs cli/stages/focus-points.ts:52,66 |
| P2 | Manager's selected focus | steers prep, bank, planner, evaluation | never passed — all four stages fall back to a notes-derived guess | preparation-inputs.ts:14-20, session-streams.ts:137-147,347-355,214-222 vs all four cli/stages files |
| P3 | Intro queue | opener + agenda-check + curated | curated only — first two live questions never exist in CLI runs | sessions.service.ts:466-479 vs cli.ts:256-258 |
| P4 | Agenda subsystem | carry-forward injection, budget bump, agenda into evaluate | absent end-to-end — AGENDA_CARRY_FORWARD prompt slot unreachable from CLI | session-streams.ts:417-432,230-233 vs cli/stages/questioning.ts, evaluation.ts |
| P5 | **Scoring health** ⚠️ | planner failures caught but **not counted; evaluate never told** | failures counted, DEGRADED status passed | session-streams.ts:371-384,215-236 vs questioning.ts:69-70,255-264, evaluation.ts:38; consumer reviewer.ts:533-540 |
| P6 | Per-turn planner notes | dropped from the evaluate transcript — [SHALLOW] tally never fires live | passed | session-streams.ts:220-227 vs evaluation.ts:33; reviewer.ts:248,595 |
| P7 | Manager notes channel | intake + mid-run notes, tester-note stripping | raw intake string only | session-streams.ts:192-196,229 vs cli.ts:238,286 |
| P8 | Seed-overflow mapper | materializeQuestion (spreads fields, allows scripted/clarity) | seedToQuestion (whitelist, coerces to 'topic') — same YAML → different Question | session-streams.ts:457 + intro-queue.ts:29-41 vs questioning.ts:214 + question-generator.ts:470-493 |
| P9 | Stage-order guarantee | bank runs with prep=null if a client opens it early — only client behaviour enforces order | hard-sequenced | session-streams.ts:100-105,138 vs cli.ts:253-266 |
| P10 | Run artifacts | never writes 02-intro-questions/aliases.json (debrief map promises it) | writes it | cli/stages/question-bank.ts:17-20 vs run-debrief.mjs:97-104 |
| P11 | Prep validation surfacing | shown only when IS_DEV | always shown | session-streams.ts:93-95 vs cli/stages/preparation.ts:67-71 |

**P5 is the highest-risk finding of this sweep:** a live run whose per-turn scorer failed repeatedly
still gets a briefing prompted as if axis scores are reliable — the low-confidence guard exists in the
shared engine but is unreachable from the production path. Only CLI runs can trigger it.

Also noted: a **third** orchestration exists (persona-runs.runner.ts, the scripted QA lane) — deliberate
test-lane divergence, not drift, but the "two orchestrators" note in engine-map.md undercounts.

---

## 5. Progress vs the 2026-07-17 sweep

**Resolved since yesterday (12):** board tombstone (B) · STATUS refresh (D — edit exists, uncommitted) ·
.env.example (F) · 3 stale comments (G) · org-data pair (H) · build-reviews/seed-manager (I) · autostash
(K) · orphan worktree folder (M) · admin-live-deploy plan note + folder (R) · most of the board refresh
(E) · guided.css font-floor + bare-#fff portion of N (`29949cf3`) · plus the 07-15 monthly-checkin items.

**Still open (carried into §6 list):** gitignore rule (A) · root/docs moves (C) · benchmark cluster (J) ·
test mocks (L) · debug line (O) · logs/may + strays (P) · promises-loop decision (Q) · rename decision
(S) · CI typecheck gap · fork-drift T1 · big-files T2 · the non-guided styling debt (N) · board's
"audited 2026-06-29" stamp (E remnant).

**Not archive-safe — stays open:** ❌ promises-loop (P2/P3 never built, dormant 6 days) ·
❌ admin-live-deploy (P2/P3 await Carl's walk, P4–P6 undecided). No plan folder is archive-ready today.

---

## 6. Looks bad but is actually fine (don't re-flag)

Runtime `_runtime/*.yaml` (protected bank artifacts) · logs/july 140 MB (current month) ·
.playwright-mcp/ + .secrets/ + docs/chat-history/ + chat-log.py (gitignored by design) · ~45
scripts/test-*.js (auto-discovered suites) · backend console.log volume (CLI-by-design; sole exception
is item 16 below) · high comment density in server.ts/run-history.ts/main.js (prose docs) ·
LIVE_DATABASE_URL unread (deploy-time alias) · batch-m4-verify.js (live via eval.js) · dist/ folders
(regenerable) · HEAD moving mid-sweep (live sessions working).

---

## 7. THE CLEANUP LIST — numbered, tagged

Phase 2 executes **only** approved numbers. No behaviour changes; prompt/schema/detector touches are
parked, not tidied. Every tracked delete is recoverable; untracked deletes are permanent and say so.

### ✅ Safe (tracked, reversible, zero behaviour)
| # | Item | Detail |
|---|---|---|
| 1 | Land the `_runtime/**` gitignore line | Hides ~213 status-noise lines, deletes nothing; reconcile the `.gitignore:65` "authored banks (tracked)" comment in the same edit |
| 2 | Fix the two reference maps | structure.md: frontend/ is the live customer app, add shared//testing//images/ + missing root files, kill the "tracked May baseline" claim (also in SERO_BOARD:270); engine-map.md: 7→8 prompts + rule-registry.ts, add guided-wrapup + lexicon-review model-call surfaces, note the third (persona-runs) orchestration |
| 3 | Fix dead paths in docs | `src/golden-checks.js` (contracts.md:35, features.md:58) → real path; `trust-checks.js` → `.ts` in SERO_BOARD:278, README:31, structure.md:33, handover.md:155, contracts.md:145, evals/README:10, repo-map.md:745; `src/question-validator.js` (SERO_BOARD:293) → real path. Script comments left alone |
| 4 | De-contradict SERO_BOARD | Collapse the three repo-state/test-count answers (L211-212, L267-268, L25) into one dated block; re-stamp "audited 2026-06-29" (L264) |
| 5 | Move RENDER_SETUP.md → docs/reference/ | Pure move, 3rd sweep flagging |
| 6 | Move docs/ONE-ON-ONE-RUNNER-CONCEPT.md → docs/archive/ | Finishes the half-done archive move |
| 7 | Retire worktree ceremony leftovers | Delete scripts/new-worktree.ps1; strip worktree/branch steps from safe-commit/goodnight/checkpoint/commit skills; fix the 2 docs/reference pages naming the script. Executes Carl's standing 2026-07-15 call |

### 🟡 Needs approval (one check or one call each)
| # | Item | Why the pause |
|---|---|---|
| 8 | Commit the staged STATUS.md rewrite | It's another session's half-saved edit; commit alone, only after confirming no session is mid-edit |
| 9 | Tracker truth pass (C1, C2, C11–C15) | Rewrites plan/board state to match git: axis-memory is live; PDS P2 is committed (`2ebd718c`); wrap-up-exit awaits your walk; admin-live-deploy table cells; ui-look-and-feel P4 row; parked list 4→9 |
| 10 | Delete `images/` (2.0 MB) | Verified triplicate + unreferenced logo, but could be your design-source stash — your call (tracked, recoverable) |
| 11 | Delete backend/engine/review-html.ts | 508 lines, zero consumers, verified symbol-by-symbol — but it's an engine-folder file, so approval first |
| 12 | Remove guide.js:98 `"regression.js"` entry | One-line code edit (inert fossil) |
| 13 | Retire shipped /test mocks (live-pulse, setup-redesign) | Standing call from 07-15/07-17; keep the promises-loop mock |
| 14 | Benchmark 3-file cluster: keep or retire | 3rd sweep dormant; launch.json still serves its old output |
| 15 | Prune logs/may + 3 June strays (~1.2 MB) | **Untracked — permanent delete**; confirm those runs are done with |
| 16 | Drop the stream-helper.ts:139 debug line | Tiny code edit; borderline "behaviour" (logging), so not bundled with doc tidies |
| 17 | Cursor leftovers | Delete the untracked debug log now; tracked .cursor/ config is your call (do you still open Cursor?) |
| 18 | launch.json repair | Fix sero-prod-iso (points at a missing file) + the 3013→3025 mislabel, prune accreted entries — **only at an all-sessions-closed moment** |
| 19 | Remote branch sweep | Delete the 1 fully-merged claude/* branch (needs a push); the **4 unmerged** need a fold-or-discard call each — one holds an engine fix (max_completion_tokens) |
| 20 | docs/reports/ restructure | Dated one-offs → an archive subfolder; the 2 living dashboards stay put |
| 21 | Two stalled decisions | promises-loop: un-park or formally park (❌ not archive-safe); rename darren→serolocal: re-schedule or shelve the handover doc |

### ⛔ Do not touch (this sweep exists partly to protect these)
| # | Item | Why |
|---|---|---|
| 22 | The coupling cluster | golden-checks.ts, trust-checks.ts, serve-checks.ts, rule-registry.ts, the 3 mirrored prompt files, evals/golden/ (8 cases, 2 sentinels), gate.js (executes on import — confirmed at :269). §3 has the full map. **Parked flag:** RULE_ECHO + focus-arc mirrors are UNREGISTERED — no offline alarm; registering them is prompt/detector territory, Carl's call |
| 23 | The 11 parity drifts (§4) | All behaviour changes; P5 (scoring health) deserves its own decision track, not a tidy |
| 24 | Standing protections | `content/questions/_runtime` YAMLs · batch-m4-verify.js · rename-handover doc until item 21 is decided · logs/july · the 4 unmerged remote branches until item 19 is decided |

**Parked, not tidied (flag-only per the sweep rules):** styling debt (guided.css 11px badge remnant,
member-home.js inline styles incl. non-token #a3372c, session-topbar.css hardcoded accent, tasks.js
non-Sero lane palette, wrong-token fallbacks ×6+) · fork-drift refactor T1 · 800-line-file splits T2 ·
CI per-app typecheck gap · registering the unregistered mirrors.

---

**Phase 1 close** — Files touched: this report only (audits/REPO_SWEEP.md). Commits: 1 (this report,
own-file snapshot). Highest-risk finding: **P5 — a live run whose per-turn scorer failed still gets a
briefing prompted as if axis scores are reliable; the degraded-scoring guard is unreachable from the
production path** (session-streams.ts:371-384 vs cli/stages/questioning.ts:255-264).

---

# Phase 2 + 3 outcome (2026-07-18, Carl's GO on the safe batch)

**Executed:** items 2–7 plus the leftover truth fixes (C1, C11, C12). Item 8 resolved externally
before GO (`acb47807` committed the STATUS rewrite); C2/C13/C14/C15 resolved externally by the
blanket green-light (`f0f8a61f`). Items 10–21 remain open, awaiting per-item approval.

**⚠️ Item 1 PARKED — and the standing pick-A advice from the 07-12→07-17 sweeps is WRONG.**
`git show f875c32a` proves the untracked `_runtime/*.yaml` files are NOT disposable noise: a
"checkpoint question bank" ritual commits them (213 files landed 2026-07-18 00:19; 918 _runtime
files are git-tracked). A gitignore rule would silently hide new engine-written questions from
every future checkpoint — a content-pipeline behaviour change, not a tidy. Future sweeps: stop
recommending it; the status noise resolves itself at each bank checkpoint.

**Commits (all pathspec-scoped):** `docs(maps)` structure+engine-map · `docs(paths)` dead paths
×7 files (+1 follow-up stray found by the post-tidy grep, contracts.md:99) · `docs(board)`
de-contradiction + axis-memory live · `docs(trackers)` wrap-up truth + parked list ·
`docs(rooms)` RENDER_SETUP → docs/reference/, runner concept → docs/archive/ (+ render.yaml /
repo-map / seeds refs) · `chore(skills)` worktree ceremony retired (script deleted, 4 skills
stripped, parallel-sessions.md rewritten for trunk-only). No behaviour changes; no prompt,
schema or detector files touched.

**Phase 3 (free ladder, $0):**
| Check | Result |
|---|---|
| `npm run typecheck` | ✅ clean |
| `npm test` | ✅ **153/153** |
| `replay-scenario --regression-all --fixtures-only` | ⚠️ 2 fixture fails — **pre-existing**, recorded as the baseline in wrap-up-exit plan.md on 07-17, NOT caused by this tidy: `good_shape_example` + `may24_good_prep_snapshot` both trip the listenFor rule at [backend/engine/preparation.ts:263](../backend/engine/preparation.ts) (fixture text says "if he/if she…", validator demands "whether/if they"; fixtures live in content/scenarios/regression/). Assertions NOT touched, per the sweep rules — the fixture-vs-rule mismatch is a call for Carl's session to make |
| `npm run replay` | ✅ 7/7 still good (incl. both safety sentinels), $0 |
| `npm run gate` | ⛔ NOT run (paid, ~$3) — the final manual step, Carl's call |

**Phase 2+3 close** — Files touched: 18 (docs, trackers, skills, render.yaml comments, seeds.json;
zero product code). Commits: 7. Highest-risk item this phase: none introduced — the pre-existing
listenFor fixture pair is the only red, and it predates the sweep.

# Bloat audit — 2026-07-18 (read-only)

> **Cleanup executed 2026-07-19** (Carl: "finish all"). Outcome recorded at the
> [foot of this file](#cleanup-outcome--2026-07-19). ~2,540 LOC removed across 3 commits; all
> free checks green; customer app boot-verified. Items D and the two live-used routes held with
> reasons.

Scope: the full tracked tree at HEAD `16cbabee`. Product = notes → focus points → prep brief →
question bank → live planner → final briefing, plus trust gates and tests. Method: five parallel
evidence sweeps (dead exports/routes · orphaned features vs the cut list · duplication ·
git-age staleness · content reachability) plus a dependency usage pass. Every finding carries
file:line evidence; nothing was changed. Builds on, and does not repeat, today's
[REPO_SWEEP.md](REPO_SWEEP.md) (which already removed `review-html.ts`, `images/`, the benchmark
cluster, two shipped test mocks, May logs and Cursor leftovers).

---

## 1. Verdict

**The repo is lean.** Of ~100,400 LOC of product code + content (88,553 code + 11,827 content
YAML), the measured removable total is:

| Bucket | Files | LOC | Share of product LOC |
|---|---|---|---|
| T1 safe delete | 165 | ~1,644 | 1.6% |
| T2 delete after tests | ~13 (mostly partial-file) | ~300 | 0.3% |
| T3 product decision | 7 + 4 fork pairs | ~1,790 | 1.8% |
| **Total plausibly removable** | **~185** | **~3,730** | **~3.7%** |

No unused dependencies. No files past the staleness bar (>4 weeks untouched with zero
references). No classic never-imported exports — the dead code that exists is stranded
*behind* unreachable API routes and one dormant screen, not loose files.

---

## 2. Findings

| # | Type | File(s) | Evidence | Tier |
|---|---|---|---|---|
| 1 | Dead content | `content/questions/_archive/` — 165 tracked YAML, 229 KB, ~1,644 LOC | Explicitly skipped by both loaders: `backend/engine/questions.ts:184` `if (e.name === "_archive" \|\| e.name === "_runtime") continue;` and `scripts/rebuild-question-index.js:24` `if (e.name === "_archive") continue;`. 0 of 165 files appear in `_index.json`; no `loadDir("_archive")` call exists in backend/. (Tracked → recoverable; the never-bulk-delete rule covers *untracked* questions, which these are not.) | T1 |
| 2 | Dead route cluster | `backend/api/services/pipeline/` (controller 11 + service 55 + repo 69 LOC, + 39-LOC test) via `server.ts:477` `GET /api/v1/pipeline/status` | Client wrapper `getPipelineStatus` (`shared/api.js:620`) has zero callers in admin/, frontend/, scripts/ — sole mention is the static endpoint list in `admin/src/stages/guide.js:129` (documentation text, not a call). `pipeline.controller` imported only by `server.ts`; service/repo imported only inside the cluster + its test. Its dependency `pipeline-lock.ts` is live elsewhere (`cli.ts`, `session.ts`) — not included. | T2 |
| 3 | Dead route | `POST /api/v1/checks/run` — `server.ts:414` + `services/checks/checks.controller.ts:13` (20 LOC) | Wrapper `runFreeCheck` (`shared/api.js:205`) → only the `guide.js:129` doc string. Backing `checks.service` stays live via `backend/tests/checks/test-checks-service.js`. | T2 |
| 4 | Dead routes | `GET /api/v1/runs/clonable` + `POST /api/v1/runs/clone` — `server.ts:641-642`, `runs.controller.ts:87-99` (~12 LOC + helper `callerPrefill` at `runs.controller.ts:33`) | Wrappers `getClonableRuns`/`cloneRun` (`shared/api.js:551,555`) have no caller anywhere in either app or scripts. `callerPrefill` is used only by these two handlers. Engine `run-history.ts:780 cloneRun` reachable only via this route (retained by tests). | T2 |
| 5 | Dead routes | Old team-management quartet: `GET /team/aliases`, `POST /team/merge`, `POST /team/rename` (`server.ts:499-504`, `team.controller.ts:26-40`, ~13 LOC + `team.service.ts:40,62` merge/rename ~40 LOC) and v2 `POST /team/people/:id/merge` + `/archive` (`server.ts:520-524`, `team.controller.ts:61-70`, ~9 LOC) | Wrappers `getTeamAliases`/`mergePeople`/`renamePerson` (`shared/api.js:382-388`) and `mergePeopleV2`/`archivePerson` (`api.js:524,527`) have zero source callers — superseded by the people-roster PATCH flow (`updatePerson`, `api.js:443`, called from `frontend/src/stages/team.ts:221`). `teamService.getAliases` itself stays live (`scripts/backfill-people.ts:40`). | T2 |
| 6 | Dead client wrappers | `shared/api.js:205,382,385,388,435,524,527,551,555,620` — 10 wrapper functions (~30 LOC) | Same evidence as #2–#5; plus `renamePersonV2` (`api.js:435`) is a dead duplicate of the live `updatePerson` wrapper for the same route. | T2 |
| 7 | Orphaned feature | "Everything on one page" flow: `admin/src/stages/onepage.js` (733 LOC) + `admin/src/styles/design/one-page-run.css` (246 LOC) + 8 plumbing lines (`router.js:54,91`, `stage-loaders.js:29`, `state.js:22`, `state.d.ts:10`, `gallery/screens.js:45`, `ui/pulse-labels.ts:16`, `design.css:19`) | Cut by commit `a56bbf09` (2026-07-18), which removed both UI entry points from `start-core.js`; its own message says the stage was "left dormant (unreachable via UI, reversible)". No nav row, no `onNav` handler, nothing sets `stage: STAGES.ONEPAGE`. Deliberately dormant since this morning — keep-or-delete is Carl's call. | T3 |
| 8 | Duplication (app fork) | `main.js` 462↔385 · `router.js` 223↔123 · `app-nav.js` 366↔219 · `router.test.ts` 66↔45 between admin/ and frontend/ (~770 LOC duplicated on the smaller side) | Confirmed still independent forks (frontend `router.js` header documents it). Every boot/route/nav change is written twice. Already tracked as the parked **shared-folder-split** track (SERO_BOARD §"Code-health tracks") — recorded here for the LOC count, decision already parked. | T3 |
| 9 | Duplication (helpers) | HTML-escape ×3: `admin/src/ui/promise-checkin.ts:37` and `promise-confirm.ts:35` (byte-identical `const esc = (s) => s.replace(/[&<>"']/g, …)`) + `admin/src/stages/guide.js:16` local `esc()` — all beside the sanctioned `admin/src/ui/html.js:5 escapeHtml()` | None of the three files imports `html.js`. ~8 LOC total. | T2 |
| 10 | Duplication (helpers) | Date formatting: `frontend/src/stages/guided/guided-util.ts:11 shortDate` re-rolls `admin/src/ui/time.ts:8 formatDate`; the `MONTHS` array is hand-copied in 6 files (`time.ts:7`, `build-stamp.js:9`, `guided-util.ts:9`, `returns-report.ts:94`, `run-debrief.mjs:72`, `session.ts:10`) | Identical `["Jan"…"Dec"]` constant and same "D Mon YYYY" output; `frontend/.../member-home.js:9` proves the cross-import path exists and works. ~25 LOC. | T2 |
| 11 | Index hygiene | `content/questions/_index.json` (468 KB): 695 aliases with no disk file; 297 on-disk pool files absent from the index | Measured by cross-referencing `entries` against `git ls-files`/disk. Regenerable via `npm run rebuild-question-index` — a rebuild, not a delete. (Untracked pool files themselves are protected — never bulk-delete.) | T2 |
| 12 | Duplication (dual-wiring) | Two seed→Question mappers: `backend/engine/intro-queue.ts:29 materializeQuestion` (live path, `session-streams.ts:467`) vs `backend/engine/question-generator.ts:470 seedToQuestion` (CLI path, `cli/stages/questioning.ts:214`) | Same YAML → different `Question` shape. This is parity drift **P8** in [REPO_SWEEP.md](REPO_SWEEP.md) §4 — dual-pipeline territory, behaviour-touching. Flagged, never a tidy. | Protected |
| 13 | Protected (for the record) | Detector ban-lists (`golden-checks.ts`, `trust-checks.ts`), `scripts/gate.js` (executes on import — `main()` at :269, grep only), the dual wiring (`session-streams.ts` ↔ `engine/cli/stages/*`), `relational-arcs.ts`, the deliberate `reviewer.ts`↔`golden-checks.ts` circular pair, `serve-checks.ts`, `rule-registry.ts`, `evals/golden/` (8 ratified cases, 2 sentinels), `content/questions/_runtime/` (931 tracked YAML, ~9,905 LOC — checkpointed engine output) | Not probed for deadness; excluded from all removable totals. | Protected |

**Verified clean (chased and cleared — do not re-hunt):** continuity/"moat" remnants (zero
matches for carry-forward prefill / outcome capture / cross-session injection; every
`carryForward` hit is the live intra-session agenda or promises-loop) · over-abstraction
(8 single-caller files traced; all are the house controller→service→helper pattern — the only
weak candidate is the `guided-runtime.ts:11` one-instantiation factory, a defensible DI seam) ·
all 8 prompt files + notes YAML + `rule-registry.ts` live · lexicon folders (dynamic by role;
`_candidates`/`_suggested` consumed by `promote-core.ts:112` / `candidates-io.ts:171`) ·
scenarios (root 001–004 have no static refs but are enumerated by `replay-scenario.js
listScenarios()` — dynamic, not provable) · `content/data/role-profiles/` (36 files, 275 KB,
dynamic by `role--seniority` key) · all backend services registered in `server.ts:25-53` have
live consumers apart from the routes in #2–#5.

**Near-stale watch-list (inside the 4-week window, zero references — no tier yet):**
`scripts/focus-example.js` (2026-06-25) · `scripts/org-inventory.ts` + `scripts/delete-orgs.ts`
(2026-07-11, one-off ops utilities) · `scripts/plan-turn-size-report.js` (2026-07-10, one-off
report; sole consumer of the `gpt-tokenizer` dependency).

---

## 3. Dependency findings

**None unused.** All 7 runtime dependencies and all 16 dev dependencies verified in use:
`pdfmake` lazy-loaded at `admin/src/ui/recap-pdf.ts:294` · `pg` at `backend/db/client.ts:10` ·
`bcryptjs` (5), `drizzle-orm` (29), `lucide` (33), `yaml` (8), both `@fontsource-variable`
fonts (2 each) imported directly · `tailwindcss`/`postcss`/`autoprefixer` via
`admin/`+`frontend/` `tailwind.config.js`/`postcss.config.js` · `concurrently`/`cross-env` in
`package.json` scripts · `globals` at `eslint.config.js:2` · `gpt-tokenizer` at
`scripts/plan-turn-size-report.js:19` (its **only** consumer — rides with that script's fate).

---

## 4. Counts

| Measure | Value |
|---|---|
| Tracked files scanned | 2,553 (+ ~4,567 untracked gitignored question-pool YAML on disk, by design) |
| Code LOC (ts/js/mjs/mts) | 88,553 — backend 40,881 · admin 19,154 · scripts 11,298 · frontend 4,747 · shared 1,152 · evals 547 · other 10,774 |
| — of which vendored tooling | 10,335 LOC = `.claude/skills/impeccable/scripts/` (design-review skill, not product code) |
| Content YAML | 1,120 tracked files / 11,827 LOC (931 of them protected `_runtime`) |
| Docs (md+html) / CSS | 33,983 / 9,295 LOC |
| T1 LOC | ~1,644 (165 files, all `content/questions/_archive/`) |
| T2 LOC | ~300 (route cluster + handlers + wrappers + helper dups + index rebuild) |
| T3 LOC | ~1,790 (one-page flow 987 · app-shell fork ~770 · plumbing 8 lines) |
| Protected LOC flagged | ~9,940 (`_runtime` 9,905 + P8 mappers 35) |

Sweep coverage: 122 registered routes cross-referenced against every client · 541 backend
exported symbols reference-counted · 581 source files in the duplication pass · ~335 in the
git-age pass · 1,211 tracked content files · ~280 in the orphan pass.

---

## 5. The single biggest source of bloat

Stranded-but-wired surface, not file clutter: one dormant screen and nine dead API routes are
still registered, routed and wrapped (findings #2–#7) while nothing can reach them — everything
else in the repo earns its place.

---

## Cleanup outcome — 2026-07-19

Carl: "finish all." Executed as far as safe without editing through another live chat's lane
(session `457faf5d`, promises-before-recap, was actively holding `state.js`, `design.css`,
`promise-confirm.ts`). Three own-files-only commits.

| Item | Result | Removed | Commit |
|---|---|---|---|
| A · `_archive` bank | ✅ Done | 165 files / ~1,644 LOC | `95c56ae` |
| B · dead routes | ✅ 7 of 9 | pipeline cluster (4 files) + `checks.controller` + 7 routes + 8 `shared/api.js` wrappers + guide doc lines (~250 LOC) | `95c56ae` |
| C · one-page flow | ✅ Done (bulk) | `onepage.js` 733 LOC + loader/route/gallery/label refs in both apps | `7b94fa0e` |
| D · fold helpers | ⏸ Held | — | — |
| E · question index | ✅ Done (safe path) | dangling aliases dropped (4965 → 4536), zero files deleted | `7b94fa0e` |

**Verification (all $0):** `npm run typecheck` clean · `typecheck:admin` clean · `typecheck:customer`
unchanged at its pre-existing 5 errors (`frontend/src/stages/preparation.ts`, not touched by this
work) · `npm test` **157/157** · customer app booted on a preview server — start screen renders, the
removed `/flow` route falls back cleanly, zero console errors.

**Held, with reasons:**
- **B — `runs/clonable` + `runs/clone` (2 of 9):** NOT dead. `scripts/gallery-export.mjs` (another
  live chat) calls `/runs/clonable`, and both are the surface for the H-1 cross-company prefill
  security gate (`backend/tests/runs/test-prefill-access-gate.js`). Kept deliberately.
- **C residuals:** the `STAGES.ONEPAGE` enum line (`admin/src/state.js:22`) and the
  `@import "./design/one-page-run.css"` (`admin/src/styles/design.css:19`) + the 246-LOC CSS file
  sit inside session `457faf5d`'s lane. Left for a ~2-minute finish once that chat lands. The enum
  is now inert (no loader, route, gallery card or label), so this is harmless.
- **D — helper fold:** dropped as unsafe. `promise-checkin.ts`'s `esc` escapes an **extra**
  character (the single quote `'`) that the sanctioned `escapeHtml` does not, so folding it is a
  behaviour change, not a pure dedup — it needs per-call-site checking. Its byte-identical twin
  `promise-confirm.ts` is also inside session `457faf5d`'s lane. Low payoff (~8 LOC), real subtlety
  — parked for a considered pass.
- **E — the `--prune` flag:** the npm script `rebuild-question-index --prune` deletes tracked,
  protected `_runtime/*.yaml` checkpoint artifacts (241 of them on the first attempt — reverted).
  Ran the no-`--prune` form instead: it rebuilds the index from disk (dropping dangling aliases,
  picking up orphan pool files) and deletes nothing. Future note: never run `npm run
  rebuild-question-index` (which carries `--prune`) — use `node scripts/rebuild-question-index.js`
  bare.

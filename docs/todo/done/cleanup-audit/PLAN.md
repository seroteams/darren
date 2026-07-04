# Cleanup after the audit — fix, delete, simplify (no new features)

**Goal:** The cruft the July 4 deep-dive audit found is gone: the real fixes are in, dead scripts are deleted, and the copy-pasted helpers are folded into one.
**Driver:** Carl
**Created:** 2026-07-04

Source: full audit report (chat, 2026-07-04). Everything here is offline/free — **no OpenAI spend anywhere in this plan**.

## Done means
- The 5 real problems the audit confirmed are fixed (types, duplicate constant, silent errors, escaping, stale config).
- The dead one-off scripts are deleted and the log folder is purged.
- One shared helper each for HTML escaping, relative time, and prompt filling — no more copies.
- `npm test` and both typechecks stay green after every phase.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Quick fixes | The 4 small real fixes (types, constant, error logging, stale config) | ✅ green-lit + committed `55f27457` (2026-07-04) |
| 2 | Delete dead cruft | Dead scripts gone, product-qa/clamp decided, logs purged, old branches pruned | ✅ green-lit `f64c108f` (2026-07-04) |
| 3 | Frontend helpers | One escapeHtml + one relTime for the whole admin app | ✅ green-lit `ddefe3b7` (2026-07-04) |
| 4 | Backend dedup | One prompt-filling helper, snap divergence documented, test auto-discovery | ✅ green-lit + gate-proven (2026-07-04) |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Baseline (free, 2026-07-04):** `npm test` **56/56 PASS** · `npm run typecheck` (backend) **clean** ·
`npm run typecheck:admin` **17 pre-existing errors** — almost all are the stale `state.d.ts` this plan's
Phase 1 fixes (missing `PERSON_DETAIL`/`RUN_DETAIL` stages + `myRunId`/`personKey` fields), plus 2 in the
in-progress rating work. Anything red above beyond those 17 would be new damage; these 17 are not.
**Budget note:** Carl OK'd up to **$3** of API spend this session (2026-07-04). Plan needs $0; reserve it —
at most one `node scripts/gate.js --only <case>` (~$0.35) after Phase 4's prompt refactor if wanted.
**ALL 4 PHASES ✅ — plan complete 2026-07-04** (`55f27457`, `f64c108f`, `ddefe3b7`, `cfc53eb2`).
Carl topped up OpenAI billing and gave the close-out go-ahead; the live gate capstone ran and
**PASSED** (`node scripts/gate.js --only biweekly-priya` → 1 ok / 0 regressed / 0 error, report
logs/gate/2026-07-04T03-27-05-533Z) — the refactored prompt builders produce a fully passing
end-to-end run. Session API spend: ~$0.35 of the $3 budget.
Phase 4 details:
What landed: `fillPlaceholders()` in prompt-utils.ts (test-first; sequential-replaceAll semantics
preserved exactly, keys in original order → prompts byte-identical) now used by all 5 prompt builders;
the two snapToAllowedDelta copies deliberately NOT merged (planner ties→0, bank ties→positive) —
divergence now documented in question-generator.ts; run-tests.js auto-discovers scripts/test-*.js with
a PAID_TESTS denylist (a new test can never be silently skipped); smoke-test's placeholder-coverage
guard taught to recognise the fillPlaceholders form.
Verified free: npm test **57/57** (prompt-utils.test.ts auto-discovered — proving the discovery works) ·
typecheck clean · smoke pre-flight unit checks 14/14.
**Paid capstone blocked:** tried one gate case (`--only biweekly-priya`, would be ~$0.35) — every OpenAI
call returns **429 "exceeded your current quota"**. The account needs billing topped up; $0 actually
spent. Run `node scripts/gate.js --only biweekly-priya` once billing works to close the loop.
**Audit correction:** config/models.json EXISTS and is used (smoke prints "models: (from
config/models.json)") — the parked "simplify models.ts" item was based on a wrong finding; dropped.
Earlier phase details:
What landed: new shared `admin/src/ui/time.ts` (+ co-located test, written red→green) replaces the
4 identical relTime copies; the 4 local escape fns replaced by the shared `escapeHtml` (aliased at
import so 59 call sites are untouched; tasks.js is now stricter — its old copy didn't escape quotes);
run-tests.js now also discovers admin `*.test.ts` (suite 55 → 56); admin tsconfig excludes test files
(node-run, not browser); html.js comment corrected (four chars, not five).
Verified free: npm test **56/56** · both typechecks clean · `npm run build` compiles every stage ·
member pages (Runs "10h ago" etc.) render clean in the browser; admin pages compile-verified via build
(member login can't mount them — Carl's QA covers the visual pass).
Earlier phase details:
What landed: 7 dead one-off scripts deleted (~1,450 lines; batch-m4 kept, eval.js uses it);
product-qa.ts + its engine export + orphaned prompt map entry + prompt file deleted; clamp.ts +
test deleted; logs purged 92 machine-made runs, 75MB (236MB → 154MB) — purge wrongly took the
tracked May keep-set too, restored from git on the spot (guard idea → Parked); 8 stale remote
branches deleted after archive-tagging each head locally (`git tag -l 'archive/*'` to see them).
Verified free: npm test **55/55** (one fewer = the deleted clamp test) · both typechecks clean ·
app boots with zero console errors.
Earlier Phase 1 details:
What landed: state.d.ts completed (+ RUN_DETAIL/PERSON_DETAIL stages, myRunId/personKey fields);
listMyRuns + star-rating JSDoc types (fixed ALL 17 baseline type errors, typecheck:admin now fully green);
question-generator now derives ALLOWED_DELTAS from queue-constants (0 excluded on purpose, order preserved
— note: the two snapToAllowedDelta copies tie-break differently, planner→0 / bank→positive, flagged in
phase-4.md); prewarm failures now console.warn; stale frontend/* permission rules removed from
.claude/settings.json. Verified free: npm test 56/56 · both typechecks clean · clicked through Home /
Past 1:1s / Team / run detail in the browser, zero console errors, star rating intact.

## Parked
(from the audit — each would be its own plan if Carl wants it)
- **Engine unit tests** for queue-manager.ts + reviewer.ts (~6,500 untested core lines — biggest safety win, ~2 days).
- Split the god files: session-streams.ts (5 handlers), sessions.service.ts, reviewer.ts.
- Split design.css (4,032 lines) into tokens/layout/components/stage files.
- Split onepage.js (732 lines) into form + stream + rail.
- Finish the admin JS→TS migration (file-by-file as touched).
- Session fence: document undefined/null invariant + add org+user wall test.
- Unify the two fmtDate helpers; shared guard factory for admin/superadmin middleware.
- Refresh docs/sero-how-it-works.html changelog (PG phases not reflected).
- **purge-logs.js should skip git-tracked runs.** Found in Phase 2: the purge deleted the tracked
  May keep-set (2026_May24_21-46 + 2026_May25_14-23, 51 files) because they're marked archived —
  restored from git on the spot, no loss. A 5-line "skip if git-tracked" guard would stop the footgun.

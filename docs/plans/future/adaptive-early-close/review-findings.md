# Red / Blue / Green team review — why this plan is PARKED (2026-07-17)

Carl asked for a three-way review before building. Verdict: **park behind fresh tester data.**
The Complete/Continue-deeper *design* is good; the *trigger* failed on measured evidence.

## The killer finding (red team, measured on 44 real July runs)
The saturation trigger ("all 4 axes substantively touched, turn ≥ 4") almost never fires where it matters:
- **Bi-weekly (17 runs):** usefully fires in **1 of 17** (~6%) — saving one question.
- **Feels-off (10 runs):** saves nothing in all 10 (fires at/after the natural end).
- **Performance (5 runs):** can **never** fire — its question signatures never touch the wellbeing axis (off-signature deltas dropped, queue-manager.ts:154-164), so one axis stays untouched by design. Inherits the open "scoring skew" systemic finding.
- **Growth (1 run):** the only type it would meaningfully trim — the type the plan says must stay deep.
- Root cause: `enforceAxisCoverage` only pulls untouched axes in at turn 4+, so full coverage is structurally correlated with the *end* of the run. The signal measures the engine's own coverage bookkeeping, not answer richness. New bi-weekly shape (4 intro + 1 dynamic + closer) leaves nothing to cut anyway.

## Context findings (green team)
- A **"Skip to briefing"** exit already exists on every question screen (since 2026-06-03) — testers felt "pushed" with it visible. Passive exits don't fix the feeling; framing does (its copy says "unanswered questions will be dropped" = loss framing).
- A **"Question X of Y"** progress line already exists.
- The 6-question fix (e3a31ccb) went live 2026-07-16 — **all "pushing" feedback predates it**. Zero feedback rounds exist against the 6-question reality.
- Both apps share ONE questioning file (`frontend/src/main.js:48` imports `admin/src/stages/questioning.js`).

## What survives for a future rebuild (blue team — mechanics all verified sound)
- The one-lever end (`totalBudget = turn + 1` → existing closer force-insert + done-gate) is real and safe (back-nav snapshots restore totalBudget).
- Axis history is provably substantive-only (zero deltas never booked) — an honest signal, just the wrong trigger shape here.
- Must-fix traps recorded for any rebuild: skip answers bypass the shallow gate (floor must count *substantive* turns); scripted lane must be exempt; Continue-with-empty-queue would end the run (needs seed pull); the offer UI collides with the promises-loop final-turn fork ("Agree next actions") — must replace it, and reset `promisesConfirmSkip`; the offer must be once-per-session, persisted; instrumentation rides `planResult.issues` + `logRunRoot` for free.

## The decision (Carl, 2026-07-17)
1. Park this plan (this folder → docs/plans/future/).
2. Build the small thing instead: from Q4+, the existing "Skip to briefing" becomes a warm **"Wrap up — get my briefing"** that routes through the closing question (uses the same `totalBudget = turn + 1` lever). See `docs/plans/doing/wrap-up-exit/`.
3. Revisit adaptive-close only if "still feels pushed" survives a corridor-feedback round on the 6-question bi-weekly — rebuilt on a better "enough" signal (the parked planner-assisted idea), not the axis rule.

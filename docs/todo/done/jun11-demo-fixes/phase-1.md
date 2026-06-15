# Phase 1 — Question integrity

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 built, awaiting product-owner test (live QA blocked on OpenAI quota)

## Goal
No question reaches the screen unless it passes one shared eligibility check — right meeting type, not a repeat — and every rejection is logged with a reason.

## Changes
- New shared gate `isQuestionEligible(question, session)` (likely `src/question-eligibility.js`): checks (a) the active meeting type's forbidden patterns from `src/one-on-one-types/*/type.js`, (b) distinctness from already-asked question *text* (normalized text, not aliases). Every source goes through it: opener pick, generated bank, thread-follow injection, coverage insertion, seed overflow, closer/fallback.
- Rejection logging to the run log: question id, source path, reason, meeting type, matched pattern or duplicate match, fallback action. Log-only, never user-facing.
- `src/opener.js` — opener candidates filtered through the gate (fixes outside-work icebreaker in bi-weekly).
- `src/queue-manager.js` — thread-follow gets the real transcript; if the mirror stem can't ground itself in the last answer, skip injection (no canned-stem fallback). User-facing `description` gets plain wording; injection rationale stays in run-log `issues`. Coverage insertion limited to the session's own bank, never the global `questions/` dir.
- `src/cli/stages/questioning.js` + `src/closer.js` — seed overflow goes through the gate; if nothing safe remains, transition gracefully into the normal closing stage (not a hard stop).
- Regression fixture `scenarios/regression/machar-biweekly-jun11.json` wired into `npm run gate`, asserting invariants (not exact text): no outside-work opener in bi-weekly, no duplicate question text, no question from outside the session bank, no forbidden-pattern seed, no debug rationale in any UI description.

## Not in this phase
- Brief wording (Phase 2), live scores (Phase 3), back navigation (Phase 4).
- Any change to how questions are *generated* — only how they're admitted.

## Done when
- [ ] Acceptance: no code path can serve a question that hasn't passed the gate.
- [ ] Machar inputs re-run end-to-end shows none of the four bugs.
- [ ] Regression fixture passes in `npm run gate`; gate + smoke green (vs. baseline).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Bi-weekly opener** — start a new bi-weekly session (any persona). The first question should be a work-appropriate opener. ❌ Not OK if you see "What's been the best part of your world outside of work?" or anything personal-life.
2. **No repeats** — answer 5–6 questions with short, substantive answers (like the Machar demo). ❌ Not OK if the same question (same wording) appears twice.
3. **No strangers** — use the Machar inputs (Partner alliance manager, Lead, bi-weekly, the "selling partnership benefits" note). Every question should make sense for *this* conversation. ❌ Not OK if a question mentions a team/topic neither you nor the engine introduced (like "BA team").
4. **No debug text** — read each question's small description line. It should read like plain coaching language. ❌ Not OK if you see words like "runtime", "injected", "planner".
5. **Rejections visible in the log** — after the session, open the run folder; the turn logs should show any rejected questions with a reason. (I'll point you at the exact file.)

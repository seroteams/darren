# Phase 1 — Stage-1 gates + performance tone relabel

All edits in `backend/engine/one-on-one-types/` + the offline test script. Free (no OpenAI).

## Changes
1. **performance/type.ts**
   - `tone_register` → "Direct, adult-to-adult, task-directed. The manager has a view; the employee has
     a view; the meeting reconciles them. Name the work gap plainly — never the person. No vague
     sugar-coating, no trait talk." (Kluger & DeNisi: feedback fails when attention moves to the self.)
   - `anti_patterns` + line: person/trait-coded questions.
   - `forbidden_question_res`: person/trait attributions.
2. **growth/type.ts** — gate: promotion/pay promise language (+ anti_patterns line).
3. **feels-off/type.ts** — gate: state-inference/diagnosis terms (burnout, depressed, anxious, stressed…).
4. **onboarding/type.ts** — gate: assessment language (meeting expectations, on track, rate…).
5. **bi-weekly/type.ts** — append the state-inference terms (no-diagnosis across relational arcs).
6. **scripts/test-question-integrity.js** — accept/reject cases for each new gate; FLIP the negative
   control that asserts onboarding allows the outside-work opener bi-weekly blocks.

## QA scenarios (Carl's walk)
1. `local > admin (dev login) > Meeting arcs` — open Performance & feedback: tone line reads
   task-directed/non-personal (no "no cushioning").
   ✅ Pass: new tone text shows · ❌ Fail: old text or an "edited" badge you didn't create.
2. I show the integrity-script output: each type's banned phrasing rejected, normal questions accepted.
   ✅ Pass: all PASS lines · ❌ Fail: any FAIL.
3. I show the eligibility log from a fixtures replay: zero legitimate questions dropped.

## Status
🔨 built 2026-07-20, awaiting Carl's walk. All free checks green: integrity script (16 new gate
cases PASS), typecheck, npm test (one unrelated in-suite flake: test-admin-serving, passes standalone —
parallel-session port clash), regression replay (2 pre-existing stale listenFor fixtures flagged as a
separate chip, unrelated). Gate counts on the live read path: bi-weekly 10 · performance 3 · growth 4 ·
feels-off 4 · onboarding 5. Budgets unchanged (6/8/9/6/6).

# Phase 4 — Notes flow everywhere

**Part of:** [plan.md](plan.md) · **Status:** 🔨

## Built (2026-07-30)
- backend/api/services/sessions/session-streams.ts + plan-turn-inputs.ts: the live planner and its byte-honest preview both pass `session.notes` to planTurn, so a jotted observation reaches the next question's prompt AND the grounding corpus (the P3 plumbing this flips on).
- backend/api/services/sessions/notes-format.ts: new single-rule `formatCapturedNotes` — a REAL run passes mid-run notes through to the evaluation; a QA run (runLabel or scripted mode) keeps the old tester-line strip, so tester observations still never reach a briefing. Both call sites (evaluationStream, evaluation-inputs) use the one rule; the persona QA runner keeps its strip unchanged.
- Leak safety unchanged: `checkPrivateNoteLeak` still screens every briefing against the manager-notes channel, which now includes mid-run notes, so a note echoed into employee-facing text still blocks the briefing.
- Tests: NEW plan-turn-inputs.test.ts (+2), notes-format.test.ts (+3: real-run passthrough, QA strip, empty), evaluation-inputs.test.ts (+2: real-run notes reach the channel, QA-labelled runs still exclude). TDD red-first.
- Offline proof: npm test 219/219 · typecheck clean · lint:copy PASS · replay fixtures: only the 2 known pre-existing prep-validator failures.

## Goal
A note you jot mid-meeting shapes the next question and appears in the final brief, on real runs.

## Changes
- backend/api/services/sessions/session-streams.ts + plan-turn-inputs.ts: pass mid-run notes to the planner (and keep the S1b preview honest with the live send).
- backend/engine/queue-manager.ts: note texts join the grounding corpus so note-grounded questions survive the honesty gate.
- backend/api/services/sessions/notes-format.ts: mid-run notes reach the evaluation on real runs (today they are deliberately stripped after an old tester-note leak); QA-labelled runs keep the strip.
- Tests: new plan-turn-inputs.test.ts; notes-format tests extended; adversarial note fixture (a hostile note must not steer the planner).

## Not in this phase
- Anything cross-run. UI changes to the notes panel.

## Done when
- [ ] A turn prompt in the run log shows the note; the evaluation inputs show it too.
- [ ] QA-labelled runs still exclude tester notes (regression test).
- [ ] All free checks green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **The note lands in the meeting** — `live > sero.team > run a 1:1`; mid-meeting, open the notes panel and jot something concrete ("he keeps glancing at his phone, seems flat"). ✅ Pass: within the next couple of questions, the line of questioning visibly acknowledges that observation's territory. ❌ Fail: the note changes nothing all run.
2. **The note lands in the brief** — same run, finish it. ✅ Pass: the final brief reflects your observation (in your direction, about your meeting). ❌ Fail: the note is nowhere.
3. **Notes stay yours** — check the parts of the recap you would show the report. ✅ Pass: your private note's wording never appears as something the report said. ❌ Fail: your note text shows up attributed to them.

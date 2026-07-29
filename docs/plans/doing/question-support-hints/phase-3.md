# Phase 3 — Every remaining question type

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
No question in a meeting is left without coaching, and no line ever pretends to be something it isn't.

## Why this phase exists
The dependency sweep found that the **first three questions of every meeting** are hand-written intro questions, not generated ones. Phases 1 and 2 would leave the opening third of the meeting still showing the prep-brief fallback. These sources are all static or code-built, so their lines are written once, by hand, and cost nothing per run.

## Changes
- `content/questions/_intro/**` (3 questions × 4 meeting types = 12 files) — hand-written coaching lines. Possible only once the Phase 1 codec fix lands.
- `content/questions/_seed/**` (8 files) and `content/questions/_openers.json` — same, hand-written.
- `backend/engine/closer.ts` and `backend/engine/agenda.ts` — the closer and the "also cover today" carry-forward are built in code; their lines are written into the builders.
- `backend/engine/thread-follow.ts` — a follow-up is minted in code with no model call, so it cannot have lines written for it. It inherits the lines of the question it follows (the same thread), carried explicitly rather than by accident.
- `admin/src/ui/coach-panel.ts` — a short label when lines are inherited ("From the question this follows up on"), matching the existing brief-level label. Same label rules, no new design.
- The prep-brief fallback stays in the code as a genuine last resort, but should no longer appear in a normal meeting.
- Tests: every static question file carries lines (a content check, like the existing question-integrity script); a follow-up carries the parent's lines; the panel labels inherited vs own vs brief-level correctly.

## Not in this phase
- Writing fresh model-authored lines for a follow-up (would need a second model call per follow-up — parked).

## Done when
- [ ] A content check proves every intro, seed and opener question carries 1–3 lines.
- [ ] A replayed run shows a "Following up on..." question arriving with the parent's lines and the inherited label.
- [ ] `npm test` + `npm run typecheck` green, screenshot of the real Support panel on both an intro question and a follow-up.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
`local > admin (dev autologin) > start a 1:1 > answer with a few sentences so a follow-up fires > Support tab`
1. **The very first question has support** — question 1 of the meeting shows lines written for it. ❌ Not OK if it shows "From your prep brief".
2. **A follow-up has support** — when "Following up on what you just said" appears, the lines show with a small note saying they come from the question it follows. ❌ Not OK if they show as if written for the follow-up.
3. **Nothing is ever blank** — walk a whole meeting end to end. No question shows an empty Support tab, and "From your prep brief" does not appear at all.

# Coach hints that move with the meeting

**Goal:** The right-hand Support panel always shows coaching written for the question on screen and for what has just been said, instead of repeating whole-meeting prep cues.
**Driver:** Carl
**Created:** 2026-07-30
**Mockup:** https://claude.ai/code/artifact/6c24a91b-b025-4146-8e86-ba24a624889a — awaiting sign-off

## Done means
- The agenda question ("I've got a couple of things to cover...") shows its own three coaching lines, not the "From your prep brief" fallback.
- On a live run, the panel's lines change from question to question and pick up what the person actually said.
- No two questions in a row show an identical panel.

## Resolved before we start

Dug out of the code before phase 1, so neither phase stalls on an unknown:

- **Why the screenshot panel is generic.** `q_intro_agenda_check` is built in code at [sessions.service.ts:75](../../../../backend/api/services/sessions/sessions.service.ts) and is the ONLY question in the app with no `hints`. Its sister `q_agenda_carry_forward` ([agenda.ts:51](../../../../backend/engine/agenda.ts)) got hand-written hints in question-support-hints Phase 3; this one was missed because the test that guards static coaching ([questions.test.ts:109](../../../../backend/engine/questions.test.ts)) walks the content folders only, and this question lives in code.
- **Why it then repeats.** With no hints, [coach-panel.ts:146](../../../../admin/src/ui/coach-panel.ts) falls back to `store.preparation.listenFor`. `fallbackCues` is computed ONCE per session and never changes, so every hintless question shows the identical three cards.
- **Why nothing tracks the answers.** `plan-turn.md` output contract, "Carried unchanged: copy the item's hints verbatim". A question queued before the meeting keeps coaching written before anyone spoke. Only *reworded* items get fresh hints ([reconcile-queue.ts:315](../../../../backend/engine/reconcile-queue.ts)).
- **The planner already emits hints every turn** for every queued item, so phase 2 is a prompt-rule change, not new plumbing.
- **Old runs also repeated for a second reason** (a code-minted follow-up borrowing its parent's hints). Fixed 2026-07-30 by model-written follow-ups; not in scope here.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The agenda question gets its own coaching | Three hand-written hints on `q_intro_agenda_check`, plus the guard test extended to code-minted questions so this can't happen again | ✅ |
| 2 | Coaching that re-earns itself each turn | `plan-turn.md` rewrites the next question's `listen` lines against the transcript even when the question itself is carried unchanged | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**CLOSED 2026-08-01. Both phases green-lit, both live.**

- **P1** ✅ 2026-07-31 (`ef4646cf`): Carl walked the agenda question in the runner and confirmed the three lines replaced the prep-brief fallback.
- **P2** ✅ 2026-08-01 (`099b8e76` · `c7dc564e` · `fb8737a7`): Carl walked a live 1:1 on sero.team and confirmed the panel moves with the answers, last question included. Live build `fb8737a`, `/api/v1/health/deep` reports `db: up`.

Mockup signed off 2026-07-30. Total spend **$0.35**: one approved $0.199 gate run, plus ~$0.15 spent unapproved (see the spend note above).

## What this cost to find, which is the part worth keeping

The screenshot said "the panel repeats itself". Four separate things had to be true for that, and only the first was in the original plan:

1. `q_intro_agenda_check` had no hints at all, because the guard that proves every question carries coaching walks content folders and this question is built in code.
2. `plan-turn.md` told the planner to copy hints verbatim on carried questions.
3. `reconcileQueue` discarded the planner's payload on carried questions anyway, so fixing 2 alone would have been **completely inert**.
4. The reserved closer never passes through 3 at all, so fixing it still left the **last question of every meeting** stale. It reaches the front by three more routes, and the one that fires on real runs was in a different file again.

Number 4 was found only because the paid proof run was read line by line rather than trusted on its PASS. The gate went green while a sixth of the meeting was still broken.

Baseline taken before any edit: `npm test` 219/219, `npm run typecheck` clean. `npm run gate` was deliberately NOT run as the baseline: it is a paid OpenAI run and phase 1 changes three lines of static content, so the free suite is the honest bar. The one paid run this plan allows is reserved for phase 2.

Board: https://claude.ai/code/artifact/f5eac651-d4e8-4ba9-a1b7-c19835cd56c4

**Spend, 2026-07-31.** The approved proof run (`gate.js --only biweekly-priya`) cost **$0.199** exactly, from the run's own `cost.json`.

**Spend note, 2026-07-30 — unapproved.** Driving a local API session to check the served payload spent roughly 84k input tokens across 9 calls over 2 sessions, because the dev server holds an OpenAI key that is not visible to the shell this session runs commands in. Checking `process.env` from the shell said "no key" and that was read as "these calls are free". It was not. Those sessions wrote no `cost.json`, but priced against the proof run's own figures (plan-turn on `gpt-5.4` at ~11.5k prompt tokens costs $0.012 to $0.042 a call) it comes to roughly **$0.15**. Told to Carl rather than buried. Before any future local run, confirm the key from the SERVER's environment, not the shell's.

## Parked
- The fallback path forces every brief cue to render as "Listen for", so it shows three identical pills. After phase 1 no question should reach the fallback, making it a rare safety net. Revisit only if it still shows up.
- Hints are formulaic across a run ("Whether he names a specific ..." opens most of them). Prompt-craft problem, separate from staleness.

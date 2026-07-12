# Planner grounding — keep questions on the person's real thread

**Goal:** stop the planner from abandoning the person's actual topic and falling back to generic
questions. Separate from Phase 005 (database) — this is an **engine / question-quality** change.
**Driver:** Carl
**Created:** 2026-06-28
**Trigger:** the live run `logs/june/2026_Jun28_22-21-9c10e643` (Carl DB · UX Lead · Bi-weekly) — the
questions drifted off-thread and Carl skipped the back half.

## The diagnosis (from that run, reviewed offline — free)
- **Turns 1–3 were good.** Opener + prep + generated bank all followed the real thread (Head of UX, role
  clarity, the stretch he wants). The bank even had strong on-thread questions queued
  (`q_team_direction`, `q_priority_choices`).
- **Turn 4 broke it.** A shallow answer ("not sure yet, you tell me") was flagged `[SHALLOW]` — and the
  planner responded by **switching topics**, injecting generic catalogue questions
  (`q_stakeholder_pull_3`, then `q_feedback_load`) that the person never raised. The grounded bank
  questions got pushed down and never asked. Carl skipped Q5–Q9; engine flagged
  `SESSION NON-FUNCTIONAL: 3+ consecutive non-answers`.

## Two root causes
1. **Thin input → low-confidence focus padding.** Brief notes ⇒ the focus stage invented 2 *low-confidence*
   focus points (feedback, priorities). One of them seeded the off-thread feedback question.
2. **Shallow-answer reaction = topic switch, not drill-down.** The planner changes the subject (and prefers
   generic catalogue questions) instead of staying on the same thread and drilling in.

## Candidate fixes (to scope with Carl — pick what's in)
- **A. Drill, don't switch, on a shallow answer.** When an answer is `[SHALLOW]`, keep the current thread
  (re-ask / narrow) instead of pivoting to a new topic.
- **B. Prefer grounded bank questions over generic catalogue ones** when a strong primary thread exists.
- **C. Don't pad with low-confidence focus points** (or don't let them seed questions) when there's one
  clear primary focus.

## Proposed phases (detail written after Carl picks the scope)
| # | Phase | What it lands |
|---|---|---|
| 1 | Lock the scope + a failing test | Pick A/B/C (or all); capture the bad run as a **failing regression test** (red) — the planner-drift reproduced offline, no paid run. |
| 2 | Fix #1 (likely A — drill-don't-switch) | Smallest change to hold the thread on a shallow answer; test goes green. |
| 3 | Fix #2/#3 if in scope | Bank-preference / low-confidence-focus handling, each test-first. |
| 4 | Prove it | One **paid** scripted run (~$0.35, cost confirmed first) on a thin-notes persona — questions stay on-thread. |

## Rules
- **Test-first (TDD):** reproduce the drift as a failing offline test before changing engine code.
- **Engine honesty:** fix the behaviour; never hardcode-rewrite questions to hide it.
- **Cost control:** diagnosis + the regression test are **free/offline**. A paid run is only for the final
  proof (Phase 4), with Carl's explicit yes + cost stated. Carl pre-approved a paid test run; held until then.
- **One phase at a time**, Carl QA-walks each before the next.

## Scope (locked 2026-06-28)
**A — drill, don't switch.** B and C **parked** (B partly overlaps A — see below).

## Deeper finding (changes the test strategy)
A second look at the planner's own output on the drift turns:
- The off-thread `q_stakeholder_pull_3` was **the model's pick at turn 4** (after the shallow answer), chosen
  from a **candidate pool that already contained generic catalogue questions** (the planner prompt lists
  "stakeholder"/"feedback" options).
- At **turn 5 the model self-corrected** ("pivoted away from stakeholder… repeated the Head-of-UX clarity
  gap") and proposed good drill-down questions — but the person had already disengaged.
- **So fix A is a planner-behaviour change** (prompt: on a shallow answer, drill the same thread; don't reach
  for a generic coverage question), and it **overlaps with B** (don't feed generic questions into the pool
  when a strong thread exists). **A prompt/behaviour change cannot be proven by a free unit test** — it
  needs the planner to actually run.

## Reconcile — fix A likely already shipped (clean-up sweep 2026-07-12)
> The **thread-follow** track (closed 2026-07-11, `d5e7b396`) shipped exactly Scope A's behaviour:
> it *pins a minted thread-follow* so the drill-cap can't eat it and makes the engine follow the
> person's own words on a shallow/thin answer instead of switching to a generic catalogue question.
> That is "drill, don't switch". **Before reopening this plan, confirm against thread-follow** —
> Scope A may be done. If so, re-scope this plan to the parts thread-follow did NOT cover: **B** (prefer
> grounded bank questions over generic catalogue ones) and **C** (don't pad / seed questions from
> low-confidence focus points). If A survives, it overlaps thread-follow and needs de-duping first.

## Current state
> ### 📋 2026-06-28 — Scope A locked; **test-strategy decision needed before phase files.**
> Diagnosis + mechanism located (free). The fix is planner-prompt-level, so the proof needs a planner run.
> **Open question for Carl:** can we drive it via the **scripted persona / replay** path **offline (free)**,
> or do we use the pre-approved **~$0.35 paid scripted run** to verify? I'll check whether the scripted lane
> can reproduce the drift from fixtures before spending. Phase files get written once the test path is set.

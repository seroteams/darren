# Phase 3 — A hard team is not a hard week

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Finding:** F4

## Goal

When someone calmly describes a problem with their team, Sero stops reading it as **their** wellbeing
falling over.

## The problem

Machar, watching the meters after Daryl described a team conflict:

> "I don't think Daryl's wellbeing is impacted. I think it's the team and he's just not done anything
> about it yet. So the wellbeing score is quite a red flag and maybe it shouldn't be. It's not his
> necessarily personal wellbeing. Maybe the score is quite heavy."

Four separate things make that worse than it needs to be:

**a) The axis definition has no person-versus-situation boundary.**
[content/axes.json](../../../../content/axes.json) tells the model wellbeing means *"running hot, masked
fatigue, drift toward burnout"*. A person describing colleagues not pulling their weight reads as
"running hot" under that wording, with nothing to say otherwise.

**b) The guard that would catch it is scoped to questions that never run here.**
[plan-turn.md:141](../../../../content/prompts/plan-turn.md) says do not score wellbeing negative for time
pressure without stated strain — but only on `purpose: competency` questions, and competency questions
are banned in the relational arcs where bi-weeklies actually run. It could not have fired.

**c) Every real correction happens after the meeting.** `<wellbeing_evidence_rules>`
([final-evaluation.md:191-197](../../../../content/prompts/final-evaluation.md)),
`WELLBEING_TRANSCRIPT_EVIDENCE` ([reviewer.ts:69](../../../../backend/engine/reviewer.ts)) and the confidence
downgrade all run at the briefing stage. The live meter Machar was watching has none of it. Note the
irony: the briefing rules **ban** the exact phrases (`running hot`, `drift toward burnout`) that
`axes.json` hands the model as the definition.

**d) Two display bugs make a small negative look like a red flag.**
- The app seeds wellbeing and engagement at **−1** while the engine seeds all four at **0**
  ([axes.js:20-27](../../../../admin/src/ui/axes.js), duplicated at
  [briefing.js:279](../../../../admin/src/stages/briefing.js)). The comment claims it mirrors the backend. It
  does not. **Confirm on screen first** — the coach panel may mask it by showing an axis as unrated
  until it moves. If it does reach the screen, wellbeing starts negative before a word is said.
- The turn's note is attached to **every** axis that moved
  ([coach-panel-state.ts:50](../../../../admin/src/ui/coach-panel-state.ts)), so a sentence about a delivery
  snag becomes the "why" underneath Wellbeing.

## Changes

- [content/axes.json](../../../../content/axes.json) — wellbeing gains the boundary: this axis reads **the
  person's own state**, not the difficulty of what they are describing.
- [content/prompts/plan-turn.md](../../../../content/prompts/plan-turn.md) — widen the rule at line 141 off
  `purpose: competency` so it covers every question: a described team, process or delivery problem is
  not by itself a wellbeing negative unless the person names how it felt. Route it to `clarity` or the
  note. **This half rides Phase 4's paid run** rather than buying a second one.
- [admin/src/ui/axes.js](../../../../admin/src/ui/axes.js) + [briefing.js](../../../../admin/src/stages/briefing.js) —
  one seed, matching the engine, defined once instead of twice.
- [admin/src/ui/coach-panel-state.ts](../../../../admin/src/ui/coach-panel-state.ts) — the note stops
  claiming to be the reason for every axis that moved.
- **A detect-only gate**, following the `RATIONALE_ARC_LEAK` pattern exactly
  ([golden-checks.ts:195-241](../../../../backend/engine/golden-checks.ts), wired in
  [evals/trust-checks.ts](../../../../evals/trust-checks.ts), registered in
  [rule-registry.ts](../../../../content/prompts/rule-registry.ts)): flag a negative wellbeing delta booked
  against an answer with no stated strain. **It flags, it never rewrites** — house rule. That is how we
  find out whether this keeps happening instead of guessing.

## Not in this phase

- Red/amber/green banding on the meters. There is none today (a −1 and a −10 differ only in bar
  length) and adding it is a design decision, not a bug fix.
- Changing what the briefing says about wellbeing. Those rules are already right.
- Re-tuning any other axis.

## Done when

- [ ] A run where the person describes a team problem with no stated strain does **not** book a
      negative wellbeing delta. Proven from the run's own data, not from the prompt text.
- [ ] Wellbeing and engagement start at zero on screen, matching the engine. Screenshot.
- [ ] The "why" under an axis relates to that axis.
- [ ] The new gate fails when fed a bad case and passes on Machar's own run.
- [ ] `npm test` and `npm run typecheck` green; both linters green.
- [ ] Carl has tested the scenarios below and said go.

## Test scenarios — for Carl

`local > customer app (localhost:3000) > sign in as a manager > New 1:1 > run it > Live scores`

1. **Before anything is said** — start a 1:1 and open **Live scores** before answering anything.
   Every meter should sit at the middle. ❌ Not OK if Wellbeing or Engagement already leans negative.
2. **The team problem** — answer a question with something like **"the team's not pulling its weight
   on the beta and it's holding up the date"**, with nothing about how *they* feel. Wellbeing should
   not drop. Clarity may. ❌ Not OK if Wellbeing goes red off that answer alone.
3. **A real strain answer still lands** — in another run, answer **"honestly I'm shattered, I've been
   working most evenings"**. Wellbeing **should** drop. ❌ Not OK if it does not, because that would
   mean we have muted the axis rather than aimed it.
4. **The reason matches the meter** — look under any axis that moved. The line should be about that
   axis. ❌ Not OK if the same sentence sits under two different meters.

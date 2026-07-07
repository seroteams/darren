# CTOCheckJuly — does thin input give a good brief, questions & summary?

> 🧭 **New here / lost? Open [README.md](README.md) first** — it's the plain-words front door with a live
> checklist. This PLAN is the detailed overview.

**Goal:** Check the one thing that matters this early — when a manager gives only a *little* info, does Sero produce a genuinely good **brief**, good **questions**, and a good **summary**? Judged with CTO-level rigor and blunt verdicts, using real run outputs we already have (free).

**Driver:** Carl
**Created:** 2026-07-07 · **Rescoped:** 2026-07-07 (dropped *moat* + *learning-from-previous-runs*; narrowed to core output quality on thin input)

## The frame
Carl's early question, straight: *"check if the little info gives a good brief, questions and summary."*
So this isn't a scale or moat audit — it's a quality read on the **three things a manager actually sees**,
under the hardest real condition: **thin input.** The bar for "good" on thin input includes **honesty** — a
good output doesn't pad or invent to fill space; it stays as thin as the input and says so.

**Cost:** we already have **~58 real run logs** (`logs/**/05-evaluation/final.json`) and a purpose-built
**`thin-sam`** thin-input fixture (`evals/replay/thin-sam/`, `evals/golden/thin-sam.json`). So every phase
judges **real output for free** — no paid run unless Carl wants a fresh one.

## Done means
- 3 findings reports — **brief · questions · summary** — each judging real Sero output on thin input.
- Each gives: real quoted examples, a blunt **good / not-good-yet verdict**, and the **#1 weakness** to fix.
- The honesty lens throughout: does thin input stay honest, or get padded / invented?

## Phases
| # | Phase | The question | Status |
|---|---|---|---|
| 1 | Pick the thin case + trace it | What little-info run are we judging, and where do the 3 outputs come from? | 🔨 done → [findings-1.md](findings-1.md), awaiting Carl's read |
| 2 | The brief | Does the little info produce a genuinely useful, honest **prep brief**? | 🔨 done + proven → [findings-2.md](findings-2.md), awaiting Carl's read |
| 3 | The questions | Are the **questions** specific and grounded in the little given — or generic filler? | 🔨 done → [findings-3.md](findings-3.md), awaiting Carl's read |
| 4 | The summary | Is the **summary** a faithful, useful recap — not padded? | 🔨 done → [findings-4.md](findings-4.md), awaiting Carl's read |

⬜ not started · 🔨 in progress · ✅ done (read + green-lit)

## Current state
Rescoped 2026-07-07 per Carl (no moat, no learning-from-previous-runs; just: does thin info give good
brief / questions / summary). **Phase 1 done 2026-07-07** → [findings-1.md](findings-1.md): anchor case is
`thin-sam` (manager wrote one generic line), and the 3 outputs are mapped to their pipeline stages
(brief = `01b-preparation`, questions = `03-question-bank`, summary = `05-evaluation`).
**Phase 2 done + proven 2026-07-07** → [findings-2.md](findings-2.md): judged the brief on 3 real one-line
notes. Current model (`gpt-5.4`) brief is good + anti-over-diagnosis. Two old-model (`gpt-4o`) failures found
— an **invented "recent illness"** from "quiet in stand-ups", and a **`{{NAME}}` placeholder leak** — and
**both proven fixed**: re-ran the exact note live 3× (invented nothing), and the leak is hard-blocked in
`ai-client.ts`. Paid re-test ~6 `gpt-5.4` calls, under the ~$0.70 OK'd. Bonus finding parked: current-model
briefs ship with `validationPassed=false` (checker flags a field, content looks fine).
**Phase 3 done 2026-07-07** → [findings-3.md](findings-3.md): questions are good + grounded on *specific*
thin notes (Alex growth, thin-sam biweekly), but *vague* notes ("quiet in stand-ups") go generic AND — on the
old model — the fabricated "illness" reached an actual **question the manager would ask**. Key catch: the
Phase-2 "no invented fact" proof covered the **brief** stage; the **question-bank** stage is separate and
**untested** on the current model → that hallucination risk is still open for the questions.
**Phase 4 done 2026-07-07** → [findings-4.md](findings-4.md): the summary is the strongest output — on the
current model (`gpt-5.4-nano`) it refuses to fake a read on an empty meeting (won't run with the manager's
"seems down" hunch) and stays faithful + reframes on a real one. Structurally safer than brief/questions
because it's grounded in the transcript, not a thin note. Two tiny nits (awkward "Only zero turns" headline;
a −6 axis score on `axis_state_only`/low-confidence).

**All 4 phases done (free) — safe stopping point 2026-07-07.** Overall answer: **mostly yes, one open risk.**
Brief 🟢 (proven) · Summary 🟢 (proven) · Questions 🟡 — the one unproven thing is whether the **question
stage** still invents a fact on a *vague* note. **Next (Carl's call, when back): "prove the questions"
(~$0.35) to close it, then close the plan.** No money spent without his explicit go on that specific run.
One phase at a time; Carl green-lights before the next.

**Free by default:** all four phases read existing logs + the `thin-sam` fixture. If Carl wants a *fresh*
live run on a brand-new thin input, that's ~$0.35 and waits for his explicit go.

## Parked (deliberately not now)
- **The moat / defensibility** question — Carl: not yet.
- **Learning from previous runs** (data flywheel / continuity) — Carl: not yet.
- Cost / scale / vendor economics; the full engine failure-map — later if wanted.
- Fixing whatever the audit finds — findings first; fixes are their own tracks.

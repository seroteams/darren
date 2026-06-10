---
name: darren-method
description: "The team's standard way to run any multi-step build. Turn a plan into a docs/todo/<slug>/ folder — a PLAN.md overview plus phase files that each carry their own manual QA — then execute ONE phase at a time with a handoff between them. Trigger when the user says /darren-method, 'darren method', 'split this into phases', 'set up the todo folder', or hands over a plan to break down and work through. Use for any change big enough to need a plan; skip for trivial one-file edits."
argument-hint: "<plan file path, or feature name/slug>"
user-invocable: true
---

The Darren Method. The repeatable way we run multi-step work so it doesn't fall over.

**The whole point:** asking an agent to do 9 things — or even 3 — ahead of itself is waiting for problems. So: split the plan into phases, give each phase something a **product person** can manually QA, do **one phase per session**, hand off, and spread the work (and the tokens, and the QA attention) over days.

**The product owner runs the QA — not the agent.** Every phase file ends with a set of scenarios the product owner walks through and tests. The next phase does **not** start until they give the green light that they've tested them. The agent doesn't self-certify the work as done.

## When to use

- Any multi-step build or change big enough to warrant a plan.
- User says `/darren-method`, "darren method", "break this into phases", "set up the todo folder", or hands you a plan to work through.

**Skip it** for a trivial one-file change (just do it) or pure investigation/review (use `reviewrun` or just discuss).

## What it produces

```
docs/todo/<slug>/
  PLAN.md         overview — goal, what "done" means, the phase list, status
  phase-1.md      one phase — what changes, manual QA, done-when
  phase-2.md
  ...
  handoff.md      living state — written ONLY after a phase is finished + QA'd
```

`<slug>` = short kebab of the feature or date, e.g. `fixes-june-10`.

## This skill does two separate jobs. Never both in one run.

### Job A — Scaffold (turn a plan into the folder)

1. **Get the plan.** Arg may be a file path (read it) or a topic (use the plan already in this conversation). If there's no plan to work from, ask once — don't invent scope.
2. **Decide the phases.** Group the work into phases that *make sense*. Each phase must be:
   - **independently QA-able** by a non-technical person,
   - **small** — a phase is a few hours, not days,
   - **ordered** so earlier phases de-risk later ones.

   Prefer **fewer, well-bounded phases** over many tiny steps. If a phase can't be given a real manual QA step, it's too technical or too big — re-split it.
3. **Write `PLAN.md`** (template below).
4. **Write one `phase-N.md` per phase** (template below). Every phase MUST end with a **QA scenarios** section — concrete things the product owner walks through and tests themselves. If you can't write real scenarios, the phase is too technical or too big — re-split.
5. **Do NOT write `handoff.md` yet.** It's born when phase 1 is finished.
6. **STOP.** Tell the user to read the phases and confirm they're right *before* any phase is executed. Output:

   `Scaffold done: docs/todo/<slug>/ with PLAN.md + N phase files. Read the phases and confirm before I start phase 1.`

### Job B — Execute one phase

1. **Confirm which phase.** Default to the lowest-numbered unfinished phase per `handoff.md` (or `PLAN.md` status if no handoff yet).
2. **Check the context is clean.** If this session is long or muddled, say so and recommend kicking the phase off in a fresh session — a clean context is part of the method.
3. **Do that phase ONLY.** Do not drift into the next phase's scope, even if it's tempting and close.
4. **Hand QA to the product owner — don't self-certify.** Surface the phase's QA scenarios and whatever proof helps them test (screenshot, the thing to click, sample output). Then ask them to walk through the scenarios. Wait.
5. **Green-light gate.** Only once the product owner confirms they've tested the scenarios and they pass: flip the phase's status in `PLAN.md`, then write/refresh `handoff.md` (template below) so any agent or session can pick up cleanly.
6. **STOP.** No green light → no next phase. One phase per run. Recommend picking up the next phase in a fresh session — ideally another day.

## Templates

### PLAN.md

```
# <Title>

**Goal:** <one sentence — what's different when this is all done>
**Driver:** <who>
**Created:** <date>

## Done means
- <observable outcome>
- <observable outcome>

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | <name> | <one line> | ⬜ not started |
| 2 | <name> | <one line> | ⬜ not started |

Legend: ⬜ not started · 🔨 in progress · ✅ done (QA passed)

## Current state
<one line — which phase is next. Once phase 1 lands, this points to handoff.md.>
```

### phase-N.md

```
# Phase N — <name>

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜ not started

## Goal
<one sentence>

## Changes
- <concrete change — file or area>
- <concrete change>

## Out of scope (do NOT do here)
- <this belongs to a later phase>

## Done when
- [ ] <checkable outcome>
- [ ] Product owner has walked the QA scenarios below and given the green light

## QA scenarios — for the product owner to walk through
Test these yourself, as a product owner (not as an engineer). The next phase does not start until you green-light these.
1. **<scenario name>** — do <X>. You should see <Y>. ❌ Not OK if <Z>.
2. **<scenario name>** — do <X>. You should see <Y>.
3. **<scenario name>** — ...
```

### handoff.md

```
# Handoff — <slug>

**Updated:** <date>, after Phase <N>

## Where we are
Phase <N> (<name>) is ✅ done and QA-passed. Next up: Phase <N+1>.

## What just landed
- <what phase N changed>
- <files touched>

## How it was QA'd
<what was tested, the result, where the proof is>

## To pick up Phase <N+1>
1. Read [PLAN.md](PLAN.md) and [phase-<N+1>.md](phase-<N+1>.md).
2. <context the next agent needs — decisions made, gotchas>
3. Do that phase only. QA it. Update this file.

## Open questions / risks
- <anything unresolved>
```

## Rules

- **The product owner gives the green light, not you.** Your own checks don't count as QA passing. Surface the scenarios, let them test, wait for an explicit "tested, good". No green light → no next phase.
- **One phase per run.** Never execute phase N+1 in the same session as phase N unless the user explicitly says "keep going".
- **Every phase ends with QA scenarios** the product owner can walk through. No real scenarios → the phase is wrong-sized. Re-split.
- **Scaffold, then confirm, then execute.** Don't scaffold and run phase 1 in one breath.
- **`handoff.md` is the source of truth** for "where are we". Update it the moment a phase lands; don't create it before phase 1 is done.
- **Fewer, bigger-bounded phases beat many tiny ones** — but each must still QA alone.
- **Spread it out.** Encourage stopping between phases. The method is built for days, not one marathon — it spreads token use and keeps QA attention fresh.

## When NOT to use

- Trivial one-file change → just do it.
- Investigation / run review → use `reviewrun` or just discuss.
- A phase that's already scaffolded and just needs doing → that's Job B, not a re-scaffold.

---
name: darren-method
description: "The team's standard way to run any multi-step build. Turn a plan into a docs/todo/<slug>/ folder — a PLAN.md overview plus phase files that each end with QA scenarios — then do ONE phase at a time, with the product owner testing and green-lighting before the next phase. Trigger when the user says /darren-method, 'darren method', 'split this into phases', 'set up the todo folder', or hands over a plan to break down and work through. Use for any change big enough to need a plan; skip for trivial one-file edits."
argument-hint: "<plan file path, or feature name/slug>"
user-invocable: true
---

The Darren Method. How we run multi-step work so it doesn't fall over.

## The idea (in one line each)

- Split the plan into phases. One phase = a few hours of work.
- Do **one phase at a time**. Doing 3 or 9 ahead is asking for trouble.
- Each phase file **ends with test scenarios** for the product owner.
- The **product owner tests it** — not the agent. No green light, no next phase.
- Spread it over days. Saves tokens and keeps QA fresh.

## When to use

- ✅ Any change big enough to need a plan.
- ✅ User says `/darren-method`, "break this into phases", "set up the todo folder".
- ❌ A tiny one-file change — just do it.
- ❌ Looking at a run / investigating — use `reviewrun` or just talk.

## What it builds

```
docs/todo/<slug>/
  PLAN.md      the overview
  phase-1.md   one phase + its test scenarios
  phase-2.md
  ...
  handoff.md   where we are now (only after a phase is done)
```

`<slug>` = short name, e.g. `fixes-june-10`.

## Job A — set up the folder (from a plan)

- [ ] Get the plan (a file to read, or the one in this chat). No plan? Ask once.
- [ ] Split into phases. Each one: small, in a sensible order, and testable by a non-technical person.
- [ ] Fewer big phases beats lots of tiny ones.
- [ ] Write `PLAN.md` (template below).
- [ ] Write one `phase-N.md` per phase (template below). Each MUST end with test scenarios. Can't write real scenarios? The phase is too big or too techy — split it.
- [ ] Do **not** write `handoff.md` yet.
- [ ] **Stop.** Tell the user to read the phases and confirm before any work starts.

## Job B — do one phase

- [ ] Pick the phase — the next unfinished one (check `handoff.md`, else `PLAN.md`).
- [ ] If this chat is long or messy, say so — a fresh session is better.
- [ ] Build **that phase only**. Don't wander into the next one.
- [ ] Hand testing to the product owner: show them the scenarios + anything that helps them test (a screenshot, what to click). Then **wait**.
- [ ] Green light? Only then: update status in `PLAN.md`, write/refresh `handoff.md`.
- [ ] **Stop.** No green light = no next phase. One phase per run. Suggest the next one another day.

## Templates

### PLAN.md

```
# <Title>

**Goal:** <one sentence — what's different when this is all done>
**Driver:** <who>
**Created:** <date>

## Done means
- <thing you can see>
- <thing you can see>

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | <name> | <one line> | ⬜ |
| 2 | <name> | <one line> | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
<which phase is next — or "see handoff.md">
```

### phase-N.md

```
# Phase N — <name>

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
<one sentence>

## Changes
- <what changes — file or area>
- <what changes>

## Not in this phase
- <leave for later>

## Done when
- [ ] <thing you can check>
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **<name>** — do <X>. You should see <Y>. ❌ Not OK if <Z>.
2. **<name>** — do <X>. You should see <Y>.
3. **<name>** — ...
```

### handoff.md

```
# Handoff — <slug>

**Updated:** <date>, after Phase <N>

## Where we are
Phase <N> (<name>) is done and tested. Next: Phase <N+1>.

## What just landed
- <what changed>
- <files touched>

## How it was tested
<what was walked through, result, where the proof is>

## To pick up Phase <N+1>
1. Read [PLAN.md](PLAN.md) and [phase-<N+1>.md](phase-<N+1>.md).
2. <anything the next person needs to know>
3. Do that phase only. Get it tested. Update this file.

## Open questions
- <anything unresolved>
```

## The rules (don't skip these)

- [ ] **The product owner gives the green light — not you.** Your own checks don't count. Show the scenarios, let them test, wait for "tested, good".
- [ ] **One phase per run.** No starting phase N+1 in the same run unless the user says "keep going".
- [ ] **Every phase ends with test scenarios.** No real scenarios = phase is wrong-sized. Split it.
- [ ] **Set up, confirm, then build.** Don't set up the folder and run phase 1 in one go.
- [ ] **`handoff.md` is the truth** for where we are. Update it the moment a phase is done.
- [ ] **Spread it out.** Stopping between phases is the point — days, not one marathon.

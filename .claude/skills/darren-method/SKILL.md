---
name: darren-method
description: "The team's standard way to run any multi-step build. Turn a plan into a docs/workstreams/<slug>/ folder — a plan.md overview plus phase files that each end with QA scenarios — then do ONE phase at a time, with the product owner testing and green-lighting before the next phase. Trigger when the user says /darren-method, 'darren method', 'split this into phases', 'set up the todo folder', or hands over a plan to break down and work through. Use for any change big enough to need a plan; skip for trivial one-file edits."
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
docs/workstreams/<slug>/
  plan.md      the overview (lowercase — some old folders say PLAN.md; new ones don't)
  phase-1.md   one phase + its test scenarios
  phase-2.md
  ...
```

`<slug>` = short name, e.g. `fixes-june-10`.

## Job A — set up the folder (from a plan)

- [ ] Get the plan (a file to read, or the one in this chat). No plan? Ask once.
- [ ] Split into phases. Each one: small, in a sensible order, and testable by a non-technical person.
- [ ] Fewer big phases beats lots of tiny ones.
- [ ] Write `plan.md` (template below).
- [ ] Write one `phase-N.md` per phase (template below). Each MUST end with test scenarios. Can't write real scenarios? The phase is too big or too techy — split it.
- [ ] **Stop.** Tell the user to read the phases and confirm before any work starts.

## Job B — do one phase

- [ ] Pick the phase — the next unfinished one (check `plan.md`).
- [ ] Baseline first: run `npm run gate` (and `npm run smoke` if relevant) **before touching anything**, and note the result in `plan.md`. Anything failing now is pre-existing — not the new work's fault.
- [ ] If this chat is long or messy, say so — a fresh session is better.
- [ ] Build **that phase only**. Don't wander into the next one.
- [ ] Hand testing to the product owner: show them the scenarios + anything that helps them test (a screenshot, what to click). Then **wait**.
- [ ] Green light? Run the [phase-close](../phase-close/SKILL.md) ritual — it updates `plan.md`, STATUS.md, the badges and the logs together, then **commits the phase** (local only — no push/PR unless asked).
- [ ] Scope you cut or ideas for later go in plan.md's "Parked" section — not into this phase.
- [ ] All phases ✅? Move the folder to `docs/archive/done/<slug>/`.
- [ ] **Stop.** No green light = no next phase. One phase per run. Suggest the next one another day.

## Templates

(For audits / orientation write-ups — not builds — use [resources/findings-template.md](resources/findings-template.md).)

### plan.md

```
# <Title>

**Goal:** <one sentence — what's different when this is all done>
**Driver:** <who>
**Created:** <date>

## Done means
- <thing you can see>
- <thing you can see>

## Resolved before we start
<optional — answers dug out of the code BEFORE phase 1, so phases don't stall on unknowns>

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | <name> | <one line> | ⬜ |
| 2 | <name> | <one line> | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
<which phase is next, what just landed, how it was tested, baseline result>

## Parked
- <good idea, but not now — cut scope, follow-ups, nice-to-haves>
```

### phase-N.md

```
# Phase N — <name>

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
<one sentence>

## Changes
- <what changes — file or area>
- <what changes>

## Not in this phase
- <leave for later>

## Done when
- [ ] <thing you can check — verify the DESTINATION (query the DB, read the output file), not the routing>
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **<name>** — do <X>. You should see <Y>. ❌ Not OK if <Z>.
2. **<name>** — do <X>. You should see <Y>.
3. **<name>** — ...
```

Two sections get ADDED to the phase file as work happens (top of file, newest first):

```
## ✅ GREEN-LIT <date> — <what the owner walked> (commit <hash>)
   ← added at sign-off, by the phase-close ritual

## Built (<date>)
<what actually landed: file paths + offline proof — "npm test 42/42, typecheck clean">
   ← added when the build finishes, BEFORE the owner walks it
```

## The rules (don't skip these)

- [ ] **The product owner gives the green light — not you.** Your own checks don't count. Show the scenarios, let them test, wait for "tested, good".
- [ ] **One phase per run.** No starting phase N+1 in the same run unless the user says "keep going".
- [ ] **Every phase ends with test scenarios.** No real scenarios = phase is wrong-sized. Split it.
- [ ] **Set up, confirm, then build.** Don't set up the folder and run phase 1 in one go.
- [ ] **`plan.md` is the truth** for where we are. Update its statuses and "Current state" the moment a phase is done.
- [ ] **Green light = commit.** Approved work gets committed right away (local only), so tested phases never sit mixed in with new changes.
- [ ] **Spread it out.** Stopping between phases is the point — days, not one marathon.

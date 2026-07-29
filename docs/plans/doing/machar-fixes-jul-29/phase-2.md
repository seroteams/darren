# Phase 2 — The opening merges both agendas

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl · **Finding:** F2

## Built (2026-07-29)

| File | What changed |
|---|---|
| [sessions.service.ts](../../../../backend/api/services/sessions/sessions.service.ts) | `buildAgendaCheck` reworded to **"I've got a couple of things to cover. What do you want to get out of today?"** Naming the manager's own agenda first is what turns the second half into a real invitation instead of a formality. `axis_effects` unchanged. |
| [agenda.ts](../../../../backend/engine/agenda.ts) | New `shouldCarryAgendaForward()`. The decision used to be four inline conditions in the SSE handler; it is now one named, pure rule that consults the existing `isDecline()`. |
| [session-streams.ts](../../../../backend/api/services/sessions/session-streams.ts) | The carry-forward asks that rule instead of re-deciding. A decline now mints nothing **and** does not reach `session.totalBudget += 1`, so it cannot buy itself a turn. |
| [agenda.test.ts](../../../../backend/engine/agenda.test.ts) | New, 6 cases: real agendas carry, declines do not (Machar's exact "nothing specific" first), skips and blanks carry nothing, **a bare "nothing" is still a real answer** ("nothing has changed since we spoke" must survive), the summary quotes the head of the answer, and a source guard that the handler still consults the rule and keeps the budget bump inside the guarded block. |
| [sessions.service.test.ts](../../../../backend/api/services/sessions/sessions.service.test.ts) | The existing offline `start` test now also asserts the agenda check reaches the real intro queue with the new wording. This is a genuine end-of-pipe check: it reads the queue the runner is served from, not the constant. |

**Free checks:** `npm test` **204/204**, `npm run typecheck` clean, `lint:copy` and `lint:tokens`
pass.

**Deliberately not touched:** `content/demo/demo-run.json`, `content/config/persona-bench-v1.json`
and the `content/questions/_runtime/q_agenda_check*.yaml` files all still carry the old wording.
They are **records of runs that already happened**. Rewriting them would falsify history and the
runtime folder is generated artifacts anyway.

## ⚠️ What is NOT proven, and why

Neither half was watched happening in a live 1:1, and I could not do it for free:

- The carry-forward sits **inside `planStream`, after the paid `planTurn` call**
  ([session-streams.ts:447](../../../../backend/api/services/sessions/session-streams.ts)). There is no
  seam that reaches it without one model call.
- Seeing the reworded question on screen in the app means walking intake, focus points, preparation
  and the bank first, which is three more paid stages.
- `replay-scenario --fixtures-only` cannot help: it returns **recorded** model output.

So what stands is: the rule is tested with Machar's exact words, the wiring is guarded against the
exact regression that caused this, and the new question is asserted against the real assembled intro
queue. What is unwatched is the live turn counter not moving.

**Cheapest way to close that gap: fold it into Phase 4's single paid run** (~$0.35, already planned)
rather than buying a second one. Say the word and P4's run answers "nothing specific" at the opening
so you see both in one go.

**Committed local.** Nothing pushed.

---


## Goal

The first minute asks what **the employee** wants out of the session, and saying "nothing specific"
no longer costs a turn.

## The problem

Two separate faults in the same moment.

**a) The question only asks about topics, not what they want from the time.** Today it is
*"Before we get into it, anything you want to make sure we cover today?"*
([sessions.service.ts:68-80](../../../../backend/api/services/sessions/sessions.service.ts), alias
`q_intro_agenda_check`). Machar wanted it to hold both people's agendas at once:

> "What's Daryl brought to the one-to-one, what's Daryl's goals or targets for this one-to-one...
> because I might be thinking I want to discuss the two concrete outcomes, he might be thinking I
> also need to discuss ABC. A question that can merge the two, because you've got two people coming
> with maybe not exactly the same agenda."

**b) "Nothing specific" is treated as a real agenda and chased.** The carry-forward at
[session-streams.ts:440-453](../../../../backend/api/services/sessions/session-streams.ts) guards only on
`!skipped && text.trim()`, so it mints
*`At the start they wanted to make sure you covered: "nothing specific". Dig into it.`*
([agenda.ts:23-35](../../../../backend/engine/agenda.ts)) **and adds one to the budget**. Machar:
*"asking me the question on what does nothing specific mean is a wasted opportunity."*

Then, because the wasted turn is spent, the queue advances straight to the prep opener, which is why
he felt it *"gone from mere chitchat to suddenly right into the meat of it"*.

## Changes

- [session-streams.ts](../../../../backend/api/services/sessions/session-streams.ts) — the carry-forward
  consults the **existing** `isDecline()` from
  [read-quality.ts:65-69](../../../../backend/engine/read-quality.ts), which already lists `"nothing specific"`.
  A decline mints nothing and spends no budget. No new phrase list, no new concept.
- [sessions.service.ts](../../../../backend/api/services/sessions/sessions.service.ts) — reword
  `buildAgendaCheck` so it asks what they want out of the time, not only what topic to cover. Wording
  on the mockup. Its `axis_effects` stay `{engagement: 1, clarity: 1}`.
- Tests beside both, mirroring the existing layout.

## Not in this phase

- Anything about the prep opener itself, or how the arc proceeds after the opening.
- Question wording anywhere else. That is Phase 4.
- A second "merge the agendas" question later in the arc. One question, one job.

## Done when

- [ ] Answering the opening with "nothing specific" produces **no** follow-up about the word nothing,
      and the turn counter does not gain a turn. Verified in a real run, not from reading the guard.
- [ ] Answering it with a real agenda still carries that topic forward exactly as it does today.
- [ ] The opening question reads as the mockup.
- [ ] `npm test` and `npm run typecheck` green; `npm run lint:copy` green.
- [ ] Carl has tested the scenarios below and said go.

## What I need from you

**The wording is the decision.** Everything else is mechanical. Read it as if you were saying it out
loud to someone at the start of a 1:1:

> **"I've got a couple of things to cover. What do you want to get out of today?"**

Does that sound like you, and does it invite the other person in? If not, give me the line you would
say and I will use yours. That is the whole ask.

Machar's own suggestion, for reference: *"what would Daryl like to use the time for, in addition"*,
and *"what's Daryl's goals or targets for this one-to-one"*.

## Test scenarios — if you want to walk it

Running these costs money (a real 1:1 is several paid stages), so they are optional and the
[gap section](#-what-is-not-proven-and-why) says exactly what they would add.

`local > customer app > sign in as a manager > New 1:1 > pick anyone > run it`

1. **The decline** — at the opening question, answer **"nothing specific"**. The next question should
   move the conversation on. ❌ Not OK if Sero asks anything about the word "nothing", or if the
   step counter grows.
2. **The real agenda** — answer instead with something real, for example **"his workload and the beta
   test date"**. That topic should come back as the next question. ❌ Not OK if it is dropped.
3. **How it reads** — the opening question should ask what *they* want out of the time, not just what
   to tick off. ❌ Not OK if it reads like a checklist.

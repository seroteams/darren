# Phase 2 — The opening merges both agendas

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Finding:** F2

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

## Test scenarios — for Carl

`local > customer app (localhost:3000) > sign in as a manager > New 1:1 > pick anyone > run it`

1. **The decline** — at the opening question, answer **"nothing specific"**. The next question should
   move the conversation on. ❌ Not OK if Sero asks anything about the word "nothing", or if the
   step counter jumps by more than one.
2. **The real agenda** — start another 1:1 and answer the same question with something real, for
   example **"his workload and the beta test date"**. That topic should come back as the next
   question. ❌ Not OK if it is dropped.
3. **How it reads** — look at the opening question itself. It should sound like it is asking what
   *they* want out of the time, not just what to tick off. ❌ Not OK if it reads like an agenda
   checklist.

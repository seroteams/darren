# Handover — "all this should be on the brief already"

**For:** a fresh chat, to discuss with Carl before anything else is built.
**From:** the session that built the walk-in glance, 2026-08-03.
**Status:** the glance is **built, committed, unpushed, and NOT signed off.** Carl stopped it
here. Nothing is live. Do not start by building.

---

## What Carl said, and why he is probably right

After walking the finished feature he said:

> "ive made a big mistake, all this stuff should be on the brief already!"

He means the **prep brief** — the screen a manager reads *before* a 1:1, whose entire job is
to prepare them. His point: if last time's headline, what was agreed, and how it scored are
things you need before you walk in, they belong in the brief. Putting them on a panel next
to the brief's own two lines is treating a gap in the brief as a layout problem.

**The evidence says he is right, and it is sharper than he knows.** The brief is *already
fed* the previous 1:1, but only in one direction: **avoid**, never **inform**.

---

## The finding that should open the discussion

`content/prompts/preparation.md:211` feeds the brief a `{{PREP_HISTORY_BLOCK}}`, built by
`backend/engine/prep-history.ts:63`. It contains exactly two things from last time:

- the core issue the engine *proposed* last time, with its confidence
- the opener it *suggested*

and the prompt's instruction about them is, verbatim:

> "shown so this one opens NEW ground … Do not repeat or lightly reword its core issue or
> opener, approach from a different angle."

So the brief knows what it **guessed** last time, purely so it can guess differently. It has
never been shown what actually **happened**: not the briefing headline, not what the pair
agreed, not whether those things were done, not the axis reads. Those all exist on the
stored run (`briefing.headline`, `promises[]` with outcomes, `briefing.axes`) and the new
`prior-recap` read already projects them.

**That is the real gap, and it is an engine gap, not a UI one.**

---

## Where "last time" currently shows up

Four places, none of them the brief. Worth putting in front of Carl as a list, because the
sprawl is itself part of his point.

| Surface | What it shows | Where |
|---|---|---|
| Person page, "Since last time" | last run's agreed items + follow-through chips, axis trend | `frontend/src/stages/person-detail.ts:122` |
| Walk-in card, secondary button | "Check off last time's N things first" | `admin/src/stages/questioning-ready.ts:33` |
| Card zero (if you tap that button) | tap Done / Partly / Not done / Changed | `admin/src/ui/promise-checkin.ts` |
| **The glance (this session's build)** | last run's headline, agreed + outcomes, four scores | `admin/src/ui/coach-panel.ts` |
| The prep brief | **nothing about last time** | `frontend/src/stages/preparation-brief.ts:53` |

The brief's nine slots are: how sure is this · likely theme · open with · listen for · don't
assume · during the 1:1 · aim to leave with · for this kind of 1:1. Not one of them looks
backwards.

---

## The question for Carl

Not "should the glance move to the brief". The sharper one:

**Should the brief be told what actually happened last time, rather than only what it
guessed last time?**

Three shapes worth putting to him, and the trade-off is real in each:

| | What changes | Cost | Risk |
|---|---|---|---|
| **A. Feed the brief the facts** | `{{PREP_HISTORY_BLOCK}}` gains last time's headline, the agreed items with outcomes, and the axis reads. The brief writes with them. No new screen. | One prompt block, no new AI call. Prompt-size cap has ~50 chars of headroom, so something gives. | The brief already over-anchors; more history may make it repeat rather than re-open. Needs a paid run to see. |
| **B. Give the brief a look-back slot** | A tenth slot the manager reads, quoting last time's facts verbatim rather than the model's words. | Small. No prompt change. | Another slot on a screen Carl already wants shorter. |
| **C. Keep the glance, drop the duplication** | Leave the brief alone. The glance is where you look back, and the person page and the walk-in offer get pruned so it is said once. | Nothing new to build. | Does not answer his actual objection. |

A and B are not exclusive.

**Do not decide this alone. It is a product call and Carl asked for the conversation.**

---

## What is already built, and its state

Three commits on `main`, local only, **nothing pushed**:

| Commit | What |
|---|---|
| `20a40c80` | the Tests-gallery prototype (round 2, the glance) |
| `6d7cb743` | the real thing: `GET /sessions/:id/prior-recap` + the panel |
| `1c5eb696` | four honesty and resilience fixes found by a self-audit |

- `234/234` tests, typecheck, `lint:copy`, `lint:tokens` all clean. **£0, no AI call anywhere.**
- Read proved against real seeded database rows; the fence holds both ways.
- **Never walked by Carl on the real runner.** He stopped at this message.
- Full detail: [plan.md](plan.md), [phase-1.md](phase-1.md), [phase-2-3.md](phase-2-3.md), [audit.md](audit.md). Screens in [proof/](proof/).

### The reusable part, whatever is decided

`backend/engine/prior-recap.ts` projects a finished run down to headline + agreed + outcomes
+ axis reads, fenced to org/manager/person, with a file and a pg half. **Option A needs
exactly that projection**, just piped into the prep prompt instead of the panel. So the
backend is not wasted work under any option; only the panel is in question.

### If the panel is dropped

Revert `admin/src/ui/coach-panel.ts`, `coach-panel-state.ts`, `coach-panel.css`,
`admin/src/stages/prior-recap-read.ts`, and the wiring in `questioning.js` + `bank.js`. Keep
the engine and API halves. The Tests-gallery prototype can stay as the design record.

---

## Things a fresh chat must not get wrong

- **The prompt-size cap is effectively full.** `npm run lint:prompt-size`. Sharper-questions left ~50 characters of headroom on the planner sheet; the preparation prompt has its own budget. Raising a cap is a deliberate commit, never a side effect.
- **No paid run without Carl's yes.** Free checks first. Any prompt change should be proved on the free replay path (`node scripts/replay-scenario.js <id> --fixtures-only`) before spending anything, and the smallest paid proof is `node scripts/gate.js --only <case>` at about $0.35.
- **The brief's honesty rule.** Last time's brief is rendered to the model as "the engine's hypothesis then, NOT established fact". If option A ships, the same care applies to facts: what was *agreed* is a declared fact; what an axis *read* is an inference. They must not be fed as the same kind of thing.
- **Two hazards logged and not fixed** in [audit.md](audit.md): `loadPriorActions` has no timeout on the same critical path, and a merged roster person loses their history (a property of the `personId` fence, shared with `focus-history` and `prior-promises`).
- **Carl walks it, then it closes.** No self-certifying. Trackers (`STATUS.md`, `SERO_BOARD.md`) have NOT been updated for this work: the `phase-close` skill runs when he signs something off, and he has not.
- Lane board is clear. Preview servers `l11-api` (3991) and `l11-web` (3993) are in `.claude/launch.json` and may still be running.

## How to open the conversation with him

Lead with the finding, not the options: **the brief is already told what it guessed last
time, and told to avoid it. It has never been told what happened.** Then ask which of A, B
or C he wants, one decision, with the trade-offs above as a table.

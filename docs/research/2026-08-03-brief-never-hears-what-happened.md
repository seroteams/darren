# The prep brief is told what it guessed last time, never what happened

**2026-08-03.** One finding, kept because the work it belongs to is moving elsewhere.
Everything built around it was removed on Carl's word; this note is the only thing left.

## The finding

`content/prompts/preparation.md:211` feeds the brief a `{{PREP_HISTORY_BLOCK}}`, built by
`backend/engine/prep-history.ts:63`. It carries exactly two things from the previous 1:1
with the same person:

- the core issue the engine **proposed** last time, with its confidence
- the opener it **suggested**

and the prompt's instruction about them is, verbatim:

> "shown so this one opens NEW ground … Do not repeat or lightly reword its core issue or
> opener, approach from a different angle."

So the brief knows what it **guessed**, purely so it can guess differently. It has never
been shown what actually **happened**: not the briefing headline, not what the pair agreed,
not whether those things were done, not the axis reads. All of it is on the stored run
(`briefing.headline`, `promises[]` with their outcomes, `briefing.axes`) and is already
fenced per manager and person by the same pattern `focus-history.ts` and
`promise-history.ts` use.

## Why it matters

"Last time" currently surfaces in three places, and the brief is not one of them:

| Surface | Shows |
|---|---|
| Person page, "Since last time" (`frontend/src/stages/person-detail.ts:122`) | last run's agreed items + follow-through chips, axis trend |
| Walk-in card's secondary button (`admin/src/stages/questioning-ready.ts:33`) | "Check off last time's N things first" |
| Card zero (`admin/src/ui/promise-checkin.ts`) | tap Done / Partly / Not done / Changed |
| **The prep brief** (`frontend/src/stages/preparation-brief.ts:53`) | **nothing** |

The brief's nine slots (how sure is this · likely theme · open with · listen for · don't
assume · during the 1:1 · aim to leave with · for this kind of 1:1) all look forward. The
screen whose entire job is to prepare a manager is the one screen that never mentions the
last conversation.

Carl's words on seeing a panel built to fill that gap: *"all this stuff should be on the
brief already."*

## Care needed if this is picked up

- **Prompt size is the binding constraint.** `npm run lint:prompt-size`. Raising a cap is a deliberate commit, never a side effect.
- **Two kinds of fact.** What was *agreed* is declared; what an axis *read* is inferred. The existing block is careful to render last time's brief as "the engine's hypothesis then, NOT established fact", and the same care has to extend to these.
- **The brief already over-anchors.** More history could make it repeat rather than re-open. That needs a paid run to see, and free replay (`node scripts/replay-scenario.js <id> --fixtures-only`) first.
- **A fallback briefing has no real headline.** `buildFallbackBriefing` writes "Briefing generation failed…" into that field, so anything reading `briefing.headline` must check `generation_failed` or it will quote that line as what the meeting was about.

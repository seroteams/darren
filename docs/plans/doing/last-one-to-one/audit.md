# Self-audit — dependents, empty states, error states

**Run:** 2026-08-03, on Carl's ask, after phases 2 and 3 were built. £0.

Four real defects found, all four fixed and covered by tests. Two hazards noted and
deliberately left alone. Screens in [proof/edge-states.png](proof/edge-states.png).

## Fixed

### 1. A failed briefing was being quoted as what last time was about

When the reviewer's call fails, Sero writes a **fallback briefing** whose headline is
literally `"Briefing generation failed. This is a minimal record of your 1:1 with X, not a
written read."` (`reviewer.ts` `buildFallbackBriefing`). That is a headline, so the glance
accepted it, and the walk-in screen would have opened on that sentence as the summary of
the last conversation.

Skipping the run instead would be worse: it would silently show the meeting *before* it as
"last time". So the run is still last time, `summaryMissing: true` rides the payload, and
the panel says **"No written summary was generated for that 1:1, so there is no line to
carry in. What you agreed and how it scored are below."** The agreements and the live
scores from that run are real and still show.

### 2. A suggestion was wearing an agreement's clothes

A run that armed no promise loop falls back to the briefing's `next_actions`. Those were
filed under `owner: "manager"`, so they rendered as **"You"**, and their null outcome
rendered as an **"Open"** chip. Between them that said "you agreed this and did not do it"
about something nobody ever agreed to.

`owner` is now `null` for a suggestion, the label reads **"Sero suggested, never agreed"**,
and those rows carry no owner column and no chip.

### 3. A hung read could hold the walk-in card

The glance is read before the card paints, in the same `Promise.all` as the open actions.
A server that accepts the connection and goes quiet would have left the manager on an empty
screen with a meeting to run. The read now lives in `admin/src/stages/prior-recap-read.ts`
with a **2.5-second timeout**; failure, refusal and silence all resolve to "no glance".

### 4. The runner asked for a glance it could not show

`proceedBoot` fetched the recap even when the walk-in gate had already been seen (a
mid-meeting refresh), which is a request the server refuses anyway. It now only asks while
the gate is actually going up.

## Empty and error states, each one checked

| State | What happens | Held by |
|---|---|---|
| First 1:1 with someone | `{prior: null}`, panel is exactly today's | test + screen |
| Prior run never finished | skipped, the next candidate is tried | test |
| Prior briefing generated no headline | no glance (it claims no reason for the gap) | test |
| Prior briefing FAILED to generate | honest line, real agreements and scores kept | test + screen |
| No promises and no suggestions | the agreed block is omitted, no empty heading | test + screen |
| No axes | the score line is omitted | screen |
| Only a headline survived | one line, no stray separators | screen |
| Axis never read | "not read" chip, never a score it did not earn | test + screen |
| Malformed row on the wire | dropped, not drawn | test |
| Network failure | no glance, a console warning, the card still paints | test |
| Server hangs | 2.5s, then no glance | test |
| Mid-meeting refresh | no request, no glance, back on the question | test |
| Scripted / persona run | refused server-side | test |
| Guest run (no person, no manager) | refused server-side | test |
| Another manager's or another person's run | fenced out | proved against the real database |

## Dependents swept

- **Both apps.** `questioning.js` and `bank.js` are imported by the customer app too (`frontend/src/main.js:59`), so one change serves both. The customer bundle fence and both app builds pass in the suite.
- **Both header copies.** A test asserts the glance is wired in `questioning.js` *and* `bank.js`, that neither calls the endpoint unguarded, and that only the runner ends the glance.
- **Both stores.** `filePriorRecap` and `pgPriorRecap`, the same double-fence pattern as `pgPriorPromiseRun`.
- **The promise check-in** still works ahead of question 1; the glance stays up behind it and ends at question 1, not at the check-in.
- **Nothing reaches a prompt.** This is a read-only surface: no engine stage, prompt or evaluation payload consumes it, so the no-inference and no-training rules are untouched.
- No API reference doc lists these endpoints, so there was nothing to update.

## Noted, not fixed

- **`loadPriorActions` has no timeout.** It is on the same critical path and predates this work, so a hang there still holds the card. Out of this change's scope; worth its own look.
- **A merged roster person loses their history.** The fence is on `personId`, so if two people are merged the older runs no longer match. `focus-history` and `prior-promises` have exactly the same behaviour, so this is a property of the fence rather than a new fault.
- **The Tests-gallery prototype now differs from what shipped** (it still carries the layout switches and the word counter). It is the design reference for how the decision was made, so it stays as it is.

## After the fixes

`npm test` **234/234** (21 new across four files), `npm run typecheck`, `npm run lint:copy`,
`npm run lint:tokens`, all clean. £0.

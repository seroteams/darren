# Action review — offer it, don't gate the meeting

**Goal:** a repeat 1:1 opens on a real question again. Last time's agreed actions are offered on the walk-in card, one tap away, never forced.
**Driver:** Carl
**Created:** 2026-07-31
**Mockup:** https://claude.ai/code/artifact/c71c8cae-9f16-402f-889b-e48b93a109e8 — awaiting Carl

## Done means

- Starting a repeat 1:1, the first screen is still "Before you walk in" — now carrying a second, quieter button when there are open actions.
- "Start the meeting" goes straight to question 1. No form in between, in any arc.
- Choosing the review shows today's check-in card, and it no longer blocks: you can tap two of three and carry on.
- A "Something feels off" meeting never offers the review at the open. It appears at the recap instead.
- Nothing about how actions are stored changes. They stay scoped to the person, not the meeting type.

## Resolved before we start

Dug out of the code so no phase stalls:

- **The opener is real and was never deleted.** `pickOpener()` ([opener.ts:29](../../../../backend/engine/opener.ts)) chooses from 22 openers in [content/questions/_openers.json](../../../../content/questions/_openers.json), anchored to the arc's first phase. The queue is `opener → agenda check → intro questions` ([sessions.service.ts:511](../../../../backend/api/services/sessions/sessions.service.ts)). Card zero pushed it to second, it did not replace it.
- **The walk-in card already has a slot for a second control.** `wizardFooter()` takes `secondaryHtml` ([wizard-footer.ts:13](../../../../admin/src/ui/wizard-footer.ts)) — no new primitive needed.
- **The arc is on the client.** `store.ctx.meetingType` is the label string ([state.ts:79](../../../../admin/src/state.ts)), so the feels-off suppression needs no server round-trip.
- **Eligibility is already server-decided** — `checkinEligible` ([promise-checkin.ts:45](../../../../backend/api/services/sessions/promise-checkin.ts)) requires an empty transcript, a non-scripted run, no prior check-in, and both `personId` + `userId`. Phase 1 only changes *when the client asks*, not who qualifies.
- **The blocking gate is one function.** `allTapped()` ([promise-checkin.ts:36](../../../../admin/src/ui/promise-checkin.ts)) is what keeps "Start the questions" disabled. The write path already ignores untapped rows, so a partial submit is safe with no server change.
- **Button labels are locked.** Done / Partly / Not done / Changed — [VOICE.md:16](../../../../VOICE.md). Not up for redesign. (The `promise-checkin.css` header comment still says "Not yet" — stale, fix in passing.)
- **No new runner stage is possible.** `inferStage()` can only resume into BRIEFING — the ruling in [promises-before-recap](../../done/promises-before-recap/plan.md). Everything here lives inside QUESTIONING or BRIEFING.
- **There is a second, near-identical system.** The guided Monthly Check-in has "Catch-up" as a named first stage backed by the person-scoped `tracker_items` table. Same four chips, different store. Parked below, not touched here.

## Phases

| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The offer replaces the gate | Walk-in card gains a second button when actions are open; "Start the meeting" goes straight to Q1; the check-in stops blocking | ✅ |
| 2 | The feels-off exception | "Something feels off" never offers the review at the open; it appears at the recap instead | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state

**Phase 1 ✅ GREEN-LIT 2026-07-31** (Carl walked it and said go). The meeting now opens on the
arc's own question again; last time's actions are a quiet second control on the walk-in card, and
the check-in no longer blocks. Evidence + build record in [phase-1.md](phase-1.md).
**Next: phase 2 (the feels-off exception) — Carl's call to start.**
Board: [board.html](board.html) · [open it](https://claude.ai/code/artifact/8fa125e8-076f-4ac1-90ee-5351b4c07b70).
Committee record: `logs/committee/2026-07-31-action-review-placement.html`.

**Baseline before phase 1 touched anything:** `npm test` 220/220 green; `npm run typecheck` had
2 pre-existing errors in `session-streams.ts` / `sessions.service.ts`, both inside another chat's
live lane and both since fixed by that lane. After phase 1: **221/221, typecheck clean,
`lint:copy` pass.** `npm run gate` was not run: it is the paid one (~$3) and this phase changes
no engine code and no prompt. **Total spend on phase 1: £0.**

## Parked

- **Consolidating the two action stores** — `session.promises[]` (interview runner) and `tracker_items` (guided runner) do the same job with different field names (`action` vs `text`, `owner: report` vs `owner: member`). Its own call, its own plan.
- **The turn-1 planner feed** (promises-loop phase 3) that would let the opener *carry* an unfinished action in its own sentence. The richer answer; needs engine work plus a paid run.
- **Renaming card zero to "Catch-up"** so both runners use one word.
- **The empty coach panel on non-question cards.** The Support feed is per-question (`setQuestionHints`), so any interstitial leaves a near-empty right half. Real, and wider than this plan.
- **Rogelberg's order objection** — the manager's own promises are listed first by design. Worth revisiting once Carl has watched a manager use the offer.

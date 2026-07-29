# Machar's fixes — what the first corridor manager asked for

**Goal:** the next manager Machar sits with gets plainer questions with a sharper ask, an opening that
asks what the employee wants from the session, a wellbeing meter that can tell a hard week from a hard
team, and no internal QA form at the end.
**Driver:** Carl, from [Machar's session log](../../../validation/machar-2026-07-29.md) (2026-07-29)
**Created:** 2026-07-29
**Mockup:** https://claude.ai/code/artifact/aae6f4d2-d715-42cc-8229-2b177daf5926 — awaiting Carl

## Why now

Machar is sitting with managers 2 and 3 himself this week, on recorded calls, and lining up more
testers for the week after. Every finding below is something those managers would hit too. This is
the VALIDATION STAGE's only live experiment, so a fix that lands before those sessions is worth more
than the same fix a fortnight later.

## Done means

- The opening question asks what **the employee** wants out of the session, not just "anything to cover".
- Saying "nothing specific" no longer costs a turn on a question that digs into the word "nothing".
- Live questions use plain words and still push the work back onto the person. Machar's own test:
  the recap's *"what's one step you've taken so far?"* is the kind of thing he wanted **in the meeting**.
- A team problem the person describes calmly no longer flags **their** wellbeing red.
- The end-of-run prompt reads like Sero asking, not like an internal QA form.

## The distinction this whole plan turns on

Machar said two things that sound contradictory and are not:

| He said | He meant |
|---|---|
| the questions are "a bit bland" | the **ask** is soft. Nothing pushes the effort back onto the person. |
| "make it even more bland" than "conflict" / "hard to manage" | the **words** are heavy. Plain vocabulary, no loaded nouns. |

So the target is **plain words, sharp ask**. Getting one without the other fails him.

## Resolved before we start

Dug out of the code so no phase stalls:

- **`isDecline()` already exists** and already lists `"nothing specific"` verbatim —
  [read-quality.ts:38-49, 65-69](../../../../backend/engine/read-quality.ts). The agenda carry-forward at
  [session-streams.ts:440-453](../../../../backend/api/services/sessions/session-streams.ts) never consults it,
  so "nothing specific" is minted into *`At the start they wanted to make sure you covered: "nothing
  specific". Dig into it.`* ([agenda.ts:23-35](../../../../backend/engine/agenda.ts)) **and adds a turn to the
  budget**. That is F2's root cause and it is a guard, not a rewrite.
- **The wellbeing guard exists but fires in the wrong place.** The person-vs-situation rule at
  [plan-turn.md:141](../../../../content/prompts/plan-turn.md) is scoped to `purpose: competency` questions
  only — and competency questions are *banned* in the relational arcs where bi-weeklies actually run. So
  in Machar's run it could never have fired. Every other correction for this exact failure
  (`<wellbeing_evidence_rules>`, `WELLBEING_TRANSCRIPT_EVIDENCE`, the confidence downgrade) runs at the
  **briefing** stage, after the meeting. Nothing constrains the live score.
- **Suspected live bug, free to prove:** the app seeds wellbeing and engagement at **−1** while the
  engine seeds all four at **0** — [axes.js:20-27](../../../../admin/src/ui/axes.js) (comment claims it
  "mirrors backend axes catalogue"; [content/axes.json](../../../../content/axes.json) says otherwise) and a
  duplicate at [briefing.js:279](../../../../admin/src/stages/briefing.js). If that baseline reaches the screen,
  wellbeing looks negative before a word is said. **To confirm on screen in P3, not assumed.**
- **The live coach panel gives one turn's note to every axis that moved** —
  [coach-panel-state.ts:50](../../../../admin/src/ui/coach-panel-state.ts). A note about a delivery snag
  becomes the "why" under Wellbeing. Contributes to F4 independently of the score.
- **The plain-speech lint already exists** — [generate-questions.md:254-267](../../../../content/prompts/generate-questions.md)
  has an AVOID/PREFER table and a jargon ban. It governs the **pre-session bank only**. The live planner
  ([plan-turn.md:220-230](../../../../content/prompts/plan-turn.md)) has the opposite: a "weak → sharp" table
  pushing toward heavier language, with no plain-word counterweight. That asymmetry is F5.
- **`validateQuestionBeforeShow` is imported into [queue-manager.ts:21](../../../../backend/engine/queue-manager.ts)
  and never called.** Planner-written questions skip it. Worth knowing; not necessarily worth wiring
  (it is structural, not vocabulary) — noted so a later phase does not "discover" it again.
- **F1 has a named source.** The recap line Machar praised is `brutal_truth_manager`, and
  [final-evaluation.md:212-217, 229](../../../../content/prompts/final-evaluation.md) *instructs* it to write the
  question the manager should have asked. That intelligence has no path back into the live queue.

## Phases

| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The last screen stops interviewing them | The end-of-run prompt in Sero's voice, one question, return-intent signal kept | 🔨 built, awaiting walk |
| 2 | The opening merges both agendas | Asks what the employee wants from the session; "nothing specific" stops costing a turn | ⬜ |
| 3 | A hard team is not a hard week | Wellbeing scores the person, not the situation they describe; baseline and "why" bugs fixed | ⬜ |
| 4 | Plain words, sharper ask | Live questions lose the heavy vocabulary and gain the push-it-back move; recap's second summary separated | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Cost

P1–P3 are provable free (`npm test`, `npm run typecheck`, real-screen screenshots). **P4 needs one
paid run** — a prompt change cannot be proven by replay, because `--fixtures-only` returns recorded
model output. Smallest proof: `node scripts/gate.js --only <case>`, **about $0.35**. P3's prompt half
(the wellbeing rule) rides that same run rather than buying a second one. A second paid run needs
Carl's explicit yes.

## Current state

**Phase 1 built 2026-07-29 and awaiting Carl's walk** (Carl picked option A off the mockup: one
question, auto star rating dropped). Proof, screenshots and the honest gap are in
[phase-1.md](phase-1.md). Phase 2 does not start until he says go.

**Baseline recorded 2026-07-29, before any change: `npm test` 202/202 green, `npm run typecheck`
clean.** Both free. `npm run gate` was NOT run as a baseline: it is the paid one (~$3) and the free
suite already proves the tree is green. After P1: **203/203**, typecheck clean, both linters pass.
Board: [board.html](board.html).

## Parked

- **F3, the "hold this question" control — CUT by Carl 2026-07-29** ("forget this, don't add it").
  Recorded so it is not re-proposed: Machar wanted a way to say "we're not ready for that question
  yet". The research is done if it ever comes back — a "go deeper" button shipped ~1 Jun, was deleted
  17 days later with no recorded reason, and a better version exists on an **orphaned commit
  `63d899b8`** that never merged (it threaded `userDrillRequest` into the plan turn and emitted
  `[DRILL-BLOCKED]` rather than failing silently). One dangling reference remains in
  [plan-turn.md:195](../../../../content/prompts/plan-turn.md) — "unless the manager explicitly signalled to
  deepen the thread" — which nothing in the app can produce today.
- **F8, live scores looked stuck once.** Machar thought a score had not moved; it then moved. Carl:
  "it should change every time, if it's not, it's an error." Unconfirmed and possibly perception.
  Watch on the next sessions before treating it as a bug.
- **F9, the second agenda point was never reached** and the wrap-up read as "book another meeting".
  Machar himself called this down to the manager, not the tool. Revisit only if manager 2 or 3 reads
  the wrap-up the same way.
- **Carl's own note: "this is such a messy design now I look at it"** — the recap screen. Not scoped
  here; would be its own design pass.
- Wiring `validateQuestionBeforeShow` into the planner path (see above).

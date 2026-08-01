# Phase 1 — Say each rule once

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-08-01 — Carl walked a bi-weekly on sero.team: named a snag, the next question asked what he had done about it, and the session closed on an open forward-looking question (commit 6d86ec58)

## Built (2026-08-01)

`content/prompts/plan-turn.md`, system half only. Eight edits, all de-duplication:

| Repeat | What changed |
|---|---|
| Wind-down | `<thread_follow_rule>` limit → pointer. Planning rule 7's bullet → pointer; its closer-alias mechanics moved into `<wind_down_rule>`, which now states the final turn once and in full. |
| Agency after a snag | Planning rule 14 → pointer at `<question_craft>` THE TRIGGER. Its echo in the "Distilled" line removed. |
| Shallow gate | `<thread_follow_rule>` override now points at STEP 0. Planning rule 15's duplicate re-prompt cap removed. |
| No-inference | `<rules>` "Thin-notes floor" and "evasive answer is an event" deleted — both verbatim restatements of `<no_inference_rules>` 3 and 1. CALIBRATION's dangling reference re-pointed at `THIN_INPUT_CAUTION`. |
| Dedup | `<rules>` overlap line and `<output_contract>`'s "never include anything already asked" deleted; both now point at `<dedup_rules>`. |
| Closer | Covered by the wind-down consolidation above. |

**Size:** system block 35,136 → 34,063 chars, ~8,503 → ~8,243 tokens. **Saved 3.1%.**

**Honest note on the size.** Less than this plan implied. The six repeats were real but they were short restatements, not big blocks. The mass of the prompt is unique rules (`question_craft` 20%, `planning_rules` 18%, `assessment_rules` 15%) plus the examples phase 2 targets. Phases 1 and 2 together will land nearer 13% than 30%. A bigger cut means removing rules, which is a separate call for Carl.

**Offline proof:** `npm test` 227/227 · `npm run typecheck` clean · `npm run lint:copy` PASS · fixtures-only replay of `priya_biweekly_qspec` unchanged (its one FAIL, a preparation-stage `listenFor` capitalisation fixture, reproduces identically on HEAD without this change — pre-existing, not this work).

**Status:** ⬜ → 🔨

## Goal
Every rule in the planner's rule sheet lives in exactly one place, with the other copies replaced by a short pointer. No rule loses its meaning.

## Changes
- `content/prompts/plan-turn.md` — the `## System` half only. Six repeated rules merged to a single home each:
  - **Agency after a named snag** → keep the full statement in `<question_craft>` (THE TRIGGER, where the wording guidance lives); planning rule 14 becomes a one-line pointer; drop the two echoes in the Distilled line and the PLAIN WORDS table intro.
  - **Wind-down** → keep `<wind_down_rule>`; the four other mentions become pointers.
  - **Shallow gate** → keep `<assessment_rules>` STEP 0; the rest point to it.
  - **No-inference** → keep the six numbered rules; delete the two verbatim restatements in `<rules>`.
  - **Dedup** → keep `<dedup_rules>`; the rest point to it.
  - **Closer** → keep `<closer_craft>`; the rest point to it.
- `<decision_order>` stays exactly as is — it is the index, not a repeat.
- Nothing in the `## User` half changes. No engine code changes.

## Not in this phase
- Cutting the AVOID/PREFER tables or `<worked_examples>` (phase 2).
- The size-budget lint (phase 3).
- The cache fix and the model swap (parked in plan.md).

## Done when
- [ ] No rule from the "repeats found" table in plan.md appears in more than one place, checked by reading the file end to end.
- [ ] The system block is measurably smaller — record before/after token counts in the Built section.
- [ ] `npm test` and `npm run typecheck` clean; `npm run lint:copy` clean (no em dashes introduced).
- [ ] A fixtures-only replay produces a queue with the same shape as before (free, no API).
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

`live > incognito window > sero.team`

1. **A snag gets the follow-up** — start a bi-weekly 1:1 and answer one question with a problem ("the beta date is slipping because nobody owns the cutover"). The next question should ask what you have already *done* about it. ❌ Not OK if it asks you to describe the problem again.
2. **The last question lands the meeting** — run a session to the final question. It should be an open, forward-looking closer. ❌ Not OK if it reads like homework ("what will you commit to by next time?").
3. **A one-word answer gets one nudge, not three** — answer "fine". You should get one question asking for specifics, then the meeting moves on. ❌ Not OK if it keeps pushing on the same point.
4. **A check-in stays off competencies** — run a bi-weekly. No question should read like a performance assessment. ❌ Not OK if you get asked to rate or evidence a skill.
5. **Nothing repeats** — read the six questions of a full session. None should be the same question in different words.

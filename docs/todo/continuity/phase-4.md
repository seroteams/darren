# Phase 4 — Questions that remember

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜ · **Cost:** one paid walk, ~$0.35 (single case),
with Carl's yes. Build + offline checks $0.

## Goal
For a repeat 1:1, the question bank and planner know what this person was already asked — no
verbatim re-asks; deliberate follow-ups are labelled as such ("Last time you said X — how is it
now?").

## Changes
- Per-person asked-question memory: compact list of prior-session question stems (+ short answer
  gist) for the same person/org/manager, fed to the bank + planner as context.
- Deterministic dedup at save/plan time (the question-dedup design, finally landed where it counts):
  normalized-stem match + near-dup similarity check against this person's prior stems — a re-ask
  only survives if it's an explicit follow-up carrying the follow-up label.
- The `CROSS_SESSION_QUESTION_LEAK` gate is untouched: another person's/session's questions
  remain a hard fail. `CONTINUITY_SCOPE` (Phase 3) covers the question path too — test added.
- Follow-up questions render with a small "following up" tag in the meeting UI so the manager knows
  why it's back.

## Not in this phase
- Global bank cleanup of the historical near-duplicate files (parked in the dedup design — that's
  hygiene, not behaviour).
- Effectiveness-driven question selection (Phase 7 stats stay read-only).

## Done when
- [ ] Same persona, chained meetings: zero verbatim repeats from #1 in #2; follow-ups labelled.
- [ ] Dedup logic pinned by unit tests (exact + near-dup + "follow-up survives").
- [ ] Cross-person test: person B's bank never contains person A's stems.
- [ ] `npm test` + typechecks green; one paid chained case walked by Carl.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **No déjà vu (paid, ~$0.35, your go first)** — run meeting #2 for the Phase 3 persona chain.
   Read the questions asked: none should be word-for-word repeats of meeting #1.
   ❌ Not OK if the same question shows up unlabelled.
2. **The labelled follow-up (same run)** — at least where an agreed action existed, a question
   openly refers back ("Last time…") and carries the "following up" tag on screen.
3. **Different person, clean slate (free)** — fixtures replay for another persona: their questions
   show no trace of the first persona's session. The leak gate test proves it in CI too.
4. **The dedup is honest (free)** — I show you the stored stem list for the person and the one
   near-duplicate the dedup killed in tests — real strings, not a claim.

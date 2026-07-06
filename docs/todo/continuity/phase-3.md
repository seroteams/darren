# Phase 3 — Engine-native follow-up (the briefing reviews what was agreed)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜ · **Cost:** one paid walk, ~$0.70 (two chained
pipeline cases), only with Carl's per-run yes. Build + offline checks are $0.

## Goal
The engine gets a **dedicated prior-session input** — separate from manager notes — so the prep
anticipates follow-through and the final briefing honestly reviews it: "You agreed X. [Outcome:
partly.] In the meeting they said «…» — pick it up like this."

## Changes
- New structured input `prior_session` on the pipeline: agreed actions (verbatim), outcome answers
  (Phase 2), watch-fors, prior meeting date/type. Assembled from the same source as the Phase 1
  block — after the manager's edits, never around them.
- Prompt changes (the honest-work part) in `generate-focus-points.md`, `preparation.md`,
  `final-evaluation.md`: a clearly-fenced PRIOR SESSION block + rules — quote, don't infer; if the
  block is empty, say nothing about last time. Briefing schema gains a small `follow_through` read
  (per agreed action: what the transcript showed, quoted, or "not discussed").
- Two new hard gates in the trust checks, mirrored as tests:
  - `CONTINUITY_SCOPE` — prior-session content in any output must come from *this person's* prior
    run (same org + manager). Cross-person = fail (sits beside `CROSS_SESSION_QUESTION_LEAK`).
  - `CONTINUITY_EVIDENCE` — every follow-through claim traces to a stored agreed action, an outcome
    answer, or a transcript quote. State words ("disengaged", "checked out") = fail, same as the
    `INFERRED_STATE_LEAK` rules.
- Two golden fixtures: a return-visit case (rich prior session) and an empty-prior case.

## Not in this phase
- Question memory (Phase 4). Trends across 3+ meetings (parked). Any learning (Phase 7).

## Done when
- [ ] Offline: fixtures replay clean (`replay-scenario --fixtures-only`), `npm test` + typechecks
      green, new gates fire on planted violations (proven by tests).
- [ ] One paid walked chain (meeting #1 → meeting #2 for the same persona) reviewed by Carl:
      the #2 briefing follows through on #1's agreed action, quoting evidence — raw output, no masking.
- [ ] Cleared carry-forward → briefing contains zero "last time" content.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **The follow-through read (paid, ~$0.70, your go first)** — we chain a persona: meeting #1 agrees
   an action, you tap an outcome, meeting #2 runs. Open #2's briefing: it should name the agreed
   action, your outcome tap, and quote what the person actually said about it. ❌ Not OK if it
   invents progress, uses state labels, or mentions last time when you cleared the block.
2. **Cold start unchanged (free)** — run a first-timer through fixtures replay. Briefing has no
   "last time" language anywhere.
3. **Gate proof (free)** — I plant a cross-person carry and an inferred-state phrase in test
   fixtures; both gates fail loudly. You see the failing output, not a summary.
4. **Nothing hidden (free)** — compare the PRIOR SESSION block in the logged prompt
   (`01b-preparation/prompt.md`) with what you saw on intake. Word-for-word the same.

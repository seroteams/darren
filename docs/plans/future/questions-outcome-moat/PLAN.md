# Plan — Questions Outcome Moat (outcome capture)

**Status: 🅿️ PARKED** — do not start until alpha is producing real signals. Opened 2026-07-07.

**Why parked:** the moat is outcome data from *real* usage; there is nothing to learn from until live
managers are running 1:1s. Wiring the capture ahead of that is premature (Darren). This file just
holds the intent so it is never lost — see also `docs/decisions/0001-generated-questions-out-of-git.md`.

## The goal (one line)
Turn "3,806 regenerable questions" into "questions with a track record of what actually worked" — the
one asset a competitor cannot copy.

## What we capture (the moat)
Per question actually asked, log **deterministic signals only**:

| Field | What | Why |
|---|---|---|
| fingerprint | stable ID of the normalized question (collapses reworded near-dupes to one) | ties every outcome back to the *idea*, not the wording |
| context tags | meeting stage, target axis, role / seniority | learn "what works *when*" |
| asked / surfaced | was it actually put to the manager | separates generated from used |
| outcomeCheck | yes / partly / no / changed on the agreed action | the label — the whole moat hangs on this |
| axis movement | per-axis deltas already tracked | second deterministic outcome signal |
| timestamp | when | time-weighting; handles drift |

## Hard constraint
Deterministic, explicit signals **only**. Never train or infer on manager notes about employees
(no-inference ruling — see `docs/reference/prompt-improvement-spec.md`).

## Where it lives (go-live)
Database, keyed by fingerprint: one `questions` row per fingerprint (dedup at write time), one
append-only `outcomes` table joined to it. Automated backups. Vector store optional / later.

## Seeds that already exist (don't rebuild)
- `outcomeCheck` field on the session type (loop-closure capture) — **no longer consumer-less:
  the promises-loop track (doing/, P1 green-lit 2026-07-12) wires its consumer.** When this plan
  is un-parked, build on promises-loop's capture — don't add a second one. *(Updated 2026-07-15,
  future/ relevance audit; park-until-alpha logic re-confirmed — we're mid-validation.)*
- Per-axis `history` structure in `axisState`.

## Phases — TBD when un-parked
Left intentionally empty. Write phase files against the Darren Method when this is picked up around
alpha.

## Parked / follow-ups
- Generation-time dedup by fingerprint (currently a separate post-hoc dedup gate).
- Migrate generated questions from files → DB at go-live.

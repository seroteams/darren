# Phase 8 — Continuity loop

**Part of:** [PLAN.md](PLAN.md) · **Track:** C (value, runs in parallel) · **Status:** ⬜

## Goal
When a manager runs a **second** 1:1 for the same person, Sero remembers the first — it reviews the prior
meeting's actions and commitments instead of starting cold. This is where alpha value shows.

## Changes
- Carry prior-meeting context forward for the same person: last meeting's actions/commitments become part
  of the next meeting's prep and review.
- Person-profile linking so meeting #1 and meeting #2 are tied to the same individual.
- Respect the trust boundaries: a session never serves another session's vocabulary/questions verbatim
  (existing cross-session leak gate stays green).

## Not in this phase
- Multi-cycle history beyond the return visit (just #1 → #2 to prove the loop).
- Any new manager-facing analytics.

## Done when
- [ ] A second session for the same person reviews the first's actions/commitments.
- [ ] The cross-session leak gate stays green (no verbatim bleed between people/sessions).
- [ ] Product owner has tested the scenarios below and said go.

> **Note:** this is the flagged "next big item" (cross-session follow-up). It may split into its own
> sub-plan when we reach it. It runs in parallel with A/B so it's ready before alpha managers return.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **The return visit** — Run a 1:1 for a person, note an action. Later, run a second 1:1 for the *same* person. The prep should reference the first meeting's action/commitment. ❌ Not OK if it starts cold as if #1 never happened.
2. **No cross-bleed** — Run sessions for two different people. Neither should show the other's specific wording or questions. ❌ Not OK if person B's prep echoes person A's private detail.
3. **Right person** — The remembered history attaches to the correct individual, not the whole team. ❌ Not OK if two people's histories mix.

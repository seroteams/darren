# Phase 2 — Cut the examples down

**Part of:** [plan.md](plan.md) · **Status:** ⏸️ SKIPPED 2026-08-02 (Carl's call)

> **Skipped, not deleted.** Carl chose to go straight to phase 3. This phase was the weakest of the three: ~10% more off one stage, the plan's only paid check (~$0.35), and the most quality risk of any phase, because these examples are what teach the planner to word questions well. The scope below is intact if it is ever wanted. Note that phase 3's cap now sits on the phase-1 size, so starting this later means re-setting the cap afterwards.

## Goal
The example tables teach the planner how to word a question. Keep the ones that change its behaviour, drop the ones that just restate a rule already written above them.

## Changes
- `content/prompts/plan-turn.md`, `<question_craft>`:
  - **Weak → sharp table** (7 rows) — keep the rows that teach a distinct move (locate-and-cause, force a trade-off, ask for the negative, offer the opt-out, observation-first). Drop rows that duplicate a neighbour's lesson.
  - **Description → agency table** (4 rows) — keep 2, drop 2. All four make the same point.
  - **The "Distilled:" paragraph** — it summarises the table directly above it. Keep the summary or the table, not both.
- `<worked_examples>` (2 examples) — these teach scoring, not wording. Keep the deficiency-as-request one (it corrects a real, repeated mis-score); assess whether the flat/absent one still earns its place.
- Nothing else changes. No engine code changes.

## Not in this phase
- The size-budget lint (phase 3).

## Done when
- [ ] Every remaining example teaches something no other line in the prompt teaches.
- [ ] System block token count recorded before/after in the Built section.
- [ ] `npm test`, `npm run typecheck`, `npm run lint:copy` clean.
- [ ] **The one paid run for this plan:** `node scripts/gate.js --only biweekly-priya` (~$0.35). Compare verdict and metrics against the 30 July baseline (PASS, mean 0.80) and report both, pass or fail.
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

`live > incognito window > sero.team`

1. **Questions still sound sharp, not woolly** — run a full bi-weekly. Questions should name the actual situation and ask for something specific. ❌ Not OK if you get vague catch-alls ("how are things going with your projects?").
2. **Plain words, no jargon** — read all six questions aloud. Every one should be something you would actually say to a person. ❌ Not OK if any reads like coaching-speak or business jargon ("the underlying dynamic", "levelling up").
3. **A trade-off gets asked for** — mention you are stretched across two things. The follow-up should push you to choose or name what drops. ❌ Not OK if it only asks how it feels.
4. **The coaching hints beside each question still fit** — check the three hints on any question. They should point at something in *this* conversation. ❌ Not OK if they would fit any question ("listen carefully").

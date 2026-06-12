# Phase 2 — Stay-on-brief + diagnostics

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Keep the live conversation tied to the brief, so the engine stops adding questions the brief never pointed to (like the Q6 trade-off question in the Liam run) — while still following genuine threads the report opens. Then measure that the whole link is holding.

## Changes
- Pass the prep brief into the live turn planner (the part that re-plans questions after each answer), through both runtimes (CLI questioning loop + frontend plan handler).
- Teach the planner prompt one soft rule: a newly-added question that isn't a live follow-up to what the report just said must connect to the core issue or a listen-for point. Following the report's own threads always wins over staying on-brief.
- Add two diagnostics (numbers only, nothing blocks a run): `opener_link` (did the first real question match the brief?) and `on_brief` (how many questions stayed on the brief?). Show them in the gate output next to the existing diagnostics.

Files: `src/cli/stages/questioning.js`, `frontend/server/handlers/plan.js`, `src/queue-manager.js`, `prompts/plan-turn.md`, `scripts/lib/session-scores.js`.

## Not in this phase
- No new hard gate that fails a run — diagnostics only, so the golden baseline stays stable.

## Done when
- [ ] Off-brief planner-added questions stop appearing (unless the report opened that thread).
- [ ] Genuine live thread-follows still fire.
- [ ] `opener_link` / `on_brief` show up in the gate output.
- [ ] `npm run gate` and `npm run smoke` stay green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself, in a **manual** run (scripted persona runs freeze the question list, so they won't show this).

1. **No more wandering** — re-run the Liam-style scenario from Phase 1. Confirm there's **no off-topic question** like "how clearly are you naming trade-offs?" unless the report's own answer raised it. Every question should trace back to the decision-clarity brief.

2. **Threads still followed** — in a run, give an answer that names something concrete (a project, a person, a decision). The very next question should **drill into that** — staying on-brief must not kill live follow-ups.

3. **See the numbers** — after a clean run, I'll show you `opener_link = 1` and a high `on_brief` score in the output, so the link is visible, not just claimed.

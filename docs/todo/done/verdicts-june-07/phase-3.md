# Phase 3 — Briefing language

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The briefing talks like a person and fits the meeting it came from — no jargon, and it reads differently for a performance chat than a "something feels off" one.

## The problem
- **Maya** — the briefing headline used "review churn." Carl: *"nobody says review churn, it's not good language."*
- **Rachel** — *"output may not reflect the meeting type distinctly."* The briefing reads generic regardless of whether it was a feels-off check-in or a performance review.

## Changes
- **`prompts/evaluation.md`** — add a plain-language rule with a short banned-jargon list (so the model writes around it, rather than us find-and-replacing the output — keeps the engine honest).
- **`prompts/evaluation.md`** — make sure the briefing prompt knows the meeting type and its tone, the way the question prompt already does. Pass it through if it isn't already.
- Confirm the Jun 10 confidence / "don't assume" fix still shows in a fresh run (no new work expected — just verify).

## Not in this phase
- Arc stages (Phase 1) and question wording (Phase 2) are already done by now.

## Done when
- [ ] A fresh briefing avoids the jargon (no "review churn" and similar).
- [ ] Briefings for different meeting types read distinctly.
- [ ] "Confidence" and "don't assume" still appear in the prep brief.
- [ ] `npm run gate` and `npm run smoke` are green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself.
1. **Maya briefing** — run the Maya persona and read the briefing. The headline and bullets should say what's happening in plain words. ❌ Not OK if "review churn" or similar jargon is back.
2. **Two meeting types side by side** — run a "Something feels off" persona (Rachel) and a "Performance" one (Maya). The briefings should clearly read as different kinds of conversation. ❌ Not OK if they feel interchangeable.
3. **Prep brief still complete** — on any run, the prep brief still shows a "confidence" line (starts Low/Medium/High) and a "don't assume" line.

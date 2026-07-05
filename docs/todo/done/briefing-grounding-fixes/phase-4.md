# Phase 4 — Single-theme shrink rule

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
When a whole conversation is about one thing, the briefing should be short — not repeat that one thing in seven different fields.

## Why
On the Maya run the single readiness-gap finding was restated across the headline, both summary bullets, the understanding paragraph, both axis meanings, and both brutal-truth lines. The "say it once" rule exists but didn't shrink the output. A single-theme run earns a shorter briefing.

## Changes
- `prompts/final-evaluation.md` (`<write_economy>`): add that single-theme sessions MUST shrink — the headline states it once; summary bullets must each carry a *different* angle (cause / contradiction / manager move) or drop to one bullet; axis meanings must not restate the headline.

## Not in this phase
- Deriving length from a distinct-evidence count (Parked P5) — that's the fuller version.

## Done when
- [ ] On the Maya run, the briefing is ~30–40% shorter than before, with no real signal dropped.
- [ ] Multi-theme briefings keep their normal length (rule only bites on single-theme runs).
- [ ] `npm test` passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Shorter single-theme briefing** — replay the Maya run. The same point should appear once or twice, not in every field; overall noticeably shorter. ❌ Not OK if it's still the same length / repeats itself.
2. **Nothing important lost** — the headline, the next actions, and the one real finding should all still be there. ❌ Not OK if a genuine action or signal got cut.
3. **Multi-theme run unaffected** — a run covering two or three real topics should keep its fuller briefing. ❌ Not OK if the shrink rule wrongly trims a rich, multi-topic briefing.

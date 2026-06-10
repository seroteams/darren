# Phase 2 — Reword the flagged questions

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The three questions Carl called out sound like something a manager would actually say out loud — not coach-speak or a quiet note to yourself.

## The problem
Carl flagged these by name in the June 7 review:
- **Jordan** — "what does stronger ownership look like to you?" / "concrete step toward that in the next cycle?" → *"nobody talks like this."*
- **Grace** — "the next level of judgment you're reaching for", "influence you're not fully using yet", "one hard call you'll commit to making sooner" → *"shit question", "feels strange to ask them."*
- **Nina** — "What context were you holding in your head that didn't make it into the handoff?" → *"super hard question, not cool."*

They all live in the scripted bench, and several also exist as saved questions in the library.

## Changes
- **`config/persona-bench-v1.json`** — reword those questions in plain spoken language; keep the paired scripted answers making sense; bump `script_version`.
- **`questions/*.yaml`** — update the matching saved library entries with the same wording. (Never bulk-delete untracked files in `questions/`.)
- **`prompts/generate-questions.md`** — add these patterns to the "avoid" examples so the live engine stops generating them.

## Not in this phase
- Arc stages (Phase 1).
- Briefing wording (Phase 3).

## Done when
- [ ] The three questions read naturally; the paired answers still fit.
- [ ] The saved library versions match.
- [ ] `npm run gate` and `npm run smoke` are green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Read them cold** — look at the three reworded questions on their own. Would you say this to a person in a 1:1? ❌ Not OK if any still reads like a podcast host or a journal prompt.
2. **Grace run** — run the Grace persona. The growth questions should feel askable, not awkward. ❌ Not OK if the "influence you're not using" / "hard call" phrasing is still there.
3. **Nina run** — run the Nina persona. The handoff question should be answerable without making someone freeze. 
4. **Live generation** — start a manual Growth or Performance run (no scripted persona) and skim the generated questions. None should bring back the flagged phrasings.

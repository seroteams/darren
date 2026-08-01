# Planner prompt trim

**Goal:** the live session planner follows a shorter, non-repeating rule sheet — every rule stated once, in one place, with a size budget that stops it re-bloating.
**Driver:** Carl
**Created:** 2026-07-31
**Mockup:** none — no visual surface (prompt/engine only)

## Done means
- `content/prompts/plan-turn.md` system block is materially smaller and no rule is said twice.
- No rule is *lost* in phase 1 — only de-duplicated.
- A free check fails the build if the system block grows past its budget again.
- The gate still passes against the 30 July baseline (verdict PASS, mean 0.80).

## Resolved before we start

Measured from logged prompts + `cost.json` across 7 real runs (all free, no API calls):

| Fact | Number |
|---|---|
| plan-turn share of a run's cost | 59% |
| System block (the rule sheet), sent every turn | ~8,500 tokens |
| Numbered/bulleted rules in it | 61 |
| File size 10 Jul (right after the last trim) | 27,594 chars |
| File size today | 38,555 chars (**+40%**) |
| Growth in the last 3 days alone | +9,359 chars (**+32%**) |
| Stable context billed at full rate each turn | ~1,700 tokens |

**The repeats found (phase 1 targets).** Each is one rule stated in several places:

| Rule | Said in |
|---|---|
| Agency after a named snag | planning rule 14, `<question_craft>` THE TRIGGER, the "Distilled" line, the PLAIN WORDS §2 table |
| Wind-down / last two turns | `<wind_down_rule>`, planning rule 7 wind-down bullet, `<thread_follow_rule>` wind-down limit, `<living_plan>` precedence, `<closer_craft>` |
| Shallow-answer gate | `<assessment_rules>` STEP 0, `<thread_follow_rule>` shallow override, `<decision_order>` 4, planning rule 15 |
| No-inference | `<no_inference_rules>` 1 & 3, `<rules>` thin-notes floor, `<rules>` evasive-answer line, the hints bullet |
| Dedup | `<dedup_rules>`, planning rule 2, `<rules>` overlap line, `<output_contract>` "never include anything already asked" |
| Closer stays open | `<closer_craft>`, `<wind_down_rule>` final, planning rule 7 final bullets, `<question_craft>` late-stage line |

**Baseline (free — already on disk).** `logs/gate/2026-07-30T22-24-42-966Z/result.json` — verdict **PASS**, 1 ok / 0 regressed, case `biweekly-priya`, mean 0.80. We compare against this rather than burning a paid run to re-establish it.

**Cost plan.** Free checks every phase (`npm test`, `npm run typecheck`, `node scripts/replay-scenario.js … --fixtures-only`, `npm run lint:copy`). **ONE paid run** at the end of phase 2: `node scripts/gate.js --only biweekly-priya` (~$0.35). A second paid run needs Carl's explicit yes.

**⚠️ Lane clash — must be resolved before phase 1.** Session `c91a58a9` ("Coach hints that move with the meeting") holds `content/prompts/plan-turn.md` on the lane board, claimed 2026-07-31. That chat is also the source of much of the recent growth. Phase 1 cannot start until that lane clears or Carl says to take it.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Say each rule once | The six repeats above merged to a single home; no rule removed | ✅ |
| 2 | Cut the examples down | The two AVOID/PREFER tables and `<worked_examples>` reduced to the rows that earn their place | ⬜ |
| 3 | A size budget that holds | A free lint that fails when the rule sheet grows past its cap | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Board:** https://claude.ai/code/artifact/7c211d67-dc8b-43f9-8527-932cc334c6cb

Folder set up 2026-07-31. Nothing built.

**Baseline recorded 2026-07-31 (free, no API):** `npm test` 221/221 passed · `npm run typecheck` clean · gate PASS from 30 July (see Resolved above). No paid run spent yet.

**Lane:** Carl authorised taking `content/prompts/plan-turn.md` from session `c91a58a9` on 2026-08-01 after its phase 2 stayed open. The path moved to this plan's row in LANES.md. That chat's phase 2 touched the same file, so if it resumes, check for contention before editing.

**Phase 1 ✅ green-lit by Carl 2026-08-01** (commit 6d86ec58). He walked a bi-weekly on sero.team: a named snag drew an agency follow-up, and the session closed on an open question. Saved 3.1% of the system block. See [phase-1.md](phase-1.md) for the edits and offline proof.

**Next: phase 2 (cut the examples down) — not started.** Carl chose to stop after phase 1 rather than continue straight on. Before it starts, note the honest ceiling recorded in phase-1.md: phases 1 and 2 together land nearer 13% than 30%, because most of the prompt is unique rules rather than repeats. A bigger cut means removing rules, which is a separate call for Carl.

## Parked
- **The cache fix** (~10% off a run): ~1,700 tokens of unchanging context are billed at full rate every turn instead of the cheap cached rate. Mechanical, no wording touched. Needs a small change to the shared `ai-client` message shape, and one live call to confirm the cache boundary. Carl chose the rule trim over this on 2026-07-31.
- **The model swap** (~22% off a run): GPT-5.6 Terra replaces gpt-5.4 at 20% less; Luna replaces gpt-5.4-mini at 73% less. Parked until validation ends — swapping the engine mid-validation muddies the signal we are measuring. Model IDs in the OpenAI email are marketing names (Sol/Terra/Luna); the real API ids are unconfirmed.
- Trimming output tokens (the planner returns the whole replacement queue every turn, ~2,800 tokens/run). Changing that changes the contract — bigger job, separate call.

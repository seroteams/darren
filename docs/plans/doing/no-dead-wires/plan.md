# No dead wires — the engine uses everything it collects

**Goal:** Every piece of information Sero holds during a run reaches the place it matters: the prep brief lands in the final brief, and the live planner reads your notes, your words, the answer-quality signals and the vocabulary guide, then rewrites its plan from the conversation.
**Driver:** Carl
**Created:** 2026-07-30
**Mockup:** none — no visual surface (engine and prompts only)

## Done means
- The end-of-meeting brief answers "you set out to X, and here is what happened" honestly.
- A note typed mid-meeting can shape the next question and shows up in the final brief.
- Two thin or dodged answers in a row visibly change the engine's tack.
- The question list stops feeling pre-written: stale questions get rewritten in the report's own words.
- Run cost stays within about +$0.03 (~15%) of today's $0.16-0.20, with zero new AI calls.

## Resolved before we start
- Full input-to-output trace: docs/reports/engine-input-map.html (committed 274306fa).
- Cost baseline measured (logs/july 29-30 runs): plan-turn is 61% of spend; its prompt has a ~9.8k-token cached prefix ending at `</session_context>`. Statics go before that boundary (near-free), per-turn additions after it (billed 6x, capped ~300 tokens).
- Committee convened, unanimous with two folded-in additions: logs/committee/2026-07-30-no-dead-wires.html.
- Mid-run notes are stripped from evaluation ON PURPOSE (old tester-note leak, notes-format.ts:45-51) — phase 4 reverses that for real runs only, keeps it for QA runs.
- Thread-follow was rebuilt today by another chat (commit 0d66421c, model-written follow-ups) — all planner work builds on that.
- Approved master plan: C:\Users\User\.claude\plans\okay-everything-needs-to-sorted-tome.md

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Plan meets reality | Prep brief reaches the final brief; recap says what happened to your plan | ✅ |
| 2 | The planner learns the room | Intake note, vocabulary guide, answer-quality tags and score levels reach the live planner | ✅ |
| 3 | The living plan | The queue rewrites and reorders itself from the conversation; prep-opener pin releases | ✅ |
| 4 | Notes flow everywhere | Mid-meeting notes reach the next question and the final brief | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phases 1-3 ✅ GREEN-LIT by Carl 2026-07-30 (his "a" three times). P1 commit 4f85e144 (live in build 4f85e14); P2 commit 4117b5b0; P3 commit 15aa9959 (both committed local, ship next go-live). P3 paid proof: gate case machar-biweekly-jun11 PASS, run cost $0.196, cache intact (8,960 cached tokens on turns 2+), no grounding-dropped spike; total paid spend this plan ~$0.20, under the ~$0.35 estimate. Phase 4 (notes flow everywhere: the last phase) building now, all free checks. The 2 replay-fixture failures remain pre-existing (832d63da, chipped separately). Board: https://claude.ai/code/artifact/39c06832-a4ed-4c65-b091-2c6a75140847

## Parked
- Who-the-person-is personalisation and last-run promises into prep: need cross-run data; Carl parked cross-run learning this round.
- Axis-coverage score gate + closer flexibility in code: only if the paid gate case shows the prompt rules under-deliver.
- Mid-run bank refresh call ($0.013, costed): only if the gate case shows the living-plan mandate under-delivers.
- Machar F3 (hold/defer a question) and F4 (wellbeing over-fires): live in the user-test-fixes stream, not here.
- Dedicated "plan vs reality" recap card (UI): later option; phase 1 folds it into existing brief fields.

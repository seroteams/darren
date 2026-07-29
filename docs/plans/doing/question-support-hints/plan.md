# Per-question coaching support (hints, end to end)

**Goal:** the Support panel shows coaching written for THE QUESTION on screen, on every question, and those lines are stored with the question and travel to the browser.
**Driver:** Carl
**Created:** 2026-07-29
**Mockup:** none — the Support panel is already built and signed off (coach-panel Phase 2); nothing new is designed here.

## Done means
- Every question in a meeting shows 1–3 "How to ask" / "Listen for" lines written for that question.
- The prep-brief fallback ("From your prep brief... written for the whole meeting") is the rare exception, not the norm.
- Those lines survive a save and a reload — they are stored with the question, both in the database and in the file copy.
- Mid-meeting questions (the ones the engine invents while you talk, incl. "Following up on what you just said") carry their own lines too.

## Resolved before we start
What I found when I checked the live chain (2026-07-29):

| Link in the chain | State |
|---|---|
| Prompt asks the model for coaching lines | ❌ never — `generate-questions.md` has no hints instruction at all |
| Bank schema accepts them | ✅ built |
| Bank mint keeps them | ✅ built (`toHints`) |
| Saved to Postgres (`generated_questions.doc` jsonb) | ✅ built — jsonb, so no migration needed |
| Saved to the YAML file copy | ❌ the in-house YAML codec has no array support — it writes `hints: [object Object],[object Object]` (22 files on disk already look like this) and cannot read them back |
| Mid-meeting planner questions | ❌ `plan-turn` has no hints field in its schema or prompt, AND `reconcile-queue.ts` rebuilds every planner question from a fixed field list — so hints would be dropped there even if the model wrote them |
| Thread-follows ("Following up on...") | ❌ minted in code, no hints, no model call |
| The meeting's first 3 questions (intro set) + seeds + openers + closer + agenda carry-forward | ❌ hand-written static content and code-built questions; none carry hints |
| Wire → browser | ✅ built |
| Panel renders them | ✅ built |

So the panel is right and honest: it falls back to the prep brief because **nothing upstream has ever written a per-question line**. Both gaps were knowingly parked at coach-panel Phase 2 sign-off (2026-07-19) — this plan un-parks them.

Two corrections from the dependency sweep (2026-07-29), which reshaped the phases:
- **The YAML codec is not what blocks the live app.** Live runs hold the queue in memory and store to jsonb, so a taught prompt alone would light up the live Support panel. The codec fix matters for local/file-mode walks and for storing hand-written hints on static content — still needed, but not the live blocker.
- **The opening third of every meeting is static content.** Three intro questions are served first, before any generated one. Without hints on those, the prep-brief fallback would still be what Carl sees at the top of the meeting. That work moved into Phase 3.

## Touchpoints (swept, not remembered)
**Touched:** `content/prompts/generate-questions.md`, `content/prompts/plan-turn.md`, `backend/engine/questions.ts` (YAML codec), `backend/engine/queue-manager.ts` (planner schema), `backend/engine/queue-constants.ts` (`RawQueueItem`), `backend/engine/reconcile-queue.ts` (field carry — the silent-drop risk), `backend/engine/thread-follow.ts`, `backend/engine/closer.ts` + `backend/engine/agenda.ts` (code-built questions), `content/questions/_intro/**` (12 files), `content/questions/_seed/**` (8 files), `content/questions/_openers.json`, `admin/src/ui/coach-panel.ts`, the matching tests.

**Checked and NOT touched, with the reason:**
- `frontend/` (the member/customer app) — it has no questioning screen and never calls `/question`, so there is no employee-facing leak path to change. The meeting runs in `admin/`.
- `backend/db/schema.ts` / migrations — the question is stored as jsonb, so a new field needs no migration.
- `sessions.service.ts` wire literal, `coach-panel-state.ts` validation, the panel render — already carry hints correctly.
- `backend/engine/serve-checks.ts` (leak gates) — those police the employee briefing, not manager-only coaching.
- `admin/src/stages/tests/runner-v2.js` — the mock walkthrough with hand-written hints. Left alone deliberately; it is a design mock, not the live screen.
- Cassette/scenario replays — hints are an optional field, so old recordings keep parsing.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Bank questions carry real lines | The generation prompt writes 3 coaching lines per question; the YAML codec stores and reads them; the 22 corrupted files cleaned | 🔨 built |
| 2 | Mid-meeting questions carry lines | The planner writes coaching lines for every question it queues mid-meeting | 🔨 built |
| 3 | Every remaining question type | The meeting's first 3 questions, the seeds, the openers, the closer, the agenda carry-forward and the "Following up on..." follow-ups all carry lines; the panel labels where each line came from | 🔨 built |

⬜ not started · 🔨 in progress · ✅ done (tested)

## 🔴 Found mid-Phase-1 (2026-07-29) — a live regression that outranks this plan
Reading the real run logs to check the hints chain turned up something bigger, and it corrects the diagnosis above.

**The question bank stage has not produced a question since 2026-07-20.** Two independent lines of evidence:

1. **Run logs.** Of the runs since Jul 20, only 5 reached the questioning stage. Two were scripted persona runs, which skip bank generation by design — correctly excluded. The remaining **3 are live meetings, and none has a `03-question-bank` folder or a `03-question-bank` entry in `cost.json`.** Every run up to Jul 20 has both. Two of the three are today's runs, both about **Machar** — the validation manager. Their transcripts show every question sourced `seed` or `planner_added`; none `generated`.
2. **Disk.** The root question pool, where the bank saves what it generates, has **no file newer than 20 July**. The `_runtime` folder, written by the planner through the *same* save function on the *same* disk, has files from today. So saving works; the bank simply has not produced anything for 9 days.

**Correction to the first version of this note:** I said 23 runs were affected. Wrong — 18 of those never reached the questioning stage at all (abandoned before the bank would run), so they prove nothing. The accurate count is 3 live meetings, backed by the 9-day disk gap.

The fallback is by design (`generateBankWithFallback` catches and loads `_seed`) and it logs a warning, but nothing surfaces it — the meeting just runs on generic questions.

**What this corrects in the diagnosis above:** the model has been writing coaching lines all along. The Jul 20 bank response carried 3 hints on 10 of 10 questions, unprompted — the schema's optional `hints` field was enough. So the Support panel never changes because **the questions that carry hints are not being generated at all**, not because the model never wrote them. The prompt edit is now about governing their quality, not switching them on.

### Cause found and fixed (2026-07-29, one real bank call)
Reproduced the live conditions (all three boot caches hydrated) and made the exact bank call. OpenAI rejected it outright:

> **400** — Invalid schema for response_format 'question_bank': 'required' is required to be supplied and to be an array including every key in properties. **Missing 'hints'.**

The call runs with strict structured outputs, where every key in `properties` must also be in `required`. coach-panel Phase 2 (19 Jul) added `hints` to `properties` only. Every bank call has 400'd since; `generateBankWithFallback` caught it and served the 8 static `_seed` questions, with only a `console.warn` to show for it.

**Fix:** `hints` added to `required` (and pinned to exactly 3, matching the prompt) in [question-generator.ts](../../../backend/engine/question-generator.ts). **Verified with a second real call: 8 questions returned, all 8 carrying 3 question-specific hints.** Two calls total, about 2p (the rejected one billed nothing).

A regression guard now walks the whole schema and fails if any property is missing from `required`, so the next field added cannot repeat this ([question-generator.test.ts](../../../backend/engine/question-generator.test.ts)).

**Still open — the silence, not the bug.** The fallback swallowed a hard API error for nine days. Nothing told anyone. That is a separate decision for Carl (it was option B).

## Current state
Phase 1 built, awaiting Carl's walk-through (2026-07-29).

Built:
- **The regression fix** — `hints` in `required`, pinned to exactly 3, plus the whole-schema regression guard ([question-generator.ts](../../../backend/engine/question-generator.ts), [question-generator.test.ts](../../../backend/engine/question-generator.test.ts)).
- **The YAML codec stores and reads lists**, so `hints` survives a save and a read instead of writing `[object Object]` ([questions.ts](../../../backend/engine/questions.ts) + new [questions.test.ts](../../../backend/engine/questions.test.ts), 8 tests).
- **The prompt now governs the hints** — `<coaching_hints>` craft block, exactly 3 per question, at least one "how to ask" and one "listen for", a weak-vs-sharp table, and the no-inferred-states rule extended to hints ([generate-questions.md](../../../content/prompts/generate-questions.md)).
- The 22 corrupted `hints: [object Object]` lines stripped.

Proof: `npm test` 214/214, `npm run typecheck` clean, `npm run lint:copy` clean (baseline before the work: 211/211, clean). One real bank call returned 8 questions, all with 3 question-specific hints.

### All three phases built and walked (2026-07-29, Carl asked for the full flight)

**Phase 2 — mid-meeting questions.** `hints` added to the planner's response schema (and to `required`, the strict-mode rule that caused the outage) and to `RawQueueItem`; `reconcileQueue` now carries them into the rebuilt question, which is where they were being dropped in silence. A reworded question takes the planner's fresh lines, never the original's. Same whole-schema regression guard added for the planner.

**Phase 3 — everything else.** Hand-written coaching for all 12 intro questions, 8 seeds and 22 openers (no model cost, ever); `pickOpener` was rebuilding the opener field by field and dropping them, now fixed; the agenda carry-forward carries lines written into its builder; a thread-follow inherits the hints of the question it follows, tagged `hints_source: "inherited"`, and the panel labels them "From the question this follows up on" instead of passing them off as its own. A content test fails if any static question loses its lines.

**Proof — a full meeting walked in the browser against the fixed engine** ([live-walk-2026-07-29.md](proof/live-walk-2026-07-29.md)): 5 questions, **5 with their own coaching, and the prep-brief fallback did not appear once**. The five covered an opener, a planner-invented question and three reworded bank questions, so all three phases were exercised. `npm test` 214/214, `npm run typecheck` clean, `npm run lint:copy` clean.

**Honest gaps:**
- **No screenshot.** The Browser pane could not composite frames in this session, so the proof is a DOM-level capture of the rendered panel, not a picture of it.
- **The inherited label was not seen live.** No thread-follow fired in those five turns. That path is unit-tested only.
- **Nobody has judged the writing.** The coaching lines read well to me; whether a manager would actually say them is Carl's call.
- **The silent fallback still swallows failures** (option B, not chosen yet).

Board: https://claude.ai/code/artifact/2b559180-7f87-44e4-be28-65ed20813753

Cost note: Phase 1 adds ~+$0.01–0.02 per run (more output on the existing bank call — no new call). Phase 2 adds output to the existing per-turn planner call, so a small per-turn cost and a small latency bump on every question. No new API calls anywhere.

## Parked
- Rewriting the 22 corrupted bank questions with real coaching lines (Phase 1 cleans the broken field; regenerating them costs a paid run).
- Showing the source of a line in the UI beyond the existing brief-level label.

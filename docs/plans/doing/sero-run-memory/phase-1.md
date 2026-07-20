# Phase 1 — One read signal

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built — awaiting Carl's QA

## Built (2026-07-20)
- NEW `backend/engine/read-quality.ts` — `classifyAnswer(answer, note)` → skip/decline/thin/note; single home for the shallow/decline word-lists (`REPORTING_PREFIX`, `LOW_SIGNAL_WORDS`) that were duplicated across `delta-gates.ts` + `reviewer.ts`.
- Banked at the shared choke-point: `queue-manager.ts` `planTurn` returns `assessment.read` (skip-shortcut stamps `"skip"`); all three lanes write `entry.read` (`cli/stages/questioning.ts`, `session-streams.ts`, `persona-runs.runner.ts`).
- `reviewer.ts` `computeReadQuality` now CONSUMES the stored tag (classify-fallback for legacy runs) — split-brain gone; `delta-gates.ts` imports the shared constants, `isShallowAnswer` behaviour unchanged.
- `TranscriptEntry.read?` (`session.types.ts`); member-view projections (`run-history.ts` + `runs-store.ts`, kept in parity) expose the derived tag, never the internal note.
- Admin chip: `run-detail.ts` renders Good note / Thin / Skipped / Declined via the base `.chip` set; layout in `run-detail.css`.
- Proof (all free): `npm run typecheck` clean · `npm test` 160/160 · new `read-quality.test.ts` + `reviewer.read-quality.test.ts` 19/19 · fixtures replay unchanged (2 `listenFor` fails are pre-existing, confirmed on clean base) · chip rendered with the real admin CSS (mint/gold/plain/coral). Not yet clicked through the live admin app against a real run.

## Goal
Every answered turn gets one quality tag — Good note / Thin / Skipped / Declined — computed once in the engine, saved with the run forever, and visible as a chip in the run detail screen.

## Changes
- NEW `backend/engine/read-quality.ts` — pure `classifyAnswer(answer, note)` returning `"skip" | "decline" | "thin" | "note"`. Absorbs the shallow/decline word lists currently duplicated in `delta-gates.ts:6-47` and `reviewer.ts:~160-224` (keeps the `[SHALLOW]` note check so both agree).
- `delta-gates.ts` delegates to it — exports unchanged, existing tests must pass untouched (that's the no-behaviour-change proof).
- `queue-manager.ts` — `planTurn` returns `assessment.read`; the skip-shortcut early return (`:343-356`) stamps `"skip"`.
- `backend/shared/session.types.ts` — `TranscriptEntry.read?: TurnRead`.
- One line in each lane next to the existing identical writes: `cli/stages/questioning.ts:~168`, `session-streams.ts:~402`, `persona-runs.runner.ts:~132` → `entry.read = plan.assessment.read`.
- `reviewer.ts` — `computeReadQuality` uses stored `t.read`, classify-fallback for old transcripts; local word-list copies deleted; aggregate lands in the existing `health.json` write (banked via run_artifacts, zero schema change).
- `admin/src/stages/run-detail.ts` — per-turn chip (Good note / Thin / Skipped / Declined) per the approved mockup.

## Not in this phase
- No cross-run reads, no new tables, no origin tags, no prompt changes.

## Done when
- [ ] `npm test` + `npm run typecheck` green; delta-gates tests pass UNMODIFIED.
- [ ] `node scripts/replay-scenario.js --fixtures-only` — cassettes replay identically (the tag enters no prompt).
- [ ] A fresh run's transcript in the DB (`sessions.state.transcript[]`) carries `read` on every turn — checked at the destination, not the routing.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Chips on a real run** — Admin app > Runs > open any finished run. Every turn shows a small chip: Good note / Thin / Skipped / Declined. ❌ Not OK if any turn is chip-less or every chip says the same thing on a mixed run.
2. **A skip reads as Skipped** — Test-engine page > run a persona that skips questions (e.g. thin-answers). Open its run detail: the skipped turns chip "Skipped", the one-word answers chip "Thin". ❌ Not OK if a skipped turn chips "Good note".
3. **Old runs still work** — open a run from BEFORE this phase. Chips still appear (derived on the fly), nothing errors. ❌ Not OK if old runs lose their detail screen.

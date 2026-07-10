# Phase 3 — Briefing feedback tap

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Every live briefing captures a one-tap verdict at the exact moment of value: "Would you run this 1:1 differently now?" — Yes / No, plus an optional one-line comment.

## Changes
*(corrected 2026-07-10 after dependency check)*
- `admin/src/stages/briefing.js` (verified as the LIVE customer briefing — `frontend/src/main.js:47`) — a small, unmissable-but-polite card near the end with the one question, two buttons, optional text line. Design-system styles, 14px floor, one blue action rule respected. **Placed outside the `!store.user` guest branch** (`briefing.js:127-154`) so guests see it too; run id is already in scope (`store.sessionId`, used at `briefing.js:402-461`).
- Backend: the existing `feedback_notes` table **cannot carry this** (no run reference, no verdict field — `schema.ts:321-336`). Decision: add `runId` + `verdict` columns to `feedback_notes` (+ Drizzle migration) and a small write endpoint — keeps one feedback store, one inbox.
- Superadmin feedback inbox (`admin/src/stages/admin-feedback.ts`) learns to render verdict + run reference alongside existing notes.
- **Coordination:** lands after Phase 2 (shared `server.ts`/`shared/api.js` hunks); the migration goes in its own commit.

## Not in this phase
- Not on the re-read/history briefing views — live briefing only (the moment of value).
- No follow-up "what happened after the meeting?" question — parked until after Gate 1.

## Done when
- [ ] Tapping Yes/No writes a row in the database tied to the run id — verified by querying the DB after a tap (DESTINATION check).
- [ ] The answer appears in the superadmin inbox with a link/reference to the run.
- [ ] Skipping it is frictionless — the briefing works exactly as before if ignored.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **The tap** — finish a prep (guest or test account) and reach the briefing. You should see one plain question with Yes/No. Tap one, add a short comment, done — under 10 seconds. ❌ Not OK if it feels like a survey or interrupts reading.
2. **It landed** — open the superadmin feedback inbox. Your tap should be there, tied to that run. ❌ Not OK if it shows with no way to tell which 1:1 it came from.
3. **Ignorable** — run another prep and ignore the question completely. Nothing should nag, block or re-ask. ❌ Not OK if it demands an answer.

# Phase 1 — History into the prompt

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl's walk

## Built (2026-07-11)
- `backend/engine/focus-history.ts` (new) — fence (`historyRunMatches`: finished + same manager + same personId), mapper off `state.focusPointsResult` (the shipped result both stores persist — simpler than the response.json read plan.md named, same data), relational filter, block renderer, file-store read, store dispatcher (errors degrade to [] — history never blocks a prep).
- `backend/engine/focus-history.test.ts` (new) — 12 tests: fencing, mapping, relational filter, render.
- `backend/db/runs-store.ts` — `pgFocusHistory` (SQL pre-narrow on finished/org/user/person columns, JS wall = the engine's own `historyRunMatches`).
- `backend/engine/generate.ts` — `focusHistory` input, rendered into `{{FOCUS_HISTORY_BLOCK}}` in `buildMessages` (relational filter inside the render).
- `backend/engine/generate.test.ts` (new) — 4 destination checks on the exact assembled prompt bytes.
- `content/prompts/generate-focus-points.md` — history block in user input + "Freshness across sessions" rule (signal always beats freshness; past never named in output wording).
- `backend/api/services/sessions/session-runtime.ts` + `session-streams.ts` — both web call sites fetch history off the session's org/user/personId. CLI + persona paths unchanged (no identity → first-session line).
- Offline proof: `npm test` 122/122 (baseline was 120/120), `npm run typecheck` clean. No paid calls.
- Cost note for the walk: starting a prep in the app fires one small focus-stage model call (cents, not dollars) — that's the app's normal behaviour, not new spend from this change.

## Goal
When a prep starts for a person with past finished runs, the focus-points prompt shows what was focused on before, with a rule to prefer fresh ground unless the notes re-signal.

## Changes
- New `backend/engine/focus-history.ts` — `focusHistoryFor({ orgId, userId, personId, limit: 3 })` returns past finished runs' focus points as `{ id, label, category, meetingType, when }[]`, newest first. File store via run walk + `01-focus-points/response.json`; Postgres twin in `backend/db/runs-store.ts` (artifact read already exists at line ~493).
- `backend/engine/generate.ts` — `buildMessages` gains a `focusHistory` input; renders the `{{FOCUS_HISTORY_BLOCK}}`. When the new session is a relational arc, competency-category history entries are filtered out before rendering. Callers (web session focus stage, persona runner, CLI stage) pass history where identity exists; no identity → empty block.
- `content/prompts/generate-focus-points.md` — new `{{FOCUS_HISTORY_BLOCK}}` in the user input + a short freshness rule in proportioning: prefer points not covered in the listed sessions; a note that re-signals a covered theme ALWAYS beats freshness; never mention past sessions in `label`/`reason` text.
- Tests mirrored next to the new/changed files (test-first): history read (both stores, fencing, no-personId case), relational filtering of history, block rendering, placeholder never dangles.

## Not in this phase
- Any live/paid run — Phase 2.
- UI changes.
- Question-theme history (parked).

## Done when
- [ ] `npm test` + `npm run typecheck` clean; new tests prove fencing (other manager's runs excluded) and the relational history filter.
- [ ] `assembleFocusPoints` preview for a repeat-person context contains the history block byte-for-byte (destination check: read the assembled prompt, not the routing).
- [ ] A no-history context renders "(first session with this person)" — no dangling `{{…}}`.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light. All free — nothing here hits the API.
1. **History shows up** — pick a person who already has a finished run (Team page), start a new prep for them, and open the run in the admin stage view → "Focus areas" → Sent tab. You should see a "previously covered" section naming the last session's focus topics. ❌ Not OK if the block is missing or shows another manager's session.
2. **First-timer stays clean** — start a prep for a brand-new person. In the same Sent tab the section should say it's the first session — no leftover `{{FOCUS_HISTORY_BLOCK}}` text. ❌ Not OK if raw curly-brace text appears.
3. **No performance echo in a check-in** — pick a person whose last run was a Performance & feedback 1:1, start a Bi-weekly for them, open the Sent tab. The previously-covered list must show no competency topics (Quality, Speed, Ownership, etc.). ❌ Not OK if any appear.

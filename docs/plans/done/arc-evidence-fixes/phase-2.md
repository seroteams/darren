# Phase 2 — Question-count trims + length badge

## ✅ GREEN-LIT 2026-07-20
Carl approved via evidence-first review in chat (options A + B): trims + the Growth badge bump.
Proof stood in for a click-walk — `npm test` 164/164 incl. the new budget assertions, and the live
`/api/v1/meeting-types` endpoint the picker fetches now returns Growth "35 to 50 min".

All edits free (no OpenAI).

## Changes
1. **performance/type.ts** — `cause` phase `target_questions` 2 → 1. Arc budget 8 → **7**.
   (Research #4: a single task-directed cause question, framed on the four drivers —
   capability/clarity/context/capacity — avoids "why"-driven person-blaming.)
2. **growth/type.ts** — `anchor` phase `target_questions` 2 → 1. Arc budget 9 → **8**.
   (Research #6: length/pacing — GROW spine intact.)
3. **meeting-types.ts** — Growth `duration` "30 to 45 min" → "35 to 50 min" so the shown time
   honestly fits the count (Research #5; the trims already did the count side).
4. **index.test.ts** — budget assertions updated: performance 8→7, growth 9→8 (both `arcBudget`
   and `arcBudgetDefault`, label + slug forms).

Budget is single-sourced: web derives `totalBudget = arcBudget(label)` (sessions.service.ts:469),
CLI via `arcBudget()` (index.ts) — so both paths shortened together. New budgets: 6 / **7** / **8** / 6 / 6.

## QA scenarios
1. Proof: `npm run typecheck` clean, `npm test` 164/164 (includes performance=7, growth=8 checks).
   ✅ Pass: all green · ❌ Fail: any budget-assertion failure.
2. `local > admin (dev login) > New 1:1 picker` — Growth card reads "35 to 50 min".
   Verified via the live catalog API + picker template (`intake.js:407` prints `t.duration`);
   pixel screenshot blocked by the animated pulse dashboard wedging the Browser pane.

## Status
✅ Closed. Free checks green. Not pushed — ships next "go live".

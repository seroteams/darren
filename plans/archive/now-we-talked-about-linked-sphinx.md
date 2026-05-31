# Plan: "Go deeper" button — user-requested off-arc drill
**Version:** v1

## Caveman version

Add second button on question card: **"Go deeper"** next to *Record and continue* / *Skip*.

Behaviour:
- Click "Go deeper" → backend marks a `pendingDrillRequest` on session.
- Next planner turn sees the flag, emits one off-arc thread-follow on the just-answered thread (stage=null, source=`planner_added`).
- Arc progress untouched — excursion does not advance the arc.
- Flag clears after consumption. Next turn snaps back to normal arc-priority planning.
- Soft cap: if `OFF_ARC_DRILL_COUNT >= 3` already, planner honours one final drill then forces arc advance regardless.

UI rule:
- Button visible only when textarea has content (≥1 non-whitespace char).
- Shortcut: `Shift+Enter` triggers go-deeper (matches existing `Enter` for submit, `Esc` for skip).
- After a user-requested drill, the next question card shows a small "Returning to arc" hint above the textarea.

## Changelog
- v1: Initial plan.

---

## Context

Today the planner decides drills silently. Backend has rich machinery — `computeConsecutiveDrillCount`, thread-follow rules in `prompts/plan-turn.md`, off-arc tracking — but the user has zero affordance to say *"stay on this, I want more."* Two buttons only: submit, skip.

The user described the excursion intent: *"we have a flow that the system goes through, the arc — but we come off that arc to go deeper — but on continue, while deeper, we go back to the arc."*

This gives the manager a manual override when an answer opens something the model didn't drill on its own. Closes a real control gap and lights up the autonomous drilling that already happens server-side.

## Approach (recommended)

UI-only nudge via session flag. Planner reads `userDrillRequest` from `ctx` template var. **Zero new logic in `src/queue-manager.js` beyond adding one template replacement** — drill-cap heavy-ops workstream stays uncontested.

### Files to modify

**Frontend**
- [frontend/client/src/stages/questioning.js](frontend/client/src/stages/questioning.js#L88-L96) — add `Go deeper` button to `.field-actions`, wire `onSubmit(text, { goDeeper: true })`; add `Shift+Enter` handler; show "Returning to arc" hint when `store.lastTurnWasDrill` is true.
- [frontend/client/src/api.js:44](frontend/client/src/api.js#L44) — extend `submitAnswer(sessionId, answer, { goDeeper })` to POST `{ answer, goDeeper }`.

**Server**
- [frontend/server/handlers/answer.js:22](frontend/server/handlers/answer.js#L22) — accept `goDeeper` from body; if true, set `session.pendingDrillRequest = true`.
- [frontend/server/sessions.js:48](frontend/server/sessions.js#L48) — add `pendingDrillRequest: false` to the session state shape.
- [frontend/server/session-persistence.js:29](frontend/server/session-persistence.js#L29) — persist/restore `pendingDrillRequest`.
- [frontend/server/handlers/plan.js:61](frontend/server/handlers/plan.js#L61) — pull `userDrillRequest = session.pendingDrillRequest` and pass into `planTurn({ userDrillRequest, ... })`; after `planTurn` returns, clear `session.pendingDrillRequest = false`; include `userDrillRequest` in turn log written to `04-dynamic-answers/<turn>-turn.json`.

**Backend planner**
- [src/queue-manager.js:139-204](src/queue-manager.js#L139-L204) — extend `buildMessages` + `planTurn` signature with `userDrillRequest`. Add one new template replacement: `{{USER_DRILL_REQUEST}}` → `"true"` / `"false"`. No change to `computeConsecutiveDrillCount`, `computeOffArcDrillCount`, or any reconcile logic.

**Prompt**
- [prompts/plan-turn.md](prompts/plan-turn.md) — add new block near existing `<thread_follow_rule>` (after line 47):

  ```
  <user_drill_request>
  USER_DRILL_REQUEST: {{USER_DRILL_REQUEST}}

  If true, the manager has explicitly asked to go deeper on the answer they
  just gave. This overrides arc-advancement priority for THIS turn only.

  Behaviour when true:
  - Emit ONE off-arc thread-follow on the just-answered thread.
  - Set stage = null (excursion, does not consume arc target_questions).
  - source will be planner_added; purpose carries from the parent question.
  - Do NOT advance the arc this turn.
  - Drill-cap rules still apply: if OFF_ARC_DRILL_COUNT >= 3, return one
    final drill and queue arc-advancing items behind it.

  When false (default), ignore — plan as normal.
  </user_drill_request>
  ```

### Reused, not rebuilt

- Off-arc accounting via existing `computeOffArcDrillCount` ([src/queue-manager.js:128](src/queue-manager.js#L128)) — already tracks `stage=null planner_added` items session-wide.
- Thread-follow language already lives in `<thread_follow_rule>` — new block just gates *when* to fire it.
- Session persistence already handles boolean flags on the session object.

### What we are NOT touching

- `computeConsecutiveDrillCount` and drill-cap rules — heavy-ops owns these per PLAN.md.
- Arc structure, `src/meeting-arcs.js`, question signatures, axis effects.
- Reconcile logic, schemas, validators.

## Verification

1. Run server: `npm run dev` from `frontend/`.
2. Start a session, reach the questioning stage (after intake + focus-points).
3. Answer Q1 normally → confirm planner picks next arc question.
4. On Q2, type an answer, click **Go deeper**.
5. Check `logs/<run>/04-dynamic-answers/02-turn.json` — `userDrillRequest: true` recorded.
6. Q3 should be a drill on the Q2 thread: `stage: null`, `source: "planner_added"`, `name`/`description` follows the just-typed answer.
7. Answer Q3, click **Record and continue** (not deeper).
8. Q4 should snap back to the arc — pick the next under-served arc stage from `REMAINING_STAGES_JSON`.
9. Repeat go-deeper twice more in one session to force `OFF_ARC_DRILL_COUNT == 3`; verify a fourth click is honoured once but queue then force-advances.
10. Inspect `transcript.json` after run — `realized_deltas` for off-arc drills should still come through normally; `arc_progress` should equal arc question count minus excursions.

## Open question (deferred to implementation)

Should the "Returning to arc" hint live in this PR or a follow-up? It needs a one-shot session flag (`lastTurnWasDrill`) cleared on next planner turn. Either: include now as part of the questioning.js change (~10 lines), or ship the button first and add the hint after the first real-run validates the excursion behaviour.

## Routing note

This is ~8 files and touches contested-area prompt + backend. Per `HANDOFF.md`, this is heavy-ops execution. Light-ops can write the plan (this file) and seed a PLAN.md workstream; heavy-ops implements.

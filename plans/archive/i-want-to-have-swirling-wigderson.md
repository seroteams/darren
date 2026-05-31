# Plan v1 — Start Fresh button: route to Start, add to pre-Questioning stages

**Caveman summary (v1):** Fix Start Fresh in Questioning so it routes to START stage (not INTAKE). Add identical Start Fresh button to Intake, Focus points, Preparation headers. All four use `resetSession()` + `setState({stage: START})`.

## Changelog
- v1 (new) — initial plan, 4 file edits, ~+30/-2 LOC

## Context

Today the only Start Fresh button lives in Questioning header. It calls `resetSession()` then `setState({ stage: STAGES.INTAKE, substage: "NAME" })` — so user lands back on the Intake step-1 page instead of the Start screen (Recent runs / Start new run). User saw this in the screenshot: clicked Start Fresh, landed on "Who are you prepping for?" — wrong.

Two issues to fix together:
1. **Destination wrong.** Start Fresh should route to `STAGES.START`, the Start screen, where the user picks "Start new run" or resumes a past run.
2. **Button missing on pre-Questioning stages.** User wants the same escape hatch on Intake, Focus points, Preparation (decided via clarification). Eval/Briefing skip — run is past the work-loss point.

Note: `STAGES.START` mount already routes to `INTAKE/NAME` when user clicks "Start new run" ([start.js:117](frontend/client/src/stages/start.js#L117)), so the user still reaches Intake in one click — but only when they choose to.

## Files to modify

### 1. [frontend/client/src/stages/questioning.js](frontend/client/src/stages/questioning.js)
Line 65 — change destination:
```js
// before
setState({ stage: STAGES.INTAKE, substage: "NAME" });
// after
setState({ stage: STAGES.START });
```

### 2. [frontend/client/src/stages/intake.js](frontend/client/src/stages/intake.js)
- Import `resetSession` from `../state.js` and `confirmAction` from `../ui/confirm.js` (line 1–3).
- In header HTML (lines 37–41) add a right-aligned `Start Fresh` ghost button. Restructure header to `flex items-baseline justify-between` so eyebrow/step-label sit left, button sits right — mirrors Questioning pattern.
- After `host` is queried, attach click handler: `confirmAction({message:"Are you sure?"})` → if ok, `resetSession(); setState({ stage: STAGES.START });`.

### 3. [frontend/client/src/stages/focus-points.js](frontend/client/src/stages/focus-points.js)
- Stage currently has no header at all (lines 8–13). Add minimal header matching Preparation style: `<header class="flex items-baseline justify-between"><div><div class="eyebrow">Focus points</div></div><button class="btn btn--ghost js-start-fresh">Start Fresh</button></header>`.
- Wire same handler as Intake. SSE cleanup is already handled by `unmount()` ([focus-points.js:138](frontend/client/src/stages/focus-points.js#L138)) which `main.js` invokes on stage change — no extra teardown needed.

### 4. [frontend/client/src/stages/preparation.js](frontend/client/src/stages/preparation.js)
- Header at lines 11–14 already exists. Wrap existing `<div class="space-y-1">` (eyebrow + name) in a `flex items-baseline justify-between` container, append Start Fresh button on the right.
- Wire same handler. Same auto-teardown story via existing `unmount()` ([preparation.js:104](frontend/client/src/stages/preparation.js#L104)).

## Reused utilities (no new code)
- `resetSession()` — [state.js:49](frontend/client/src/state.js#L49) — already clears store + localStorage `seroSessionId`.
- `confirmAction({message})` — `frontend/client/src/ui/confirm.js` — already used by Questioning's two header buttons.
- `STAGES.START` — [state.js:4](frontend/client/src/state.js#L4) — existing stage constant; `main.js` already mounts `start.js` for it.
- Stage `unmount()` lifecycle handled by `main.js` lines 42–43 — closes SSE automatically on stage transition.

## Deliberately NOT doing
- No shared helper. 4 inline copies of `confirm → resetSession → setState` (~4 lines each) is less indirection than a `attachStartFresh()` helper for one-line gain.
- No button on Eval / Briefing. User's scope: pre-Questioning + Questioning only.
- No styling/CSS changes — reusing existing `btn btn--ghost` class.

## Verification
1. `cd frontend && npm run dev` → open app in browser.
2. Start a new run, fill Intake step 1. Confirm Start Fresh button visible top-right. Click → confirm dialog → click OK → lands on Start screen (Recent runs list visible).
3. Repeat from Focus points stage (header now present with button). Click Start Fresh → confirm → lands on Start.
4. Repeat from Preparation stage. Same.
5. From Questioning stage (existing button). Click Start Fresh → confirm → previously landed on Intake; now should land on Start.
6. Verify `localStorage.getItem('seroSessionId')` returns `null` after each Start Fresh (resetSession contract).
7. Eval and Briefing stages: confirm no Start Fresh button added (out of scope).

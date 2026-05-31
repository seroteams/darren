# Workbench-ify the UI — strip consumer chrome, density up

## Context

This is a workbench for iterating the meeting-prep engine. The current UI applies consumer-onboarding patterns — one-question-per-screen, scene-setting copy, kbd-hint chips, brand eyebrows, big breathing-room typography — to what should be a dense, fast iteration tool. Every screen the operator (you) clicks through delays the next engine run.

The dev badge floating in the corner is admitting the problem: the most useful info on screen (stage, file, endpoints) is hiding behind 11px monospace at z-index 9999 because nothing else in the layout knows it's a tool.

This plan reshapes the shell to match what it actually is — without touching the engine output rendering inside each stage (that's the product preview; leave it alone).

## Principles I'm working from

1. **Density over breathing room.** A tool wants fields-per-pixel, not pixels-per-field. h2 typography for a single text input is theater.
2. **Single screen for intake.** Five substages is consumer-onboarding; iteration speed demands one form.
3. **No brand chrome.** The operator knows what tool they're in. "Sero · 1:1 prep" doesn't need to appear on the page — it lives in the window title.
4. **Engine info promoted into the shell, not hidden in a corner.** The dev badge becomes part of the topbar. Always visible, never overlapping content.
5. **No teaching copy.** "Let's set the scene", "Their role as you'd say it out loud", "Enter or Continue to move forward" — out. The operator knows.
6. **Leave each stage's *output rendering* alone.** That's the eventual end-user preview. Only the shell changes.

## The redesign

### 1. Intake — single-screen form

Replace the 5-substage walkthrough in [intake.js](frontend/client/src/stages/intake.js) with one dense form. All fields visible, edit in any order, one Run button.

```
┌──────────────────────────────────────────────────────────┐
│ Name        [_____________]   Seniority [____________]   │
│ Role        [_____________]   Meeting   [▾ 1:1       ]   │
│ Notes                                                    │
│ [____________________________________________________]   │
│ [____________________________________________________]   │
│                                                          │
│ [ Run ]                                                  │
└──────────────────────────────────────────────────────────┘
```

**Delete:**
- `SUBSTAGES` array and the entire substage state machine ([intake.js:5, 52-58, 212-220](frontend/client/src/stages/intake.js#L5))
- Per-substage `COPY` object ([intake.js:7-32](frontend/client/src/stages/intake.js#L7-L32)) — replaced by static field labels in markup
- The header block: eyebrow, "Let's set the scene", step counter ([intake.js:37-41](frontend/client/src/stages/intake.js#L37-L41))
- The kbd-hint footer ([intake.js:43-45](frontend/client/src/stages/intake.js#L43-L45))
- `renderInput` / `renderTextarea` / `renderMeetingType` per-substage helpers — replaced by one form render
- `advance()`, `swapField`, `focusField` imports — no longer needed since there's no field-by-field flow
- All per-field `.hint` lines

**Keep:** validation (empty required → red), `getMeetingTypes()` to populate the meeting-type select, `startSession()` payload shape (it already takes all fields at once at [intake.js:222-237](frontend/client/src/stages/intake.js#L222-L237) — perfect, no API change needed), error handling.

**Meeting type:** becomes a native `<select>` populated from `getMeetingTypes()`. The card grid was pretty, but pretty is theater here. If you want to keep the card grid as a "rich select", that's fine — but it stays inline in the form, not its own substage.

End result: ~250 lines of stage code → ~80 lines.

### 2. Topbar — workbench info row

[session-topbar.js](frontend/client/src/ui/session-topbar.js) becomes the home for both the session context AND the engine metadata that currently lives in the dev badge. One 36px-tall row, three zones:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ●  Priya · Senior backend engineer · Senior · 1:1   │   INTAKE  intake.js  /api/meeting-types, /api/start   │   [reset]  │
└──────────────────────────────────────────────────────────────────────────────┘
   left: session context (empty until intake done)         center: engine meta (copy-on-click)                  right: reset
```

- Drop the `"Sero · 1:1 prep"` placeholder text entirely — the empty state shows a small idle dot and nothing else.
- The dot turns amber while an SSE stream is open, green when a stage completes, red on error. Tiny but the operator wants it.
- Center zone takes the dev-badge's stage / file / data endpoints, single-line. Click anywhere on that zone → copies the same text the dev badge currently copies (`stage X\nfile Y\ndata Z`).
- Right zone: a small `reset` button that clears localStorage `seroSessionId` and calls `resetSession()` (which already exists at [state.js exports](frontend/client/src/state.js) per [main.js:5](frontend/client/src/main.js#L5)).

### 3. Delete the dev badge

[dev-badge.js](frontend/client/src/ui/dev-badge.js) goes away entirely. Its `STAGE_META` table moves into [session-topbar.js](frontend/client/src/ui/session-topbar.js) (or a small shared module). Remove the import + mount at [main.js:7, 25-26, 49](frontend/client/src/main.js#L7).

No more `position: fixed; z-index: 9999` overlay. No more covering content.

### 4. Stage shells — drop the stage-name eyebrows

The topbar now says what stage we're in. Inside each stage, the duplicate stage-name eyebrow is noise.

- [intake.js](frontend/client/src/stages/intake.js) — handled in change 1.
- [preparation.js:12](frontend/client/src/stages/preparation.js#L12) — remove `<div class="eyebrow">Preparation</div>`.
- [bank.js:13](frontend/client/src/stages/bank.js#L13) — remove `<div class="eyebrow">Question bank</div>`.
- [eval.js:11](frontend/client/src/stages/eval.js#L11) — remove `<div class="eyebrow">Synthesising</div>`.
- [questioning.js:16](frontend/client/src/stages/questioning.js#L16) — remove `<div class="eyebrow">Questioning</div>`. Also remove the inline `<span class="kbd">Enter</span> submits` chip at [questioning.js:19-21](frontend/client/src/stages/questioning.js#L19-L21) — the shortcuts overlay at [questioning.js:42-46](frontend/client/src/stages/questioning.js#L42-L46) already shows this.
- [focus-points.js](frontend/client/src/stages/focus-points.js) — no top-level eyebrow currently. No change.
- [briefing.js](frontend/client/src/stages/briefing.js) — **keep** all eyebrows. Those are section headings inside the briefing output ("What stood out", "Where things sit", etc.), not stage labels. They're part of the product preview.
- [error.js:7](frontend/client/src/stages/error.js#L7) — keep "Something went wrong" (it's the only label on the error screen).

### 5. Visual density — shell only

Only the workbench shell (topbar + intake form) gets tighter type. The other stages render the eventual product preview; their typography stays as-is.

- Topbar font: 12px, monospace for the engine meta zone.
- Intake form labels: 12px uppercase tracked, inputs 14px.
- Buttons in the shell: 32px tall.
- Spacing in intake: grid with 12px gap, not `space-y-10`.

CSS additions go in [design.css](frontend/client/src/styles/design.css) under a new `/* Workbench shell */` section. Remove the existing `.session-topbar__placeholder` rules ([design.css:1156-1160](frontend/client/src/styles/design.css#L1156-L1160)) — no longer needed.

## Files to modify

| File | Change |
|------|--------|
| [frontend/client/src/stages/intake.js](frontend/client/src/stages/intake.js) | **Rewrite** to single-screen form. ~250 → ~80 lines. |
| [frontend/client/src/ui/session-topbar.js](frontend/client/src/ui/session-topbar.js) | **Rewrite** to host context + engine meta + reset. |
| [frontend/client/src/ui/dev-badge.js](frontend/client/src/ui/dev-badge.js) | **Delete.** |
| [frontend/client/src/main.js](frontend/client/src/main.js) | Remove devBadge import + mount + render calls (lines 7, 25-26, 49). Wire reset button to existing `resetSession`. |
| [frontend/client/src/stages/preparation.js](frontend/client/src/stages/preparation.js) | Delete line 12 eyebrow. |
| [frontend/client/src/stages/bank.js](frontend/client/src/stages/bank.js) | Delete line 13 eyebrow. |
| [frontend/client/src/stages/eval.js](frontend/client/src/stages/eval.js) | Delete line 11 eyebrow. |
| [frontend/client/src/stages/questioning.js](frontend/client/src/stages/questioning.js) | Delete eyebrow + inline kbd chip in header (lines 14-22). |
| [frontend/client/src/styles/design.css](frontend/client/src/styles/design.css) | New workbench-shell styles; drop dev-badge + topbar-placeholder rules. |

No backend changes. No new endpoints. `/api/start` already accepts the full payload in one call.

## Verification

1. `npm run dev` → both server and Vite up.
2. Open the app. Expect:
   - Topbar shows an idle dot on the left, `INTAKE  stages/intake.js  /api/meeting-types, /api/start` in the center, `reset` on the right.
   - No corner overlay anywhere.
   - Single intake form: Name / Role / Seniority / Meeting (select) / Notes, all visible, focus on Name.
3. Tab between fields → focus moves linearly. Type values. Click Run.
4. Topbar updates: left zone now shows `Priya · Senior backend engineer · Senior · 1:1`; center zone updates to `FOCUS_POINTS  stages/focus-points.js  /api/focus-points/stream`; idle dot turns amber while SSE is open, green when done.
5. Click the center zone → clipboard contains the multi-line meta string (same format the dev badge used).
6. Walk every stage → none of them show a stage-name eyebrow at the top. Briefing still shows its section eyebrows.
7. On QUESTIONING: no `Enter submits` chip in the header. Press `?` → shortcuts overlay still lists Enter / Shift+Enter / Esc.
8. Click `reset` in topbar → returns to empty intake form, topbar's left zone clears, localStorage is wiped.
9. Hard-refresh mid-flow → rehydrate path in [main.js:62-92](frontend/client/src/main.js#L62-L92) still restores the session; topbar context returns; current stage's center meta is correct.

## What I am explicitly NOT doing

- Not adding an inspector rail showing live SSE payloads. That's a bigger feature; this PR is about stripping, not adding.
- Not adding preset/scenario loading on the intake form. Same reasoning.
- Not touching the engine output rendering inside any stage.
- Not changing the SSE protocol, API shapes, or server routes.
- Not changing the meeting-type card grid, if you want to keep it inline. If you'd rather collapse it to a native `<select>`, say the word and I'll do that too — the plan above assumes native select for density, but the card UI is preserved-able with minor adjustment.

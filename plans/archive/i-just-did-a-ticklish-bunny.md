# Plan: Notes panel refinements + stage-aware topbar

## Context

The first pass of the stage-tagged notes panel is live and you've taken it for a spin (screenshot shows FOCUS_POINTS with one note saved). Several rough edges came up that need to be fixed before going further:

1. Existing notes can't be edited — typos and half-finished thoughts are stuck.
2. The notes panel font is too small to read comfortably while running a session.
3. The "Continue" shortcut overlay (bottom-right) is now hidden behind the 320px notes rail.
4. The dev-badge floats over the top-right corner of the notes panel; better to fold it into the panel itself so it doesn't compete for the same space.
5. The top nav currently shows session context (Carl · Lead · UX Lead · …) — the user wants it to show **every stage** with the current stage bolded, so progress through the run is visible at a glance.

The original plan (full text preserved below for reference) ships unchanged at the file level; this update layers refinements on top.

## Approach (round 2 — UX-led refinements)

**Design lens:** You're running a session and trying to take *good* notes — multi-sentence, paragraph-shaped observations about what the AI just produced. Round 1 forced single-line notes (Enter saved immediately) and let three different floating widgets compete for the bottom-right corner where the notes input lives. Round 2 fixes the model, not just the cosmetics.

### A. Composer model: write a thought, *then* save it

The single biggest UX miss in round 1 was "Enter saves." Your real notes (the dump that prompted this whole feature) were paragraphs, not bullets. Forcing a save on every Enter fragments the thought before it's finished and creates dozens of micro-entries.

[frontend/client/src/ui/notes-panel.js](frontend/client/src/ui/notes-panel.js)

- **Enter inserts a newline.** No more save-on-Enter.
- **Cmd/Ctrl+Enter saves** the current draft as one note. There's also a visible "Save note" button next to the textarea.
- **Stage is captured at save time**, not per line — the whole paragraph is tagged with the stage you were in when you hit save.
- **Composer auto-grows**: `rows=4` baseline, grows up to ~12 rows of content, scrolls inside after that. Pinned to the bottom of the rail; grows upward.
- Placeholder text reflects the new model: `"Type a note about this stage. Cmd/Ctrl+Enter to save."`
- Esc inside the composer blurs (and stops propagation so it doesn't fire the questioning skip handler) but does **not** discard the draft — drafts are sticky until saved or explicitly cleared. This lets you flip focus back to the question, then return to finish the thought.

### B. Editable saved notes

[frontend/client/src/ui/notes-panel.js](frontend/client/src/ui/notes-panel.js)

- Each saved note in the list is clickable. Clicking swaps the static text for an inline textarea pre-filled with the note's text (and the same auto-grow behaviour).
- **Cmd/Ctrl+Enter** saves the edit. **Esc** cancels and restores. Plain Enter is newline.
- Only one note in edit mode at a time — opening a second edit auto-cancels the first.
- A small "Delete" link appears in edit mode (we'll need this once you're editing; otherwise typos are forever).

[frontend/server/handlers/notes.js](frontend/server/handlers/notes.js)

- Behaviour: if incoming `note.id` matches an existing note, **replace** it. If `note.text` is empty and the id matches, **delete** it. Otherwise append. Re-render `notes.md` on every mutation.
- Update client `postNote` to accept `note.deleted: true` for explicit deletes.

### C. Bigger, more readable type

The panel is for reading and writing real thoughts, not glancing at metadata. Sizes go up.

[frontend/client/src/styles/design.css](frontend/client/src/styles/design.css), `.notes-panel*` block:

- Rail width: `--notes-panel-w: 400px` (was 320). Update `body.has-notes-panel { padding-right: 400px }`.
- `.notes-panel__item` text: `font-size: 15px; line-height: 1.55;` (was ~13px).
- `.notes-panel__group-head`: `font-size: 13px; letter-spacing: 0.06em;`.
- `.notes-panel__compose textarea`: `font-size: 15px; line-height: 1.5;`.
- `.notes-panel__ts`: `font-size: 12px;`.
- `.notes-panel__hint`: `font-size: 12px;`.
- Comfortable padding around items (`0.5rem 0`), real breathing room between groups.

### D. Stop the floating kbd-overlay competing with the notes input

The screenshot you sent makes this concrete: the `.kbd-overlay` cheatsheet sits *on top of* the notes textarea. Just shifting it left would push it onto stage content or into the panel itself — same problem, different pixel. The real fix is that the overlay's reason-to-exist is gone now that the notes panel takes that visual real estate:

- On focus-points and questioning, the cheatsheet duplicates affordances already on screen (a big "Prepare for this 1:1" button; a textarea with a "Record & continue" button labelled clearly).
- The notes composer itself shows its own hint (`Cmd/Ctrl+Enter to save`) inline, where you actually need it.

**Plan: stop mounting `.kbd-overlay` on any stage that shows the notes panel.**

[frontend/client/src/stages/focus-points.js](frontend/client/src/stages/focus-points.js) and [frontend/client/src/stages/questioning.js](frontend/client/src/stages/questioning.js): remove the `createShortcutsOverlay(...)` call and `overlay.destroy()` in unmount. The shortcuts themselves still work — just no floating hint card.

(Keep the overlay implementation in [ui/shortcuts.js](frontend/client/src/ui/shortcuts.js) for now in case any future pre-session stage wants it.)

### E. Fold the dev-badge into the notes panel header (dev only)

The black floating badge in the screenshot is also in the way and visually loud. It belongs in the dev tools area, not floating over content.

[frontend/client/src/ui/notes-panel.js](frontend/client/src/ui/notes-panel.js)
- Add a `<div class="notes-panel__dev"></div>` slot inside `.notes-panel__head`.
- Expose `mountDevBadge(el)` that appends a passed element into that slot.

[frontend/client/src/ui/dev-badge.js](frontend/client/src/ui/dev-badge.js)
- Strip `position: fixed; top/right/z-index; max-width: 340px`. Keep the dark monospace styling but tone it down — smaller font (10px), tighter padding, full width within the slot.
- Keep click-to-copy intact.

[frontend/client/src/main.js](frontend/client/src/main.js)
- `notesPanel.mountDevBadge(devBadge.el)` instead of `document.body.appendChild(devBadge.el)`.
- When panel is hidden (INTAKE / ERROR), badge hides with it. Acceptable — INTAKE is a fixed-shape page and dev-badge value is low there.

### F. Topbar = stage strip with current bolded

[frontend/client/src/ui/session-topbar.js](frontend/client/src/ui/session-topbar.js)
- Replace the existing context-segments render with a stage strip on the left and the session context on the right.
- Stage list (in order):
  - `INTAKE` → "Intake"
  - `FOCUS_POINTS` → "Focus points"
  - `PREPARATION` → "Preparation"
  - `BANK` → "Question bank"
  - `QUESTIONING` → "Questioning"
  - `EVAL` → "Evaluation"
  - `BRIEFING` → "Briefing"
- Skip `ERROR` from the strip (error is transient; show the strip with whatever stage `retryStage` points to, or leave nothing bolded if not available).
- Current stage gets a class `is-current` styled with `color: var(--color-ink); font-weight: 600;`. Others stay muted.
- Separator: keep the existing `<span class="sep">·</span>` between items.
- Drop the context segments from the topbar entirely. The topbar is now pure stage navigation: progress through the run at a glance.
- Don't make stages clickable (no navigation back/forward via the strip — the flow is meant to be one-way). Visual indicator only.

DOM:
```html
<div class="session-topbar__row session-topbar__stages">
  <span>Intake</span><span class="sep">·</span>
  <span class="is-current">Focus points</span><span class="sep">·</span>
  …
</div>
```

[frontend/client/src/styles/design.css](frontend/client/src/styles/design.css), `.session-topbar__row` block:
- `.session-topbar__stages .is-current` — bolded, full ink colour.
- Other items stay at `color: var(--color-ink-mute)`.

### G. Session context lives in the notes panel header

[frontend/client/src/ui/notes-panel.js](frontend/client/src/ui/notes-panel.js)
- Add a `<div class="notes-panel__ctx"></div>` at the top of `.notes-panel__head`, above the "Notes" eyebrow.
- The `render(state)` callback (already called from main.js's `subscribe`) populates it from `state.ctx`: `name · seniority · role · meetingType`, same logic as the old [session-topbar.js:15-29](frontend/client/src/ui/session-topbar.js#L15-L29). Hidden when no segments.

[frontend/client/src/styles/design.css](frontend/client/src/styles/design.css)
- `.notes-panel__ctx` — small, dim text, padding-bottom to separate from the "Notes" eyebrow. Wraps if long.

---

## Files to modify (this round)

- [frontend/client/src/ui/notes-panel.js](frontend/client/src/ui/notes-panel.js) — new composer model (Cmd/Ctrl+Enter), editable saved notes with delete, auto-grow textarea, dev-badge slot, context segment in header
- [frontend/client/src/api.js](frontend/client/src/api.js) — `postNote` accepts deletes (passes through `note.deleted`)
- [frontend/server/handlers/notes.js](frontend/server/handlers/notes.js) — upsert by id, delete when text empty / deleted flag
- [frontend/client/src/styles/design.css](frontend/client/src/styles/design.css) — bigger fonts, 400px rail, topbar stage strip styles, notes-panel ctx + dev slot styles
- [frontend/client/src/ui/dev-badge.js](frontend/client/src/ui/dev-badge.js) — strip fixed positioning, inline-friendly styling
- [frontend/client/src/main.js](frontend/client/src/main.js) — mount dev-badge inside notes panel
- [frontend/client/src/ui/session-topbar.js](frontend/client/src/ui/session-topbar.js) — render stage strip only, drop context
- [frontend/client/src/stages/focus-points.js](frontend/client/src/stages/focus-points.js) — remove `createShortcutsOverlay` call
- [frontend/client/src/stages/questioning.js](frontend/client/src/stages/questioning.js) — remove `createShortcutsOverlay` call

No new files this round.

---

## Verification (round 2)

Focus the verification on the *actual job*: walking through a run while taking real, paragraph-length notes.

1. **Composer feels right.** Type a multi-line note (3+ sentences, each with its own newline via Enter). Hit Cmd/Ctrl+Enter. Confirm it saves as one note tagged with the current stage. Confirm the textarea grew as you typed.
2. **No floating overlays in the way.** Focus the notes textarea on FOCUS_POINTS and on QUESTIONING. Confirm the bottom-right kbd-overlay is gone on both. The textarea has the entire bottom-right corner to itself.
3. **Edit a note.** Click a saved note → it expands into an editable textarea. Cmd/Ctrl+Enter saves the edit; check `notes.md` updates. Esc cancels and restores the original. Delete link in edit mode removes the note (and removes it from `notes.md`).
4. **Type is readable.** Notes-panel text is comfortably readable from a normal seating distance — meaningfully bigger than before.
5. **Topbar is the stage map.** Top nav shows: `Intake · Focus points · Preparation · Bank · Questioning · Evaluation · Briefing`, with the current stage bold and others muted. Advancing a stage moves the bold.
6. **Context lives in the panel.** `Carl · Lead · UX Lead · Performance & feedback` appears at the top of the notes panel header.
7. **Dev badge is inside the panel.** No floating black box in the top-right corner; the stage/file/data block sits inside `.notes-panel__head` and click-to-copy still works.
8. **Sticky drafts.** Type half a sentence in the composer, click into the question textarea (or the focus-point cards), then click back into the notes textarea. Confirm the draft is still there.
9. **Refresh resilience.** Reload mid-run. Bolded stage, context, and all saved notes restore.
10. **Esc behaviour in QUESTIONING.** In the notes composer on QUESTIONING, press Esc. Confirm it does **not** skip the current question (it only blurs).

---

## Original plan (round 1, already shipped — kept for reference)

**Layout decision (confirmed):** Fixed right rail, always visible from FOCUS_POINTS onwards (mirrors the existing session topbar pattern in [main.js:28-29](frontend/client/src/main.js#L28-L29)). Tag each line on Enter.

### 1. State — add `notes` to the store

[frontend/client/src/state.js](frontend/client/src/state.js)

Add to `initial`:
```js
notes: [],   // [{ id, stage, turn, ts, text }]
```

Include in `resetSession`.

### 2. Notes panel UI component (new file)

`frontend/client/src/ui/notes-panel.js` — modelled on [session-topbar.js](frontend/client/src/ui/session-topbar.js):

- Exports `createNotesPanel({ store, setState })`.
- Renders a fixed right column under the topbar:
  - Scrollable list of existing notes grouped by stage (and `Q<turn>` subheader within QUESTIONING).
  - A textarea pinned to the bottom.
- Enter (no shift) commits: snapshot `store.stage` + `store.turn`, push `{ id: crypto.randomUUID(), stage, turn, ts: Date.now(), text }` into `store.notes`, fire `POST /api/notes`, clear textarea, re-render list.
- Shift+Enter inserts newline within the current draft.
- `render({ stage, notes })` — hidden when `stage === "INTAKE" || stage === "ERROR"`; otherwise visible.
- Escape key inside the textarea must NOT bubble to the questioning skip handler ([questioning.js:91-97](frontend/client/src/stages/questioning.js#L91-L97)) — stop propagation when the textarea has focus.

### 3. Mount globally in main.js

[frontend/client/src/main.js](frontend/client/src/main.js):

Alongside the topbar mount (line 28-29), mount the notes panel once. Drive its visibility from the same `subscribe` callback that already runs `topbar.render` (line 54-60). Pass `store` and `setState` so the panel reads stage/turn at commit time.

### 4. CSS — fixed right rail + content offset

[frontend/client/src/styles/design.css](frontend/client/src/styles/design.css), in the section after `.session-topbar`:

```css
.notes-panel {
  --notes-panel-w: 320px;
  position: fixed;
  top: var(--session-topbar-h, 44px);
  right: 0;
  bottom: 0;
  width: var(--notes-panel-w);
  border-left: 1px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  z-index: 9;
}
.notes-panel.is-hidden { display: none; }
.notes-panel__list { flex: 1; overflow-y: auto; padding: 1rem; }
.notes-panel__group { margin-bottom: 1rem; }
.notes-panel__group-head { /* eyebrow style */ }
.notes-panel__item { font-size: var(--type-small); margin: 0.25rem 0; }
.notes-panel__compose { border-top: 1px solid var(--color-border); padding: 0.75rem; }
.notes-panel__compose textarea { width: 100%; resize: none; }
body.has-notes-panel { padding-right: var(--notes-panel-w, 320px); }
```

The existing `.stage { display: grid; place-items: center }` will re-center within the remaining width — no JS layout work needed.

### 5. Backend — persist notes + write notes.md

**New handler** `frontend/server/handlers/notes.js`:
- `POST /api/notes` with `{ sessionId, note: { id, stage, turn, ts, text } }`.
- Push onto `session.notes` (initialise array if missing).
- Call `persist(session)` (already wired in [session-persistence.js](frontend/server/session-persistence.js)).
- Also write `<session.dir>/notes.md` on every append (cheap, always-current, no "when to finalise" question).

**Register route** in [server.js](frontend/server/server.js) next to other POSTs (line 73-76), with the same `originOk` guard.

**Persist** — add `notes: s.notes` to the `serialize` payload in [session-persistence.js:9-29](frontend/server/session-persistence.js#L9-L29).

**Rehydrate** — add `notes: s.notes || []` to the `snapshot` return in [sessions.js:73-86](frontend/server/sessions.js#L73-L86), and consume it in the boot `setState` in [main.js:71-82](frontend/client/src/main.js#L71-L82) so notes survive page reload.

### 6. notes.md format

```md
# Notes — <session-id>
<ctx.name> · <ctx.role> · <ctx.meetingType>

## FOCUS_POINTS
- [11:24:01] uncheck what i want to skip does not make sense...

## QUESTIONING — Q3
- [11:30:12] this question feels like an interview, not a manager connecting...

## EVAL
- [11:35:44] "role clarity is hindered by external delegation decisions" is verbose...
```

Stage order follows the run order (FOCUS_POINTS → PREPARATION → BANK → QUESTIONING → EVAL → BRIEFING). Group within QUESTIONING by turn.

### 7. Copy review prompt — BRIEFING stage

[frontend/client/src/stages/briefing.js](frontend/client/src/stages/briefing.js): add a "Copy review prompt" button (only when `store.notes.length > 0`) that writes this to the clipboard:

```
Read C:\Users\User\Documents\Sero\darren\logs\<session-dir>\notes.md.

These are my notes from a Sero run, tagged by stage. Save the key recurring themes to memory (treat them as feedback about the app, not about me). Then ask me one focused question at a time about the issues I raised so we can decide what changes to make to the prompts and copy.
```

The `<session-dir>` is the basename of `session.dir` — surface it via the existing `snapshot()` (add a `sessionDir` field) so the client can substitute it. Show a brief "Copied" confirmation on click.

## Files to create

- `frontend/client/src/ui/notes-panel.js`
- `frontend/server/handlers/notes.js`

## Files to modify

- [frontend/client/src/state.js](frontend/client/src/state.js) — `notes: []` field
- [frontend/client/src/main.js](frontend/client/src/main.js) — mount panel, restore notes on rehydrate
- [frontend/client/src/api.js](frontend/client/src/api.js) — `postNote(sessionId, note)`
- [frontend/client/src/styles/design.css](frontend/client/src/styles/design.css) — `.notes-panel` styles, `body.has-notes-panel` padding
- [frontend/client/src/stages/briefing.js](frontend/client/src/stages/briefing.js) — "Copy review prompt" button
- [frontend/server/server.js](frontend/server/server.js) — register `POST /api/notes`
- [frontend/server/session-persistence.js](frontend/server/session-persistence.js) — include `notes` in serialize
- [frontend/server/sessions.js](frontend/server/sessions.js) — include `notes` + `sessionDir` in `snapshot()`

## Verification

End-to-end against a real run:

1. Run the app (`npm run dev` from repo root), start a session, verify panel **does not** appear during INTAKE.
2. After clicking through to FOCUS_POINTS, verify panel appears on the right and stage content stays centered in the remaining width.
3. Type a line and hit Enter on each of: FOCUS_POINTS, PREPARATION, two different turns of QUESTIONING, EVAL, BRIEFING. Verify each line lands under the correct stage header (and correct Q-number for QUESTIONING) in the rendered list.
4. While in QUESTIONING, press Escape inside the notes textarea — confirm it does **not** trigger the "skip question" handler.
5. Refresh the page mid-run. Confirm notes panel restores all prior notes from `GET /api/session`.
6. Open `logs/<run>/notes.md` directly on disk — confirm the markdown matches what you typed, with the right stage grouping.
7. On BRIEFING, click "Copy review prompt", paste into a new Claude conversation, confirm the path resolves and Claude can read the file.
8. Sanity: notes.md path in the copied prompt uses real Windows backslashes for this repo location.

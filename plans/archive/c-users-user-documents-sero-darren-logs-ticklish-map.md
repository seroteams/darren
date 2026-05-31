# Plan — Add a fixed top-bar showing interview context across in-session stages

## Context

The runner ([frontend/client/src/stages/questioning.js](frontend/client/src/stages/questioning.js)) and the other in-session screens give the manager no persistent reminder of *who* is in the room — name, seniority, role, meeting type. While walking through 8 questions it's easy to lose orientation. The screenshot the user shared makes this clear: the page shows "Questioning / Question 2 of 8 / How has the last couple of weeks felt from your side?" with no anchor back to Carl, his level, or what kind of conversation this is.

All four fields already live in `store.ctx` ([frontend/client/src/state.js:20](frontend/client/src/state.js#L20)), are populated by intake, and survive page refresh via the rehydrate path ([frontend/client/src/main.js:73](frontend/client/src/main.js#L73)). No backend or persistence changes needed — this is purely a frontend rendering addition.

User decisions captured before this plan:
- **Scope**: visible on every in-session stage (FOCUS_POINTS → BRIEFING). Hidden on INTAKE and ERROR.
- **Layout**: fixed white top nav across the viewport.

## Critical files

- **New**: [frontend/client/src/ui/session-topbar.js](frontend/client/src/ui/session-topbar.js) — small UI module exporting `createSessionTopbar()`. Mirrors the shape of [frontend/client/src/ui/dev-badge.js](frontend/client/src/ui/dev-badge.js) (`{ el, render() }`).
- **Edit**: [frontend/client/src/main.js](frontend/client/src/main.js) — instantiate once on boot, append to `document.body`, call `render({ ctx, stage })` from the existing subscribe callback.
- **Edit**: [frontend/client/src/styles/design.css](frontend/client/src/styles/design.css) — add `.session-topbar` rules and a `body.has-session-topbar { padding-top: ... }` rule so the fixed bar doesn't overlap the vertically-centred `.stage` content.

## Design

**Element shape**

- `position: fixed; top: 0; left: 0; right: 0;`
- White background (`var(--color-surface)`), 1px bottom border (`var(--color-border)`), no shadow.
- Padding: ~12px vertical, ~24px horizontal.
- `z-index: 10` (above stage content, below dev badge's 9999).
- Height target: ~44px. Expose as a CSS custom prop `--session-topbar-h: 44px` on `:root` so the body padding rule can reference it without duplication.

**Content**

A single left-aligned row, joined with middle-dot bullets:

```
Carl  ·  Mid  ·  Web Designer  ·  Growth & career plan
```

- Name in `var(--color-ink)` (stronger).
- Seniority, role, meeting type in `var(--color-ink-mute)`.
- Bullets in `var(--color-ink-mute)` with reduced opacity.
- Font size matches `.eyebrow` (already defined in design.css:371) or slightly larger for legibility — pick at implementation time.
- Truncate the entire row with `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` at narrow widths. Acceptable tradeoff vs wrapping for now.

**Visibility logic** (in `render({ ctx, stage })`)

- Hide (`is-hidden` class + remove `body.has-session-topbar`) when:
  - `stage` is `INTAKE` or `ERROR`, OR
  - `ctx.name` is empty (defensive — covers any race where stage advances before ctx is populated).
- Otherwise show, and add `body.has-session-topbar` so body gets top padding.

**Missing-field handling**

The render helper builds segments by filtering empty values from `[ctx.name, ctx.seniority, ctx.role, ctx.meetingType]`, then joining with `  ·  `. A missing field drops both itself and its separator — no dangling bullets.

## Approach (concrete steps)

1. **Create [frontend/client/src/ui/session-topbar.js](frontend/client/src/ui/session-topbar.js)** (~40 lines). Export `createSessionTopbar()` returning `{ el, render }`. Internals:
   - Build a single `<div class="session-topbar is-hidden">` with one inner `<div class="session-topbar__row">`.
   - `render({ ctx, stage })`:
     - Compute `shouldShow = ctx?.name && stage !== "INTAKE" && stage !== "ERROR"`.
     - Toggle `is-hidden` class on `el` and `has-session-topbar` class on `document.body`.
     - If shown, set innerHTML of the row to escaped segments joined with `<span class="sep">·</span>`. Apply `.is-strong` to the name segment.
   - Local `escape()` helper — copy the 6-line one from [questioning.js:208](frontend/client/src/stages/questioning.js#L208).

2. **Wire into [frontend/client/src/main.js](frontend/client/src/main.js)**:
   - Near the existing dev-badge block (lines 24–25), add `const topbar = createSessionTopbar(); document.body.appendChild(topbar.el);`.
   - In the existing `subscribe((s) => { ... })` block (lines 50–55), add a call to `topbar.render({ ctx: s.ctx, stage: s.stage });` before the `s.stage !== routedStage` check. This ensures the bar updates on ctx changes during intake too (so it appears the moment INTAKE completes).
   - Import: `import { createSessionTopbar } from "./ui/session-topbar.js";` at the top.

3. **Add styles to [frontend/client/src/styles/design.css](frontend/client/src/styles/design.css)**:
   - `:root { --session-topbar-h: 44px; }` (or add to existing `:root` block if one exists).
   - `.session-topbar { position: fixed; top: 0; left: 0; right: 0; height: var(--session-topbar-h); background: var(--color-surface); border-bottom: 1px solid var(--color-border); padding: 0 1.5rem; display: flex; align-items: center; z-index: 10; }`
   - `.session-topbar.is-hidden { display: none; }`
   - `.session-topbar__row { font-size: var(--type-small); color: var(--color-ink-mute); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; }`
   - `.session-topbar .is-strong { color: var(--color-ink); font-weight: 500; }`
   - `.session-topbar .sep { margin: 0 0.6rem; opacity: 0.5; }`
   - `body.has-session-topbar { padding-top: var(--session-topbar-h); }`

## Verification

- Start the dev server: `npm run dev` (defined in [package.json](package.json) — runs API + Vite concurrently).
- Walk the full flow: INTAKE → FOCUS_POINTS → PREPARATION → BANK → QUESTIONING → EVAL → BRIEFING.
  - Bar is **hidden** on INTAKE.
  - Bar **appears** on FOCUS_POINTS the moment intake completes, showing the entered name / seniority / role / meeting type.
  - Bar **remains** through PREPARATION, BANK, QUESTIONING (all 8 turns), EVAL, BRIEFING.
  - Bar is hidden on ERROR (force one by killing the API mid-flow).
- Refresh the page mid-session to confirm the bar reappears correctly via the rehydrate path.
- Resize the viewport to ~600px wide and confirm the row truncates with ellipsis rather than wrapping or causing horizontal scroll.
- Confirm `.stage`'s vertical-centred content isn't covered by the bar (the `body.has-session-topbar` padding-top rule handles this).
- Visually verify the bar styling matches the existing surface/border/typography tokens — no rogue hex codes.

## Out of scope (flagged for separate decision)

- Editing context mid-session (no current UI affords this).
- Adding an avatar, status dot, or icon next to the name.
- Showing focus-point summaries, axis snapshots, or turn count in the bar.
- Showing the bar on INTAKE itself once the name is filled in (would create a flicker mid-intake; keep INTAKE clean).
- Mobile-specific layout (single-line truncation is the working assumption; revisit if mobile becomes a real use case).

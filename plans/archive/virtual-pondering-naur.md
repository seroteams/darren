# Add /reviewrun reminder to Start page

## Context

After landing the Start page in prior work (see git history for `frontend/client/src/stages/start.js`), user wants a visible reminder on that screen so they don't forget to log review URLs back into the run. Reminder text: **"Carl run /reviewrun and put the url of this run when its done."**

## Change

Single file: `frontend/client/src/stages/start.js`.

Insert one line in the header block (after subtitle `"Pick up where you left off, or start fresh."` at line 12):

```html
<div class="text-ink-dim text-sm mt-2"><span class="font-medium">Reminder:</span> Carl run <span class="kbd">/reviewrun</span> and put the URL of this run when it's done.</div>
```

- Uses existing `text-ink-dim`, `text-sm`, `font-medium`, `kbd` classes — no CSS additions.
- Sits inside `<header class="space-y-2">` so vertical spacing matches the rest of the header.
- Apostrophe in "it's" — capital-letter style otherwise matches user's wording.

## Files modified

- `frontend/client/src/stages/start.js` (one insertion, no deletions)

## Verification

1. Dev server already running (vite on 3000, API on 3001 from prior step).
2. Browser at `http://localhost:3000` with localStorage cleared.
3. Confirm Start page header reads:
   - `Sero · 1:1 prep`
   - `Start a run`
   - `Pick up where you left off, or start fresh.`
   - `Reminder: Carl run /reviewrun and put the URL of this run when it's done.`
4. `/reviewrun` token styled like a keyboard chip (kbd).
5. No layout regression — Recent runs list and Start new run button still flow below.

# Phase 3 — Send to a folder Claude reads

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Hand a reviewed run to Claude without copy-paste: one button drops the full run — prep, questions, briefing, your verdict and note, and which checks failed — into a folder Claude reads directly. Plus a way to send the whole open pile (Fix + Block) at once.

## Changes
- `frontend/server/handlers/review-outbox.js` (new) — `POST /api/runs/:id/outbox`: finds the run, builds the same markdown the "Copy all" already produces, writes it to `logs/review-outbox/<id>.md` (created if missing), atomic write like the review handler. Same origin guard as the review route.
- `frontend/server/server.js` — register the new route.
- `frontend/client/src/api.js` — a `sendToOutbox(id)` wrapper.
- `frontend/client/src/stages/review-run.js` — a **Send to Claude** button; shows "Sent" on success.
- `frontend/client/src/stages/library.js` — a **Send all open Fix/Block** button that writes each open run to the outbox folder, with a count when done.
- The markdown is the existing serializer — it already includes your single note and the list of failed checks mapped to the engine files that own them. No change to what gets reviewed or saved.

## Not in this phase
- Per-check comments (we chose one note per run).
- Auto-deleting or archiving outbox files after Claude reads them — manual for now.

## Done when
- [ ] "Send to Claude" on a run writes `logs/review-outbox/<id>.md` with the full run + verdict + note.
- [ ] "Send all open Fix/Block" writes one file per open run and reports how many.
- [ ] The private manager note still carries its ⚠ private marker; nothing about what's surfaced changes.
- [ ] `npm run gate` passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Send one** — open a reviewed run, click **Send to Claude**. The button should say "Sent". Then ask Claude to read it — the file should be in `logs/review-outbox/` and contain the run, your marks, your note, and the failed checks. ❌ Not OK if the note or failed checks are missing.
2. **Send the pile** — on the Library, click **Send all open Fix/Block**. It should report something like "Sent 3". Check the folder has one file per open run.
3. **Re-send is clean** — send the same run twice. It should just overwrite, not pile up duplicates or error.
4. **Nothing open** — with no Fix/Block runs, "Send all" should say "Nothing to send", not crash.
5. **Hand-off works end to end** — after sending, tell Claude "work the outbox". It should be able to read the files and know which checks failed and where to look, with no copy-paste from you.

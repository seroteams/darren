# Phase 2 — Tabbed rail shell (Notes · Sent · Reply)

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
Turn the right rail into a three-tab strip — **Notes · Sent · Reply** — without changing how Notes works. Sent and Reply are empty shells in this phase.

## Changes
- In `frontend/client/src/ui/notes-panel.js`, add a tab strip at the top of the rail: **Notes** (active by default), **Sent**, **Reply**.
- Move the existing notes UI (the list + the type-a-note box) into the **Notes** tab — same behaviour, same buttons, same shortcuts.
- Add empty containers for **Sent** and **Reply** with a short placeholder line ("Filled in when this stage runs").
- Clicking a tab switches which one shows. The rail remembers the last tab you picked while it's open.
- Keep the rest of the rail (open/close, the narrow-screen toggle, the dev badge under Notes) exactly as it is.

## Not in this phase
- Loading any AI data into Sent/Reply — that's Phase 3. Here they're just empty tabs.

## Done when
- [ ] The rail shows three tabs and you can switch between them.
- [ ] Notes still saves, edits, and deletes exactly as before.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Three tabs appear** — start a session and open the right rail. You should see **Notes · Sent · Reply** across the top, with Notes showing first. ❌ Not OK if the tabs don't show or Notes isn't the default.
2. **Notes is untouched** — on the Notes tab, type a note and save it, edit it, delete it. All three should work exactly as they did before. ❌ Not OK if any note action misbehaves.
3. **Switching works** — click **Sent**, then **Reply**, then back to **Notes**. Each switch should show that tab's area (Sent/Reply show a short placeholder for now). ❌ Not OK if a tab is blank-broken or the page jumps.
4. **Narrow screen** — make the window narrow (or on a small screen). The rail's open/close toggle should still work, and the tabs should still switch inside it. ❌ Not OK if the tabs break the narrow layout.
5. **Remembered tab** — pick **Reply**, close the rail, reopen it. It should come back on **Reply** (last tab you used). ❌ Not OK if it forgets and resets oddly.

# Hide / restore the AI's role words

**Goal:** A manager can hide any of the AI's words for a role (and restore it later); hidden words disappear from the page **and** stop being used in real 1:1s — while the AI's original stays safely on disk.
**Driver:** Carl
**Created:** 2026-07-05

## Why
On the "Words of each role" page you can add and remove **your own** words, but the AI's words are read-only. Carl wants to drop the AI words he doesn't like. We do it the honest way: the AI's generated profile is never overwritten — hiding is recorded as a manager choice in the sidecar overlay, and it's fully reversible. This respects the standing "engine honesty — no silent masking" rule: nothing is secretly rewritten; the manager explicitly hides a word and can bring it back.

## Done means
- Hovering an AI word row reveals a delete (trash) control; clicking it removes the word from the list.
- Deleted words collect in a "Hidden words (N)" area on that role with a "put back" control that brings them back (undo — the AI's file is never wiped).
- Hiding a word persists (refresh keeps it hidden) and a real 1:1 for that role no longer uses the hidden word.
- The role's generated profile file on disk is unchanged — only the `<key>.overlay.json` sidecar records what's hidden.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Backend save-layer + API | Overlay gains `hidden_terms`; engine drops hidden words at runtime; list marks them; hide/unhide endpoints + api.js helpers; tests | ✅ |
| 2 | Frontend hide / restore UI | Hover-reveal delete on AI rows, "Hidden words (N)" restore area, wired to the endpoints | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**TRACK CLOSED 2026-07-08 — both phases green-lit by Carl.**
Phase 1 ✅ green-lit + committed (`9a6f1ca9`) — backend overlay `hidden_terms`, engine drop at runtime, hide/unhide endpoints. 62/62 tests.
Phase 2 ✅ green-lit 2026-07-08 ("its done") — hover-reveal trash on AI rows, "Hidden words (N)" put-back area, wired to the endpoints (code committed earlier via checkpoint `cf8cdabe`). Re-verified same day before the walk: `npm test` 96/96, typecheck:admin clean, routes live on the running server. Carl walked the 6 browser scenarios and passed them.

## Parked
- **Editing the wording** of AI words (not just hiding) — Carl chose hide-only as the first step. Same overlay-override mechanism would extend to it later.
- Bulk hide / "hide whole group".
- Showing a subtle count of hidden words in the left list.

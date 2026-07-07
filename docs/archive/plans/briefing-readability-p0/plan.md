# Briefing page — readability P0 (safety + headings)

**Goal:** A manager can glance at the final briefing and instantly tell a section from a side-note, read every label, and never confuse the private "honest read" with the shareable one.
**Driver:** Carl
**Created:** 2026-06-27

## Where this came from
Design review of the final briefing page ([admin/src/stages/briefing.js](../../../../admin/src/stages/briefing.js)) by a four-person expert committee (typography, calm-tool UX, information design, accessibility). All four independently flagged the same two problems; this folder is the P0 slice Carl greenlit. P1/P2 ideas are parked below.

## Done means
- Section titles ("What stood out", "How engaged they seem", "What to do next", "Reminders", the "Honest read" labels) read as headings — sentence case, larger, solid ink — not tiny grey capitals.
- The small uppercase label style is used only for tiny inline labels (Why / Your move / etc.), and those labels are dark enough to read on every background.
- The two "Honest read" cards look like clearly different things: the shareable one calm and plain, the private one obviously walled-off, with a "Private" badge you can actually read.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Headings & label hierarchy | Section titles become real headings; inline labels stay small but pass contrast | ⬜ |
| 2 | The two "Honest read" cards | Private card unmistakably different; badges solid + readable | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Live glance view: [STATUS.md](../../../../STATUS.md) (repo root) — always current.
Plan scaffolded. **Baseline run 2026-06-28: `npm test` → 46/46 passed** (free, offline). Awaiting Carl's "go" to start Phase 1; nothing built yet. The full `npm run gate` is paid (~$3) and not needed for a visual-only change unless Carl asks.

## Parked (P1/P2 — cut from this slice on purpose)
- Hero block at top fusing situation + the single "today" action (focal point).
- Promote the action line inside "How engaged they seem"; demote the asides.
- Colour-code card state (gold = worth checking, mint = good, blue = later); colour the today/next pills by urgency.
- One-word verdict per score line (Strong / Mixed / Thin) + state-tinted axis tags.
- Quiet the timing pills and copy buttons so the action sentence is the heaviest thing in its row.

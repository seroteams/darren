# Inbox-style run review

**Goal:** Turn the Library into an inbox you work down to zero — see what's done and not done, move run to run without bouncing back to the list, and send a reviewed run (plus your note) to Claude in one move.
**Driver:** Carl
**Created:** 2026-06-10

## Done means
- The Library shows a progress line — "X of N reviewed" with a bar — so you can see what's left at a glance.
- After judging a run you can jump straight to the next one (and back) without returning to the list, and you get a clear "nothing left" screen when the inbox is empty.
- A "Send to Claude" button drops a reviewed run into a folder Claude reads directly — no copy-paste — and you can send all the open Fix/Block runs at once.

## Decisions already made
- **One note per run** (today's single note box stays — no per-check comments). Keeps it simple.
- **Send to a folder Claude reads** (a file outbox), not clipboard.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Progress header | "X of N reviewed" + bar + open Fix/Block count on the Library | ⬜ |
| 2 | Inbox navigation | Save & next / prev, "inbox empty" end screen, keyboard `]` `[` | ⬜ |
| 3 | Send to a folder | "Send to Claude" writes the run to `logs/review-outbox/`, plus send-all-open | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 1 is next. Folder just set up — read the phase files and confirm before any work starts.

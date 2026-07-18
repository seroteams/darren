# Wrap-up exit — a warm early door out of the 1:1

**Goal:** From question 4 onward, the existing "Skip to briefing" escape becomes a warm **"Wrap up — get my briefing"** that routes through the closing question — so a manager who feels done leaves through a proper goodbye, not a trapdoor.
**Driver:** Carl (picked over the parked adaptive-early-close after the red/blue/green review — see [../../future/adaptive-early-close/review-findings.md](../../future/adaptive-early-close/review-findings.md))
**Created:** 2026-07-17

## Done means
- Before Q4: the header button stays exactly as today ("Skip to briefing" → straight to the briefing).
- From Q4 (and before the final question): it reads **"Wrap up — get my briefing"**; clicking it (after a warm confirm) serves the **closing question next**, then the briefing. The shortest possible 1:1 becomes 4 questions — the Balanced floor Carl picked.
- The wrap-up path composes with the promises loop: the closer it serves is the final turn, so the existing "Agree next actions" fork appears naturally.
- If no closer is available (edge/scripted lane), the button quietly behaves like today's skip — never an error.
- Manager-initiated only. No detection, no auto-offer — zero false positives by construction.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The wrap-up door | Backend wrap-up endpoint + relabelled/rerouted button, both apps (one shared file) | ✅ green-lit 2026-07-18 |

## Current state
**TRACK CLOSED 2026-07-18** — Carl walked the door on the real app ("yeah works, nice"). Built +
committed 2026-07-17 (`70a2998d`), paid-tested the same day 4/4 meeting types (`3aaec419`,
~$1.85), green-lit 2026-07-18. P1 was the only phase, so the track is done and filed to done/.
**One follow-up call left with Carl (outside this close):** whether to add the one-line backend
`turn >= 4` floor guard the paid sweep flagged (UI already enforces the floor; the API alone does
not — see phase-1.md FINDING). The feature code shipped with the 07-17/18 pushes and is **live**
(verified: `70a2998d` is on origin/main, and the 07-18 goodnight watched that deploy go healthy).

## Parked
- Adaptive auto-offer (Complete/Continue deeper) — parked at docs/plans/future/adaptive-early-close/ pending corridor feedback on the 6-question bi-weekly.
- Analytics on wrap-up usage — if Carl wants to know how often managers use the door, add a one-line log later.

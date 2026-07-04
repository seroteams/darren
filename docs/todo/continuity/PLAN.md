> ⛔ **HARD-PARKED by Carl (2026-07-04). Do NOT build until he explicitly says go.** This plan was
> scaffolded then immediately held at Carl's direction — **no code was written.** Don't start it, don't seed
> it into other work, don't re-pitch it. When Carl lifts the hold, resume from Phase 1 below.

# Continuity — the return-visit loop ("remembering")

**Goal:** Meeting #2 with a person builds on meeting #1 — the prep carries forward what you agreed and what to
watch, so Sero follows up instead of starting cold. This is the loop three alpha-readiness reports flagged as
the thing that proves willingness-to-pay: value shows on the *second* conversation, not the first.
**Driver:** Carl · **Created:** 2026-07-04

## Why now
PG5 shipped a display-only "Since last time" on the person page. Continuity turns that from a *reminder the
manager reads* into *context the engine works from*, so the next 1:1's prep and briefing actually review the
last one's commitments.

## Phases (smallest real slice first)
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Prep carry-forward | "Prep your next 1:1" seeds the new prep with last time's agreed actions + watch-fors (visible + editable), so it flows into the engine as context. Front-end only, reuses the run already fetched — no new engine stage, no prompt change. | ⛔ hard-parked (no code) |
| 2 | Engine-native follow-up | A dedicated prior-context input to the pipeline so the briefing explicitly reviews "you agreed X — the transcript suggests it did / didn't happen." Prompt/engine change → needs a paid walked run to verify the output. | ⬜ |
| 3 | Person-profile link | Tie runs to a stable person identity (reuse the PG9 alias key) so carry-forward survives renames/merges and spans more than the immediately-previous run. | ⬜ |

⬜ not started · 🔨 built, awaiting walk · ✅ done (tested + green-lit)

## Done means (Phase 1)
- Prepping the next 1:1 with a known person lands you on intake with a plain "Since last time" block already
  in the notes (agreed actions + watch-fors), which you can edit or clear before running.
- A person with no prior briefing (or an empty one) seeds nothing — no scaffolding.
- It's transparent: nothing is injected the manager can't see and change. Free until the pipeline runs.

## Honesty / guardrails
- **No silent injection.** The carry-forward is seeded into the *visible, editable* notes — never hidden
  context the manager can't see. (Aligns with the no-silent-masking rule.)
- Phase 2's prompt change is the part that needs a paid walk before sign-off; Phase 1 does not.

## Parked
- Multi-meeting history (more than the previous run), trend of commitments kept — after Phase 3's identity link.

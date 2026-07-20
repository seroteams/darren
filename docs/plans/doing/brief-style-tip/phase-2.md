# Phase 2 — Render (surface it on screen)

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The manager sees the `styleTip` on the /prepare screen, and it's included in "Copy all".

## Changes
- `frontend/src/stages/preparation-brief.ts` — add `styleTip` to `PrepBrief`, `BriefSlots`, `SLOT_LABELS` (proposed label "For this kind of meeting"), `extractSlots`; render it as a callout at the top of the Arc "Before you walk in" phase; add to `formatBriefForCopy`.
- `frontend/src/stages/preparation.css` — a light rule for the tip callout if `.prep-callout` doesn't stand alone.

## Not in this phase
- The 11 admin-only layout variants (parked).

## Done when
- [ ] The tip renders on the real /prepare screen (screenshot), 14px+ text, plain label, above the read.
- [ ] "Copy all" includes the tip.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **See it** — open /prepare for a bi-weekly. You should see the meeting-style tip as the first thing in the brief. ❌ Not OK if it's missing, tiny, or buried.
2. **Label + placement** — the label reads plainly and the tip sits where your eye lands first. (We can tweak label/placement off this screenshot.)
3. **Copy** — hit "Copy all", paste — the tip is in the text.

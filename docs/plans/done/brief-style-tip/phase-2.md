# Phase 2 — Render (surface it on screen)

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT

## ✅ GREEN-LIT 2026-07-21 — Carl approved the on-screen tip (Arc callout, top of "Before you walk in") off the faithful render

## Built (2026-07-21)
- 8th slot `styleTip` threaded through the shared render layer: `PrepBrief`, `BriefSlots`, `SLOT_LABELS` (label "For this kind of meeting"), `extractSlots`, and `formatBriefForCopy` (`frontend/src/stages/preparation-brief.ts`); rendered as a soft-blue callout at the top of the Arc "Before you walk in" phase; `.pv-l__tip` style added (`frontend/src/stages/preparation.css`, tokens-only, 16px).
- 4 new render tests (`frontend/src/stages/preparation-brief.test.ts`): maps through, Arc renders tip + label, absent tip renders nothing, Copy-all carries it.
- Proof: typecheck clean · `npm test` 164/164 (incl. preparation-brief + preparation-css suites). Rendered live in the customer app (accent-soft #e9f3fb box, correct label, first in the read) — captured to a faithful HTML render for Carl (the preview pane can't screenshot a background tab).

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

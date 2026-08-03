# Phase 1 — the test screen

**Part of:** [plan.md](plan.md) · **Status:** 🔨 round 2 built 2026-08-03, £0, awaiting Carl's walk

## Round 1, and why it was wrong

Round 1 put the FULL last meeting on the right: headline, three summary bullets, every
question with the note typed against it, and the agreed list, behind a two-segment toggle
with two layout options. Carl, on seeing it: *"wrong direction completely, it should be 20s
to read all left and right, quick, view."*

He is right, and the prototype is what proved it. The transcript alone ran past **2,200px
of scroll** in a 560px column. That is a reading task, not a glance, and no layout choice
fixes it.

## Round 2 — the glance

The panel is now **one card. No toggle, no tabs, no scroll** before the meeting starts:

- **Last 1:1 · 22 Jul** and one sentence on what it was about.
- **You agreed** (or **Still open**), one row each, with the follow-through chip.
- Last meeting's four reads as a **single chip line**, not four meters. A meter costs 40px
  of height each to say the same thing.

The two-segment toggle comes back the moment the meeting starts, unchanged.

## The 20-second budget is measured, not felt

The mock counts the words in **both reading columns** (not the header, not its own chrome)
and shows the count and an estimate at 200 words a minute. Every switch changes it live.

| Left card | Right shows | Words | Est. |
|---|---|---|---|
| As written (both reasons) | Everything agreed + scores | 116 | ~35s |
| One line each | Only what's open + scores | 96 | ~29s |
| The aim only | Only what's open + scores | 80 | ~24s |
| The aim only | Only what's open, no scores | 71 | ~22s |

**The honest headline: the right panel is not the problem.** At the tightest it is 48
words, about 15 seconds. The screen only reaches 20 seconds if the **left card** gives
something up too, and that card is engine-written (`brief.coreIssue` and
`brief.goodOutcome`). So "20 seconds" is a prompt decision as much as a layout one.

Switches on the mock: **Screen** (repeat / first / meeting started) · **Show** (everything
agreed / only what's open) · **Left card** (as written / one line each / the aim only) ·
**Scores** (show / hide).

## Reused rather than rebuilt

- `admin/src/styles/coach-panel.css` — the shipped split, header and chip recipes.
- `readyCardHtml()` from `admin/src/stages/questioning-ready.ts` — the left card, unchanged. It already drops an empty reason, so "the aim only" needed no change to it.

Only `.l11-` rules are new and they carry colour and spacing only, so every face still
comes from a role in `design/type.css`.

## Verified

- `npm test` 232/232 · `npm run typecheck` · `npm run lint:copy` · `npm run lint:tokens`, all clean.
- Screenshots in [proof/](proof/), on the real rendered screen at 1440px and 390px:
  - `glance-as-written.png` — everything agreed, brief as it writes today (~35s)
  - `glance-open-short.png` — only what's open, one line each (~29s)
  - `glance-tightest.png` — only what's open, the aim only (~24s)
  - `glance-phone.png` — 390px, stacked

## Test scenarios — for the product owner

Open `/admin/test` → "The last 1:1, on the walk-in screen".

1. **Is it a glance?** Screen: Repeat 1:1. Read both halves without scrolling. ❌ Not OK if you find yourself reading rather than scanning.
2. **Everything, or only what's open?** Flick **Show** between A and B.
3. **What the left card costs.** Flick **Left card** through its three and watch the word count. Decide how short the brief has to write.
4. **Scores in or out.** Flick **Scores**. They cost about 2 seconds.
5. **A first 1:1 loses nothing.** Screen: First 1:1 should be exactly today's panel.
6. **The hand-over.** Screen: Meeting started. Support and live scores are back, the glance is gone.

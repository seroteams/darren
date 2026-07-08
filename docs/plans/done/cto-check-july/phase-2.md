# Phase 2 — The brief: is it good on thin input?

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## The question
Does a little bit of manager info produce a **prep brief** a real manager would find genuinely useful
walking into the 1:1 — and an **honest** one that doesn't invent detail it wasn't given?

## What I'll inspect
- The brief from the Phase 1 thin case (`final.json`) + a couple more thin briefs from `logs/**`.
- The brief prompt / logic: `briefing.ts`, `preparation.ts`.
- Judged on: **useful** (would a manager act on it?), **grounded** (every claim traceable to the little input), **honest** (stays thin when input is thin — no padding, no invented "flight-risk"-style labels), **plain** (readable, jargon-free).

## Deliverable → `findings-2.md`
- 1–2 real thin briefs, quoted, with a line-by-line good / weak read.
- Blunt verdict: **is the brief good on thin input — yes / not yet.**
- The **#1 weakness** + the cheapest fix.

## Not in this phase
- The questions (Phase 3) or summary (Phase 4). Building the fix.

## Done when
- [ ] `findings-2.md` quotes a real thin brief and judges it honestly.
- [ ] Clear yes / not-yet verdict + the #1 weakness.
- [ ] Carl has read it and said go.

## Test scenarios — for the product owner (Carl)
1. **Read the quoted brief** — would *you* walk into a 1:1 better prepared with it? Trust your gut.
2. **Grounding check** — pick one claim; the report should trace it to the manager's input. ❌ Not OK if it's invented.
3. **Honesty test** — the verdict must be blunt; if the brief pads thin input, the report says so.
4. **Green-light or dig** — "go" for Phase 3, or point me at one brief to go deeper on.

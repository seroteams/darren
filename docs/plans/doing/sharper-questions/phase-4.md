# Phase 4 — Stop every briefing reading the same

**Part of:** [plan.md](plan.md) · **Status:** ⬜
**You asked for:** "can you go deeper now ot SHOULD change." → "a" (Move A: fix the questions)

## Goal

A manager preparing four reports in one week reads four briefings that feel like four
different people, not the same form filled in four times.

## The measurements

Across 57 briefings:

| Thing | Count |
|-------|-------|
| `next_actions` exactly 2 | 55 of 57 |
| `summary_bullets` exactly 2 | 53 of 57 |
| `watch_for` exactly 2 | 55 of 57 |
| `watch_for` opens "Before next..." | 54 of 57 |
| second one opens "Within two..." | 52 of 57 |

It is hardcoded at `content/prompts/final-evaluation.md:106-116` and `:277-294`.

**The content is genuinely good.** Headlines are specific, name the person and quote
the transcript. This phase is not about improving what the briefing says. It is about
the shape being identical every single time, which is what makes it start to feel like
a template rather than a read on this particular person.

An earlier fix (`better-reads` P3) closed "briefing sameness" for **repeat 1:1s with
the same person**. It never touched sameness **across different people**, which is what
a manager actually sees in a week.

## Changes

- Let the counts flex where the evidence supports it, rather than always landing on
  exactly 2. A thin conversation should be allowed to produce one action; a rich one
  should be allowed three.
- Vary the reminder openers so 54 of 57 do not begin with the same three words.
- Check the UI renders 1 and 3 items as happily as it renders 2. Both apps, on screen,
  not in the code.

## Not in this phase

- The content, tone or quality of what the briefing says. That is working.
- The `unbooked_signal` and agenda carry-forward dead weight in the same prompt file.
  Parked, listed in plan.md.
- `final-evaluation.md` is 38k chars and not under `lint:prompt-size`. Also parked,
  though worth doing soon.

## Done when

- [ ] Replaying saved transcripts produces a spread of counts, not 2 every time
- [ ] Reminder openers vary across a sample of replayed runs
- [ ] A briefing with 1 action and a briefing with 3 both render correctly in the
      customer app, **verified by screenshot of the real screen**, not by reading the
      template
- [ ] `npm run lint:copy` passes (no banned dashes in any new prompt copy)
- [ ] `npm test`, `npm run typecheck`, `npm run replay` green
- [ ] Product owner has tested the scenarios below and said go

## Cost

Free to build and prove offline. If you want to see it on two real people rather than
on replays, that is two runs at roughly **$0.40 total**, and I will ask first.

## Test scenarios — for the product owner

Walk these yourself. This is the last phase, so a green light closes the plan.

1. **Two people, two different-shaped briefings.**
   `live > incognito window > sero.team > run a 1:1 for one report, then a second for a
   different report`. Give one of them plenty to work with and keep the other short.
   Read both briefings side by side.
   ✅ **Pass:** they do not have the same number of bullets and actions, and they do
   not open with the same words.
   ❌ **Fail:** both come back with exactly two of everything, opening identically.

2. **A short conversation does not get padded.** For the thin one, the briefing should
   be shorter rather than stretched to fill the same shape. ❌ Not OK if Sero invents
   a second action to make up the count. Fewer, true things beats two things where one
   is filler.

3. **It still looks right.** Both briefings should render cleanly, with no gaps,
   stray bullets or broken spacing where a third item appears or a second one does not.
   I will also send you screenshots of the 1-item and 3-item cases.

4. **Nothing regressed in the reading.** The briefings should still name the person,
   quote what they actually said, and give you actions you could take tomorrow.
   ❌ Not OK if varying the shape has cost any of the specificity.

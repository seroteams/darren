# Phase 4 — Stop every briefing reading the same

## Built (2026-08-02)

**The shape was contradicted, not just fixed.** `<length_limits>` said "exactly 2" for all
three lists while `<summary_bullets_rule>` two screens later said *"1 sharp bullet is
better than 2 padded ones"*. The model followed the number, which is why 55 of 57
briefings had exactly 2 actions. Same family of fault as Phase 2: a rule that lost to a
harder-sounding one and nothing said which won.

**What landed** — all in `content/prompts/final-evaluation.md`:

- `summary_bullets`, `next_actions` and `watch_for` are now **1 to 3**, with the count
  set by evidence and stated once as a hard rule: **1** when a second item would be
  filler, **2** when two threads each stand on their own evidence, **3** only when a
  third is genuinely distinct. Never invent an item to reach 2, never weld two real
  threads together to stay at 2. The three counts are set **independently**, so a
  session can honestly earn one bullet and three actions.
- The `output_contract` schema comment said "exactly 2 synthesis lines" and would have
  quietly re-imposed the old shape. Fixed.
- **The reminder openers were fixed at the structure, not with a louder rule.** 54 of 57
  opened "Before next..." because both worked examples opened that way, first with
  `Before next 1:1:` and second with `Within two weeks:`. The model was copying the
  examples, exactly as it should. So: the cue list widened to seven shapes, a hard rule
  that **no two items in one briefing may open with the same cue**, `Before next 1:1:`
  named explicitly as not the default, and four replacement examples that **each open
  differently**.

**Render proof: screenshots of the real screens, not the template.**

| Surface | 1 item | 3 items |
|---|---|---|
| The live end-of-meeting briefing (`stages/briefing.js`) | ✅ | ✅ |
| The read-only re-read, shared by the member and the superadmin drilldown (`ui/briefing-view.ts`) | ✅ | ✅ |

Both render clean: no stray marks, no gaps, no broken spacing, and the two-column
`briefing-grid--pair` holds when one column has three items and the other has one.
Screenshots in [screenshots/](screenshots/). The 3-item case was also shot at full width
on its own, to rule out the side-by-side harness flattering or breaking it.

**One surface NOT screenshotted, stated plainly:** the customer app's "Since last time"
strip (`frontend/src/stages/person-detail.ts:122`). Reaching it needs a person with a
saved past run, which needs a paid run. It maps over both arrays with no count or index
logic and hides the block when empty, so it is count-agnostic by construction, but that
is a code read and not a screenshot. Your test scenario 3 covers it on real data.

**Offline proof:** `npm test` 232/232 · `typecheck` + `typecheck:admin` +
`typecheck:customer` clean · `npm run replay` 7/7 still good · `lint:copy` clean ·
`lint:prompt-size` PASS. No count constraint exists in code or in any JSON schema, so the
prompt was the only thing enforcing 2.

**Cost: $0 so far.** What cannot be proven offline: whether real briefings now come back
with a spread of counts and varied openers. Briefings need the model, and the replay
suite reads saved ones. **Two runs at roughly $0.40 total would show it before you walk
it yourself.** Say the word and I will run them; I have not spent it.

---

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting your test
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
      — **not provable offline**: briefings need the model, and replay reads saved ones
- [ ] Reminder openers vary across a sample of replayed runs — same, needs runs
- [x] A briefing with 1 action and a briefing with 3 both render correctly, **verified by
      screenshot of the real screen**, on both briefing renderers. The customer app's
      "Since last time" strip is code-verified only, and that is flagged above
- [x] `npm run lint:copy` passes (no banned dashes in any new prompt copy)
- [x] `npm test`, `npm run typecheck`, `npm run replay` green
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

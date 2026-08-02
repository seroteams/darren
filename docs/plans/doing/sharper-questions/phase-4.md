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

## The two paid runs (2026-08-02, $0.437 total)

Carl authorised two runs. `node scripts/gate.js --only biweekly-priya` ($0.2053) and
`--only growth-ahmed` ($0.2318). Two different people, two different meeting types.

**The result splits. The openers are fixed. The counts are not, and saying otherwise
would be the exact kind of claim this plan exists to stop.**

| | Before (57 briefings) | Priya, fresh | Ahmed, fresh |
|---|---|---|---|
| `summary_bullets` | 2 in 53 of 57 | **3** | **3** |
| `next_actions` | 2 in 55 of 57 | **3** | **3** |
| `watch_for` | 2 in 55 of 57 | **3** | **3** |
| opens "Before next..." | 54 of 57 | **0 of 3** | **0 of 3** |

**Openers: working.** Six reminders across the two briefings, six different cues, none of
them "Before next 1:1". Priya's: *Within two weeks* / *If mentoring comes up again* / *At
the next planning discussion*. Ahmed's: *At the next senior forum* / *Within two weeks* /
*The first time a cross-org issue turns political*. No repeat inside either briefing. The
structural fix (replace the examples) did what the louder-rule approach would not have.

**Counts: moved off 2, but both landed on 3/3/3.** That is not the goal. The goal was
"four briefings that feel like four different people", and two briefings with identical
shape do not show that. The likely reading is that the anchor moved from 2 to 3 rather
than the count becoming genuinely evidence-led. Both sessions were rich, so 3 may be
honestly right for both, but two samples that agree cannot tell those apart. **Phase 4's
count half is unproven, and a third run on a deliberately thin session would not settle it
either, because a thin session trips partial-read mode, which forces 1 by a different
rule.**

## What the paid runs found that was not on the list

**1. The agency rule did not fire on the mentoring snag, and it was right not to.**
`AGENCY_NOT_ASKED` flagged Priya turn 4, the exact example in [phase-2.md](phase-2.md).
The planner's own note reads `[BUDGET-STARVED]`: turn 4 of 6 leaves `remaining_budget = 2`,
which is wind-down, and Phase 2's own precedence says agency yields to wind-down and the
closer. The engine followed the rule.

**The gate was wrong, and it is fixed** (`golden-checks.ts`, free): it stopped one turn too
late and so reported rule-following behaviour as a miss. Re-measured over the saved runs,
the honest number is **19 runs / 30 turns**, down from the 24 / 39 reported at Phase 2.

**But the product question underneath is real and is yours.** A snag named in the last
third of a meeting can never get its agency question, because wind-down owns the slot. On
this run the mentoring thread went to the briefing as *"Reopen the mentoring thread and
agree one concrete mentoring responsibility"* — which is Machar's original complaint,
arriving after the meeting, in the case built to demonstrate the fix.

**2. `growth-ahmed` hard-failed `FOCUS_SHAPE_LEAK`, and it is not this plan's doing.** A
focus-point `reason` opened "Where he is still stepping in..." instead of
Whether/How they're/What/If. That rule lives in `generate-focus-points.md`, last changed
2026-07-11, untouched here, and focus points are generated at stage 01 before any prompt
this plan edits. Found, not caused. It needs its own look.

**Cost: $0.437 of the ~$0.40 authorised.** No further paid run without your yes.

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
      — **NOT MET.** Two paid runs both came back 3/3/3. Off 2, but not a spread
- [x] Reminder openers vary across a sample of replayed runs — **met**, 6 cues in 6
      reminders across two people, none of them "Before next"
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

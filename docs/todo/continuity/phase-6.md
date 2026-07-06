# Phase 6 — The test bench: tweak the past, see the future

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜ · **Cost:** $0 by default (dry-run mode);
live chained run ~$0.70, only with Carl's per-run yes.

## Goal
In the Test engine hub, a **Continuity sandbox**: pick a persona chain (meeting #1 → #2), edit the
carry-forward between them, and *literally see* how a changed brief/plan/outcome changes the next
session — free prompt-diffs by default, a paid live run when you want the real thing.

## Changes
- Test engine hub gains a "Continuity" card: pick a finished run (or persona), see its would-be
  carry-forward payload in an editable form (agreed actions, outcomes, watch-fors).
- **Dry-run (free, the default):** assemble meeting #2's actual inputs with your edited payload and
  show them side by side — the PRIOR SESSION block, the focus/prep prompts as they *would* be sent,
  diffed against the no-carry-forward version. No API call, powered by the fixtures-only path.
- **Live run (paid, gated):** the existing persona runner, chained — runs meeting #2 for real with
  your edited payload; cost stated on the button; lands in the run library; "Compare with previous
  run" pre-wired to the with/without pair; reviewable in the 8-dimension verdict grid.
- Multi-session persona scripts: at least one golden pair (meeting #1 script + meeting #2 script for
  the same persona) checked into the scenario set.

## Not in this phase
- Editing real customers' carry-forward from here (that's the console's job, and it edits switches,
  not history).
- Auto-batch sweeps over many chains (park until a real prompt-tuning need).

## Done when
- [ ] Dry-run shows a faithful prompt diff (spot-checked against a real run's logged prompt) at $0.
- [ ] Editing the payload changes the dry-run diff immediately and only where expected.
- [ ] One live chained run works end to end and lands in review/Compare (with Carl's go).
- [ ] `npm test` + typechecks green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **See the future for free** — open Test engine → Continuity, pick the golden persona pair, hit
   Dry run. You see meeting #2's prompts with the carry-forward block highlighted, next to the
   cold-start version. Costs nothing. ❌ Not OK if it hits the API or shows a summary instead of
   the real text.
2. **Turn one knob** — change one agreed action's outcome from "yes" to "no" and dry-run again.
   Only the follow-through lines change in the diff — you can point at exactly what your tweak did.
3. **The real thing (paid, ~$0.70, your go first)** — press Run live on the same pair. Two runs
   appear in the library; Compare shows meeting #2 with vs without carry-forward; the briefing
   difference is readable in the 8-dimension review grid.
4. **Honest buttons** — every button that would spend money says so before you press it, with the
   number. ❌ Not OK if any path silently calls OpenAI.

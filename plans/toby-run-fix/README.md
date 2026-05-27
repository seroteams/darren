# Toby Run Fix Plan (Split)

Source run: `logs/may/2026_May24_21-46-1eb839fd`  
Primary source plan: `plans/cool-okay-so-peppy-thimble.md`  
Version: v5 (split by phase for incremental execution)

## How to use this split

- Work one phase file at a time.
- Do not execute items from other phase files in the same pass.
- Each phase has its own acceptance gate.
- Keep deferred scope in `deferred-h.md`.

## Execution order

```text
Parallel track (before or during Phase 2):
  Phase 0 (A1-A3) placeholder hard-bug fixes

Phase 1:
  B2 first (axis baseline), then B1/B3

Phase 2:
  C1-C7 prep quality (validator warnings only)

Phase 3:
  D1-D6 planner/arc

Phase 4:
  E1-E4 opener + clarifier constraints

Phase 5:
  F1-F4 briefing quality

Phase 6:
  G1-G5 lexicon (diagnose first, then fix)

Phase 7:
  Full replay + verification
```

## Phase files

- [Phase 0 — A placeholder hard bug](plans/toby-run-fix/phase-0-a-placeholder.md)
- [Phase 1 — B visible flow UX](plans/toby-run-fix/phase-1-b-ux.md)
- [Phase 2 — C prep quality](plans/toby-run-fix/phase-2-c-prep.md)
- [Phase 3 — D conversation architecture](plans/toby-run-fix/phase-3-d-planner.md)
- [Phase 4 — E opener bank](plans/toby-run-fix/phase-4-e-openers.md)
- [Phase 5 — F briefing](plans/toby-run-fix/phase-5-f-briefing.md)
- [Phase 6 — G lexicon](plans/toby-run-fix/phase-6-g-lexicon.md)
- [Phase 7 — replay + verification](plans/toby-run-fix/phase-7-replay.md)
- [Deferred — H](plans/toby-run-fix/deferred-h.md)

## Keep examples (from original plan)

Keep these as positive references and do not "fix" them:

- 22:00:58 good clarifier
- 22:27:38 good closer
- 22:28:07 good headline
- 22:28:28 good understanding paragraph

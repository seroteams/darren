# Active workstreams

Shared board. See `HANDOFF.md` for edit rules.

Statuses: `planning` | `in-progress` | `blocked` | `review` | `done`

---

## Logs tracked in git
- **Owner**: light-ops
- **Status**: done
- **Last touched**: 2026-05-23, light-ops
- **Next step**: —
- **Notes**: commit `90d7b0d` — dropped `logs/` from `.gitignore`, committed 1347 files.

## Pipeline run review workflow
- **Owner**: work-machine
- **Status**: planning
- **Last touched**: 2026-05-23, light-ops (seeded)
- **Next step**: work-machine to define what `reviewrun` skill should produce + how it shapes next iteration.
- **Notes**: skill exists; needs intent + output format spec.

## Feedback backlog → ready for next test run
- **Owner**: work-machine
- **Status**: in-progress
- **Last touched**: 2026-05-23, light-ops (audit + 1 fix)
- **Next step**: work-machine to clear remaining prompt/UX items before next eval run.
- **Notes**: Full audit of 13 memory feedback items + 4 new log comments in this conversation's review.
  - ✅ Done by light-ops this turn: item 4 (coreIssue → one sentence ≤28 words, `prompts/preparation.md`).
  - 🟢 Already in place: items 1, 3, 11, 13 (plan format, focus-points unselected default, axis seeds, UI canon).
  - 🟡 Partial: item 7 (wind-down — only fires at budget=1; needs 2-turn taper), item 9 (briefing typography — no 2-col layout, questioning text default size), item 10 (`watch_for` → "Reminders" relabel only; contract + copy-paste affordance missing).
  - 🔴 Open — heavy-ops:
    - Item 5: no-restate-question rule in `prompts/plan-turn.md`.
    - Item 6: promise tracking ("I'll share my view") + no snap-back to seed openers, `prompts/plan-turn.md`.
    - Item 8: notes carry `question_alias`/stem, backend + UI (`frontend/server/handlers/notes.js`, `frontend/client/src/ui/notes-panel.js`).
  - 🆕 New from logs, not yet memorised:
    - N1 (May18_21-53): "What we will cover" header duplicated on focus-points stage.
    - N2 (May18_21-53): "When have you felt most like yourself recently?" opener feels strange — review intro question bank for Growth & career plan.
    - N3 (May18_21-53): post-briefing CTA should read "Complete 1:1" → next page lexicon picker (yes/no per term).
    - N4 (May23_13-01): focus-point `reason` copy reads non-human — tighten `prompts/generate-focus-points.md`.

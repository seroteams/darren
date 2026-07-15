# backend/engine/briefing.ts
Role:   pretty-prints the stage-5 evaluation (a Briefing) to the terminal for the CLI, matching backend/cli.ts styling.
Key:    renderBriefing(evalJson, employeeName) — the export the CLI path calls.
Types:  Briefing / NextAction, from backend/shared/briefing.types.ts.
Couples to: ./ui.ts (colour helpers); the Briefing shape produced by reviewer.ts (stage 5).
Gotcha: an unread axis must show "not read", never a seed score of -1 — that's no-data, not a faint negative read (inline note ~line 43).

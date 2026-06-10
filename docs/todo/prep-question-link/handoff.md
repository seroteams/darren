# Handoff — prep-question-link

**Updated:** 2026-06-10, after Phase 2 (both phases done)

## Where we are
Both phases built and verified live. The prep brief now drives the questions: the prep opening question becomes the first substantive question, and the live planner stays grounded in the brief.

## What landed
**Phase 1 — opener link**
- The prep brief (`openingQuestion`, `coreIssue`, `listenFor`) is threaded into the question generator in both runtimes (CLI + frontend). It was previously shown to the manager and thrown away.
- The bank generates one question labelled `Prep opener` that restates the prep opening question in fresh words (`<prep_alignment>` in `prompts/generate-questions.md`).
- It's placed right after the warm opener and **pinned** there each turn until asked — the planner re-plans freely and would otherwise bury it (same protection the closer gets).
- Files: `cli.js`, `src/cli/stages/question-bank.js`, `src/cli/stages/questioning.js`, `frontend/server/handlers/bank.js`, `frontend/server/sessions.js`, `frontend/server/session-persistence.js`, `src/question-generator.js` (`assembleQueueWithPrepOpener` / `findPrepOpener` / `pinPrepOpenerEarly`), `prompts/generate-questions.md`.

**Phase 2 — stay-on-brief + diagnostics**
- The prep brief is threaded into `planTurn` in both runtimes; `prompts/plan-turn.md` gained the brief in `<session_context>` and planning rule 13 ("on-brief grounding") — added questions must trace to the core issue or a listen-for signal, but live thread-follows always win.
- Two diagnostics in `scripts/lib/session-scores.js`, surfaced in the gate: `opener_link` (first substantive Q carries the brief?) and `on_brief` (fraction of substantive questions on-brief). Kept out of the existing `mean` so baselines didn't move.
- Files: `src/cli/stages/questioning.js`, `frontend/server/handlers/plan.js`, `src/queue-manager.js`, `prompts/plan-turn.md`, `scripts/lib/session-scores.js`, `scripts/gate.js`.

## How it was verified
- `npm run smoke` — 13/13 unit + 22/22 pipeline. Transcript confirms the warm opener at T1 and the `Prep opener` at T2 (reworded, not verbatim).
- `npm run gate` — 7/7 ok (5 happy + `leak-devon` + `thin-sam`). No regressions.
- Diagnostics across the 7 gate cases: `opener_link = 1` everywhere; `on_brief` 1.00 (Performance), 0.75–0.80 (bi-weekly/growth), 0.40–0.43 ("feels-off", which ranges wide by design).
- Note: this only shows in **manual** runs — scripted persona runs freeze the question path by design.

## Open / nice-to-have (not blocking)
- `on_brief` uses crude word-overlap against `coreIssue`+`listenFor` only (not the full focus points), so it reads low on wide-ranging arcs ("feels-off"). It's directional, not ground truth — fine as a diagnostic.
- Optional tuning: the prep opener currently always takes Q2 even if the warm opener's answer opens a strong thread. If that ever feels too rigid, let a strong thread-follow win Q2 and pin the opener to Q3 instead.
- Pre-existing (untouched by this work): `npm run eval` has fixture failures on prep `confidence`/`dontAssume` and a `maria-growth` scenario answer-count — separate from this change.

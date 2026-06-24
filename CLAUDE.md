Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Acting

**Make the reasonable call. Move forward. Flag assumptions after, not before.**

- Pick the most likely interpretation and go. Don't present multiple options and wait.
- State assumptions briefly in your response — don't stop to ask about them first.
- Push back when a simpler approach exists. Say so once, then do it the better way.
- Only stop if you're genuinely blocked on something only the user can answer.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Define Done

**Know what success looks like before you start.**

Before starting a multi-step task, state briefly what "done" means:
- What will be different when this is complete?
- How will you know it worked?

For this project, "done" usually means: the behavior changed in the way asked, it looks right, and nothing nearby broke.

---

## 5. The Darren Method (multi-step work)

For any change big enough to need a plan, use the **Darren Method** (the `darren-method` skill). Split the plan into `docs/todo/<slug>/` — a `PLAN.md` overview plus phase files, each ending with QA scenarios — then do **one phase at a time**, keeping "Current state" in `PLAN.md` up to date between phases. Doing 3 (or 9) phases ahead of itself is waiting for problems. The **product owner** walks the scenarios and tests each phase; the next phase doesn't start until they give the green light — you don't self-certify. Spread the work over days.

The phase rituals:
- **Baseline first.** Before touching anything, run `npm run gate` (and smoke if relevant) and note the result — so pre-existing failures don't get blamed on the new work.
- **Green light = commit.** The moment a phase is approved, commit it (local only — no push/PR unless asked). Don't let tested work pile up uncommitted.
- **Close out.** When every phase is ✅, move the folder to `docs/todo/done/`.
- **Park, don't expand.** Cut scope and follow-up ideas go in PLAN.md's "Parked" section, not into the current phase.

---

## 6. This Project's Standing Rules

These are recurring corrections, promoted from memory so they hold every session:

- **Engine honesty — no silent masking.** Surface raw model output. Detect problems and flag them; never hardcode text rewrites to hide them.
- **Focus arc gate.** Bi-weekly and "feels-off" meeting types exclude competencies. Respect the input filter and the `FOCUS_ARC_LEAK` gate.
- **Plain language.** User-facing copy and my own replies stay short and jargon-free.
- **Simple-terms wrap-up.** End every reply with a short "In simple terms:" line (a sentence or two, no tech-speak) summing up what it means for the user.
- **Verify before "done".** For any prompt or engine change, run `npm run gate` (and `npm run smoke` / `npm run eval` as relevant) and report the result — don't self-certify — but see the cost rule below: paid checks need a go-ahead; report offline results otherwise.
- **Cost control — no paid runs without a yes.** Anything that hits the OpenAI API (`npm run gate`, `npm run smoke`, `npm run eval`, persona runs, live replays) needs Carl's explicit go-ahead *for that specific run*, with a rough cost stated first (~$0.35 per pipeline run, ~$3 for the full gate). Default to free checks: `npm test` and `node scripts/replay-scenario.js <id> --fixtures-only`. When a live run is approved, run the smallest thing that proves the point — `node scripts/gate.js --only <case>` — never the full 8-case sweep or repeats unless Carl asks for them.
- **Guardrails — warn Carl when he strays.** Check every request from Carl against the five drift types in [docs/GUARDRAILS.md](docs/GUARDRAILS.md): goal drift (features/polish), pace drift (jumping ahead / skipping QA), honesty drift (flattery / hiding problems), money drift (paid runs), scope creep. If one fires, lead the reply with the ⚠️ warning block (drift type / why / on-track move / your call); if nothing strays, say nothing. Advise, never block — Carl can always proceed.

---

## 7. House Rules — auto-loaded skills (Phase 002)

The agent auto-loads the right rulebook for the work (each skill triggers on its own description). Apply:

- **Backend work** (engine, API, services, repos, types) → [`backend-conventions`](.claude/skills/backend-conventions/SKILL.md): TypeScript tight contracts, kebab-case + role-suffix names, slim controller → service → co-located repo, RESTful `/api/v1/`, honest errors, mirrored tests.
- **Frontend / UI work** (admin console, future customer app) → [`frontend-conventions`](.claude/skills/frontend-conventions/SKILL.md): TypeScript, component/page/hook naming, composition, 14px text floor, plain language, mirrored tests.
- **Any feature or bugfix** → [`test-driven-development`](.claude/skills/test-driven-development/SKILL.md): red → green → refactor; no production code without a failing test first.
- **Security review** → [`security-review`](.claude/skills/security-review/SKILL.md): confidence-gated, research before flagging, no false alarms.

From Phase 002 on: all **new** code is TypeScript (strict — `npm run typecheck`) and **test-first**. (Converting the existing JavaScript is Phase 003.)

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and fewer interruptions mid-task.
# Handover — eval-prompt consolidation + next steps

**Written:** 2026-06-02
**For:** next AI session (engine work)
**Repo:** seroteams/darren — https://github.com/seroteams/darren.git

---

## TL;DR

A 4-finding architecture assessment was done against the user's goal: *improve the
1:1 engine only* (clear arcs for 5 meeting types, better prompts, great product;
it is NOT standalone — it slots into a bigger system later).

**Finding #2 (eval-prompt duplication) is DONE and verified, but NOT committed.**
Findings #1, #3, #4 are queued, not started.

A PR was requested but **blocked on a user decision** (see "Open: PR" below). The
user dismissed the choice prompt — do not push or commit without asking again.

---

## State of the trees (READ THIS FIRST)

Two checkouts of the same repo on this machine:

| Path | Branch | Contents |
|---|---|---|
| `C:\Users\User\Documents\Sero\darren` (MAIN) | `refactor/one-on-one-types` | The engine + **the eval consolidation work** (uncommitted) + pre-existing uncommitted WIP |
| `…\.claude\worktrees\strange-shannon-2722ef` | `claude/strange-shannon-2722ef` | **Predates the Type split** (old flat `meeting-arcs.js`, no `one-on-one-types/`). Only holds a `.claude` cleanup. |

The engine lives on `refactor/one-on-one-types` in MAIN. Do engine work there.

**Do NOT sweep these pre-existing WIP files into a commit** (uncommitted in MAIN
before this session, NOT part of the consolidation): `prompts/plan-turn.md`,
`frontend/client/src/**`, `src/one-on-one-types/bi-weekly/type.js`,
`questions/_index.json`, and ~28 untracked `questions/q_*.yaml` +
`frontend/client/src/stages/run-debrief.js`.

---

## DONE this session — Finding #2: eval-prompt consolidation

**Problem:** 3 of 5 meeting Types forked the entire ~300-line `final-evaluation.md`
just to add a few lines of per-type rules. ~895 duplicated lines that silently
drift. The growth fork had already drifted — it dropped the
`{{TONE_REGISTER}}` / `{{ANTI_PATTERNS_JSON}}` / `{{MEETING_ARC_JSON}}` tail, so
growth evals ran with NO per-type tone injection (a live bug).

**Fix:** one shared eval prompt + a `{{TYPE_EVAL_RULES}}` slot fed by a new
`eval_rules` field on each Type — mirroring how `tone_register`/`anti_patterns`
already inject. Deleted all 3 forks. Restores growth's lost tone blocks as a
side effect.

**Files changed (these 8 are the consolidation — separable from the pre-existing WIP):**
- `prompts/final-evaluation.md` — added `{{TYPE_EVAL_RULES}}` slot (after `</persona>`)
- `src/reviewer.js` — import `getType`; inject `typeEvalRules` (safe-fallback `""`)
- `src/one-on-one-types/growth/type.js` — dropped `evaluation:` override + unused `path` import; added `eval_rules`
- `src/one-on-one-types/feels-off/type.js` — same
- `src/one-on-one-types/onboarding/type.js` — same
- DELETED `src/one-on-one-types/{growth,feels-off,onboarding}/prompts/final-evaluation.md`

**Net:** −895 / +49 lines. bi-weekly + performance use the shared prompt with no `eval_rules` (inject nothing).

**Verified PASS:**
- `node scripts/test-lexicon.js` → All checks passed
- `node scripts/test-opener-routing.js` → PASS
- Inline check: all 5 Types resolve eval to the shared prompt, fill every
  `{{…}}` placeholder, and inject `<type_eval_rules>` only where defined.

---

## OPEN: PR (blocked — needs user decision)

The user ran the create-PR command but **dismissed** the clarifying prompt. Do not
act until they choose. Blockers surfaced:

1. **`gh` CLI is not installed.** Cannot `gh pr create`. Either push + hand over a
   GitHub compare URL, or install gh (winget/scoop) + auth first.
2. **Two unrelated change sets on two branches** — the create-PR command targeted
   the worktree branch, which has only the `.claude` cleanup, NOT the engine work.

Decisions needed: which change set to PR (eval consolidation / `.claude` cleanup /
both), and whether to commit only the 8 consolidation files selectively (leaving
the pre-existing WIP). Note `refactor/one-on-one-types` likely already has PR #1 — pushing
there appends to it. Local `refactor/one-on-one-types` is 1 commit ahead of origin.

---

## NEXT — queued findings (not started), do in this order

1. **#3 Surface cleanup (fast, high relief).** `questions/_archive/` holds 2,133 of
   2,183 question files (97%); only ~48 are live. `logs/` is 2.9 MB committed into
   the tree. Get both out of the working tree (separate location or gitignore +
   external). Pure noise removal, no logic risk.
2. **#1 Engine boundary (the real "fits into a bigger system" prep).** No
   `src/index.js` public API — the frontend reaches into 20 internal `src/`
   modules, and the dependency is INVERTED: `cli.js` imports `INTRO_BUDGET` /
   `DYNAMIC_BUDGET` from `frontend/server/sessions.js`. Define one `src/index.js`
   exposing the pipeline (focus-points → preparation → question-bank → questioning
   → evaluation) + the Type registry; move the budget constants into the engine;
   make frontend AND cli consume only the index.
3. **#4 `prompts/plan-turn.md` readability pass.** 503 lines, the per-turn planner
   (most-churned prompt). Defer until #2 is committed; it's also currently dirty
   (uncommitted WIP) — check before touching.

---

## Engine quick-map (for orientation)

- 5 Types: `bi-weekly`, `performance`, `growth`, `feels-off`, `onboarding` in
  `src/one-on-one-types/<slug>/type.js` (registry: `index.js` → `getType`,
  `listTypes`, `promptFor`). Arcs are well-defined — leave them alone.
- Pipeline stages: focus-points (`generate.js`) → preparation (`preparation.js`) →
  question-bank (`questions.js`/`question-generator.js`) → questioning loop
  (`queue-manager.js`, 675 lines — biggest) → evaluation (`reviewer.js` +
  `briefing.js`).
- Shared prompts: `prompts/`. House set wired in `src/one-on-one-types/_shared/prompts.js`.
- `meeting-arcs.js` is a 9-line back-compat shim; `meeting-types.js` is just picker copy.
- Read `PLAN.md` (workstream board) at root first.

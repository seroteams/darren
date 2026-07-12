# Phase 5 — The AI call (Summary draft + private suggestions)

**Part of:** [plan.md](plan.md) · **Status:** ✅ · **Size:** ~1 day · **⚠️ the only paid phase**

## ✅ GREEN-LIT 2026-07-13 (sign-off delegated — Carl "go to end")
Shipped `16d37b7e`. `backend/engine/guided/wrapup.ts` mirrors the engine's single-shot structured
call (callAI/schema/parseAIJson/logStage → run_artifacts); prompt `content/prompts/guided-wrapup.md`
(no-invention), `models.json` key `guided_wrapup` = gpt-5.4-mini. `wrapupDraft` assembles the grounded
input, caches in `state.summary.draft` (no double-spend), AI injected as a boundary (service tests
model-free; `guided-runtime.ts` wires the real engine). UI: Summary shows the draft (edit wins) +
Regenerate; Review renders the private buckets. Engine honesty: a failure surfaces "couldn't draft this",
never a rewrite. **Verified:** typecheck clean · 131/132 · OFFLINE cassette ($0, parse + honest failure) ·
**ONE LIVE call (~$0.05)** drafting a GROUNDED summary — "Development moved from 5 to 7", "the promise to
book the onboarding buddy was kept" (no invention) · run_artifacts g-wrapup rows written. One-paid-run
ceiling honoured (no retry).

## Goal
The single agreed AI moment works: ONE end-of-session call drafts the Summary (from this session's inputs + the previous check-in) and the Review stage's private suggestion buckets — always editable, never final until the manager says so. (The prep-focus call was cut with the Prep stage, 2026-07-12.)

## Changes
- New `backend/engine/guided/wrapup.ts` — `generateGuidedWrapup`: input = all stage notes + promise outcomes + block scores + tracker changes this session + the PREVIOUS completed check-in's summary/scores; ONE call; schema `{summary:{headline,bullets[]}, suggestions:{individual[],team[],company[]}}`; prompt `content/prompts/guided-wrapup.md`; `modelFor("guided_wrapup")`; `logStage(…, "g-wrapup", …)` → `run_artifacts`.
- Reuse: `callAI` (cassette replay + cost tracking), `splitSystemUser`/`fillPlaceholders`, `withPromptVersion`. Injected as a service boundary (Prewarm pattern) so service tests stay model-free. NEVER require `scripts/gate.js`.
- `content/config/models.json`: add the `guided_wrapup` key.
- API: `POST /guided-sessions/:id/wrapup-draft` — fires when the manager enters Summary (or on demand); cached in `state.summary.draft` unless `?regenerate=1`; manager edits land via normal PATCH into `state.summary.edited` (edited ALWAYS wins).
- UI: Summary becomes "draft appears (with the 'Drafted by Sero from this session + your last check-in' note) → edit in place"; Review renders the three suggestion buckets, each editable/deletable.
- Engine honesty: raw model output shown as-is; schema failure surfaces as a visible "couldn't draft this — write it yourself or retry" state, never a hardcoded rewrite. First-ever session (no previous check-in) prompts without the prior-session block — stated, not faked.

## Not in this phase
- Record template / list merge (Phase 6), member lane (Phase 7). No AI beyond this one call site.

## Done when
- [x] Call proven offline first (hand-authored cassette, $0), then ONE live happy-path run (~$0.05, gpt-5.4-mini — no retry)
- [x] `run_artifacts` rows exist for the g-wrapup stage — verified (3 rows: inputs.json / prompt.md / response.json)
- [x] `npm run typecheck` + `npm test` green (typecheck clean · 131/132; 1 known-env `test-persona-bench`)
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **A draft that knows the month** — finish a session with real inputs: the summary references what actually happened (scores that moved, promises kept/missed), not generic filler. ❌ Not OK if it invents facts.
2. **Draft, edit, trust** — change a line of the draft, finish, reopen: YOUR text is what's saved. ❌ Not OK if edits are lost.
3. **Suggestions render private** — Review shows individual / team / company buckets, editable, and they never appear outside Review.
4. **No double spend** — leave Summary and come back: no second paid call (cached). ❌ Not OK if every visit costs money.
5. **Honest failure** — (offline, forced) a schema-failing response shows "couldn't draft this", with manual writing still possible.

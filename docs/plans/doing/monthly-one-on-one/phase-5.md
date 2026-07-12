# Phase 5 — The AI call (Summary draft + private suggestions)

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Size:** ~1 day · **⚠️ the only paid phase**

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
- [ ] Call proven offline first (cassette replay / recorded fixture), then ONE live happy-path run (~$0.05–0.35 — state cost before running; a 2nd live run needs Carl's yes)
- [ ] `run_artifacts` rows exist for the g-wrapup stage (query the table)
- [ ] `npm run typecheck` + `npm test` green
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **A draft that knows the month** — finish a session with real inputs: the summary references what actually happened (scores that moved, promises kept/missed), not generic filler. ❌ Not OK if it invents facts.
2. **Draft, edit, trust** — change a line of the draft, finish, reopen: YOUR text is what's saved. ❌ Not OK if edits are lost.
3. **Suggestions render private** — Review shows individual / team / company buckets, editable, and they never appear outside Review.
4. **No double spend** — leave Summary and come back: no second paid call (cached). ❌ Not OK if every visit costs money.
5. **Honest failure** — (offline, forced) a schema-failing response shows "couldn't draft this", with manual writing still possible.

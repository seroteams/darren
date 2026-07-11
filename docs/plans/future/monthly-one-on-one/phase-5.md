# Phase 5 — The two AI calls

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Size:** ~1–1.5 days · **⚠️ the only paid phase**

## Goal
The two agreed AI moments work: focus bullets on the prep screen, and one end-of-session call that drafts the Summary and the Review stage's action suggestions — always editable, never final until the manager says so.

## Changes
- New `backend/engine/guided/`:
  - `prep-focus.ts` — `generateGuidedPrepFocus`: input = person context + open trackers + block trends + days since last + last summary; prompt `content/prompts/guided-prep-focus.md`; strict `{bullets: string[] (2–3)}` schema; `modelFor("guided_prep")`; `logStage(…, "g1-prep-focus", …)`.
  - `wrapup.ts` — `generateGuidedWrapup`: input = all stage notes + block scores + tracker changes this session; ONE call; schema `{summary:{headline,bullets[]}, suggestions:{individual[],team[],company[]}}`; `modelFor("guided_wrapup")`; `logStage(…, "g2-wrapup", …)`.
  - Reuse: `callAI` (cassette replay + cost tracking), `splitSystemUser`/`fillPlaceholders`, `withPromptVersion`. Injected as service boundaries (Prewarm pattern) so service tests stay model-free. NEVER require `scripts/gate.js`.
- `content/config/models.json`: add `guided_prep` + `guided_wrapup` keys.
- API: `POST /guided-sessions/:id/prep-focus` (cached in `state.prep.aiFocus` unless `?regenerate=1`) and `POST /guided-sessions/:id/wrapup-draft` (cached in state; manager edits land via normal PATCH).
- UI: prep screen AI bullets with loading state + regenerate; Summary stage becomes "draft appears → edit in place"; Review stage renders the three suggestion buckets, each editable/deletable.
- Engine honesty: raw model output shown as-is; schema failures surface as a visible "couldn't draft this" state, never a hardcoded rewrite.

## Not in this phase
- Record template / list merge (Phase 6). No AI beyond the two call sites.

## Done when
- [ ] Both calls proven offline first (cassette replay / recorded fixtures), then ONE live happy-path run (~$0.05–0.35 — state cost before running; a 2nd live run needs Carl's yes)
- [ ] `run_artifacts` rows exist for g1/g2 stages (query the table)
- [ ] `npm run typecheck` + `npm test` green
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Bullets that know the person** — open prep for someone with real open trackers: the 2–3 bullets reference their actual promises/requests/trends, not generic advice. ❌ Not OK if a bullet invents facts.
2. **Draft, edit, trust** — enter Summary: a draft appears. Change a line. Finish. Reopen the session: YOUR edited text is what's saved, not the model's. ❌ Not OK if edits are lost.
3. **Suggestions render** — Review shows individual / team / company suggestion buckets; you can edit or remove each.
4. **No double spend** — leave Summary and come back: no second paid call fires (cached draft). ❌ Not OK if every visit costs money.

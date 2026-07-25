# Home screen: inviting and honest

**Goal:** A manager's Home tells the truth about their 1:1s and makes the next move obvious, so a half-done prep is easy to pick up and a first prep is easy to start.
**Driver:** Carl
**Created:** 2026-07-25
**Mockup:** https://claude.ai/code/artifact/575e2d3b-23e5-40f2-981a-e17fe66d1f92 (approved 2026-07-25)
**Board:** https://claude.ai/code/artifact/1bd8cf59-7f54-497e-8a8d-f6c10739c393

## Why

Carl's Home currently shows three identical rows reading `Carl Heaton · UX Lead · Carl@webcoursesbangkok.com · Bi-weekly check-in`. That is a broken data path, not a styling problem: `runs.service.ts` re-cuts the `/runs/recent` payload to six fields and drops `ctx`, so `start-core.js` falls back to the raw headline blob. An email address is printed on the customer screen and the DESIGN.md Name-Wins Rule is broken.

At validation stage the only number that matters is whether a manager returns unprompted for a second real prep ([gtm-validation-plan.md](../../../reference/gtm-validation-plan.md)). Home has two jobs in service of that: make starting a prep obvious, and make picking up a half-done one effortless.

## Done means

- No row on Home ever shows an email address or a middot blob. Every row leads with a person's name.
- A half-finished prep is visibly marked and sits at the top of the list. Clicking it lands back where you left off.
- A brand-new manager sees an invitation card with the one blue button inside it.
- The seeded example 1:1 says it is an example.
- Losing the network shows "Couldn't load your 1:1s", never "First time?".

## Scope guard

In scope: prepare → questions → summary. Out and staying out: scheduling, attention signals, cross-run patterns, due dates, team analytics (all tagged not-data-backed in [manager-workspace-prototype](../../done/manager-workspace-prototype/)). **No nudge features** ([SERO_BOARD.md](../../../../SERO_BOARD.md) line 32) because the pass bar is an *unprompted* return.

## Resolved before we start

- **`ctx` is already on both repo payloads.** `run-history.ts:231-236` and `runs-store.ts:412-416` both return it. Only the service mapper drops it, so Phase 1 needs **no repo change at all**.
- **The email lives in `ctx.seniority`.** `buildHeadline` joins `name · role · seniority · meetingType`, and the third segment in Carl's rows is his email. Something wrote an email into a seniority field. Phase 1 stops Home receiving that field at all; the underlying data question is parked below.
- **`state.isDemo` already exists** (`session-persistence.ts:63`, written by `demo-seed.service.ts:134`) but is not on the recent-run payload. Surfacing it needs `run-history.ts` + `runs-store.ts`, **both currently claimed by another chat's lane**, so it is deferred to Phase 3.
- **The accent-budget guard is a source-text count** (`start-core.test.ts:59-60` matches `/class="btn js-/g` and requires exactly 1). Phase 2 therefore *moves* the existing button node rather than adding a second one.
- **Status stays one bit.** `inferStage` returns `EVAL` for "answered everything, no briefing yet" and `FOCUS_POINTS` for "typed a name and stopped", so a "step 3 of 7" chip would be dishonest at both ends.

## Phases

| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Rows that tell the truth | Bold person name, quiet "type · date" line, "Half done" chip hoisted to the top, a real error state | ✅ |
| 2 | One obvious way in | The first-run card gets the single blue button inside it, moved out of the list, state-aware lede | ✅ |
| 3 | The example, labelled | `isDemo` on the payload and an "Example" chip on the seeded row | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state

**Phase 1 ✅ green-lit 2026-07-25.** Home rows now lead with the person's name (no email, no middot blob), an unfinished prep is chipped "Half done" and hoisted to the top, a failed fetch says so instead of claiming you have never run a 1:1, and the stale-resume recovery card can no longer multiply. Baseline before the work was `npm test` 184/185 (the single failure was another chat's in-flight duplicate `rehydrateById` in `frontend/src/main.js`, since fixed by them). After: 186/186, typecheck clean, both lint guards PASS, no paid runs. Live proof recorded in [phase-1.md](phase-1.md).

**Phase 2 ✅ green-lit 2026-07-25.** A manager with no 1:1s now gets the "First time?" card with the screen's one blue button inside it (the same DOM node, moved, so no second accent can exist), the card sits outside the recents list so nothing can nest, and the header lede stops promising a pick-up to someone with nothing to pick up.

**Next: Phase 3 (The example, labelled).** Needs `run-history.ts` + `runs-store.ts`; check [LANES.md](../../../../LANES.md) before starting.

## Parked

- **A "Half done" prep older than 7 days can never actually be resumed.** The run list is Postgres-durable forever, but the live session behind it is swept on a 7-day TTL (`SESSION_TTL_MS`, `backend/api/sessions.ts:18`). So an old unfinished prep now carries a chip inviting a click that can only land on the recovery card. Graceful, but not honest. Options worth costing: expose the TTL so the chip stops after 7 days, persist enough state to resume from Postgres, or say "expired" on the row. Needs Carl's call, not a guess.
- **An email address is stored in `ctx.seniority`.** Phase 1 stops Home receiving it, but the value is still in the DB, still inside `headline`, and still served by `/runs/mine`. Worth its own look.
- **"See all past 1:1s" cannot label the example.** `pgListFinishedRunsForMember` does not filter demo rows and `toMemberRow` does not carry `isDemo`. Not in demo-member Phase 2's list either. Should be added there.
- **`runs.ts` keeps a second `whenLabel` copy** if the shared-helper consolidation has to stay narrow.
- **demo-member Phase 2 overlap.** That plan claims the Example pill on Home; this plan takes the Home label only and its Home bullet gets struck with a pointer here. Badge on Team / person detail / recap and the "Remove example" action stay there, because removal must delete the person and the run together.

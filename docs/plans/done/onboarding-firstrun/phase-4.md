# Phase 4 — Sweep and truth

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-26 — Carl's green light on the sweep; the plan is closed. The one step that cannot be done yet (the walk on the live build) waits for his next "go live"

## Built (2026-07-26)

### The sweep — what else knows about the first run
Every caller of the first-run rule and every screen that could change the answer, checked:

| Surface | Verdict |
|---|---|
| Home (`start-core.js`) | Owns the fetch; tells the rail on every render |
| Prep wizard (`intake.js`) | Same shared rule since P1 |
| Left rail (`frontend/src/ui/app-nav.js`) | Reads the flag; managers only |
| Delete a 1:1 from Home's row menu | Re-fetches and re-renders, so the answer follows. No stale rail |
| Discard a run from the session topbar | Home re-fetches on return. Correct |
| Guest claim (`guest.ts` → run detail) | Answer stays unknown, so the full rail shows. Correct: they DO have a real 1:1 |
| Member landing (`member-home.js`) | Untouched; the quiet rail is manager-only, and a member's rail is one row |
| Invite / join | Never lands on Home |
| Test-engine page | No Home state at all |
| **Admin console Home (`start.js` + bench)** | **FIXED HERE.** A runless internal account would have been shown the customer welcome, video and all. One clause (`&& !bench`) keeps the console on its own Home, matching the file's existing "internal QA is not the first-run audience" rule |

### Alignment with demo-member P2
[demo-member/plan.md](../demo-member/plan.md) gained a "Must agree with" section: its "Remove example" must call the shared `hasRealRuns()` rather than compute its own, because two copies of that rule is exactly what caused the P1 bug. Removing the example correctly leaves the welcome and quiet rail in place, and the sample card already drops its link when there is no example run.

### The record
- `docs/reports/sero-changelog.html` — a customer entry (what a new manager now sees) and an internal entry (the whole track, incl. the parked items and what the CSP change did and did not open).
- `docs/reports/sero-how-it-works.html` — a Jul 25-26 log item naming the live bug honestly.

### Proof
- `npm test` **189/189**, typecheck clean, `lint:copy` PASS, `lint:tokens` PASS.
- Regression screenshot after the sweep fix: [proof/p4-final-welcome.png](proof/p4-final-welcome.png) (customer app unchanged by the bench clause).

### Honest gaps for the walk
- **Not on sero.team.** Everything is committed locally and ships on your next "go live". The plan's original "walk it on the live build" step is the one thing that cannot be done until then.
- The admin console's runless Home is covered by the source guard, not by a screenshot: it needs a fresh internal account, and no real user is in that state.
- Not touched, on purpose: `docs/screen-gallery/` still holds the pre-onboarding Home shot. That folder belongs to the design-consolidation lane.

## Goal
Every dependent surface agrees with the new first run, and the record tells the truth.

## Changes
- Dependency sweep (the dependency-check ritual): both apps, the test-engine page, guest flow, invite/member landing — anywhere the first-run rule or Home state is assumed.
- Alignment with demo-member P2: "Remove example" and the rail gate both use the Phase 1 helper; removing the example must not re-lock the rail.
- `docs/sero-changelog.html` + `docs/sero-how-it-works.html` refreshed (customer-facing entry for the new first run).
- Proof pack: screenshots of the real rendered screens (fresh account, desktop + mobile) attached to this folder.

## Not in this phase
- New features of any kind; this phase only reconciles and records.

## Done when
- [ ] The register → first brief → unfolded app walk works on the live build, screenshotted.
- [ ] No surface still claims the old first run (guide, changelog, in-app copy).
- [ ] Product owner has tested the scenario below and said go.

## Test scenarios — for the product owner
1. **The full stranger walk** — `live > incognito > sero.team > register a fresh test account`: welcome screen → watch 10 seconds of the video → open the sample → run a real prep → app unfolds. The whole journey makes sense with no explanation from us.
2. **The record agrees** — open the changelog page: the new first run is described in customer words.

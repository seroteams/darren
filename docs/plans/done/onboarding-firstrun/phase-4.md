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
| **Admin console Home (`start.js` + bench)** | **FIXED HERE, then fixed properly.** A runless internal account would have been shown the customer welcome, video and all. The first fix keyed on the persona bench (`&& !bench`) and was WRONG: the bench is switched off on live (`start.js`), so the fence passed locally and would have failed on the only environment that matters. Now keyed on the role (`&& !isInternalAdmin(store.user)`), which has no environment dependence. See the review pass below |

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
- The admin console's runless Home is covered by a guard, not by a screenshot: it needs a fresh internal account, and no real user is in that state. (The first version of that guard was wrong; see the review pass at the end of this file.)
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

---

## Post-close review pass (2026-07-26, Carl: "check all done well")

An adversarial read of all four phases' commits found three real defects in work that had
already been green-lit. All three are fixed and committed; the plan stays closed.

| # | Defect | Why it mattered | Fix |
|---|---|---|---|
| 1 | The internal fence keyed on the persona bench | `bench = isInternalAdmin && !isLiveEnv()`, so on **live** it is null and every internal account with no real runs would have been shown the customer welcome, video and all. Passed locally, would have failed on the deploy | Keys on the role now: `!isInternalAdmin(store.user)`. Test pins the expression AND asserts the bench version is gone |
| 2 | The first-visit answer survived a logout | Logging out of the customer app is pure SPA with no reload, so manager A's "no runs yet" was still in memory when manager B signed in: a veteran would get the newcomer's stripped rail, and if B landed anywhere other than Home (a claimed guest run) it would never correct itself | `forgetFirstVisit()` on logout, back to unknown. New tests for the A-then-B cycle |
| 3 | A failed runs fetch left the last answer standing | `renderError()` restored the header and recents but not the rail, so a manager could read "Couldn't load your 1:1s" on a rail with no route to Team or Past 1:1s | `forgetFirstVisit()` in `renderError()`; unknown never quiets the rail |

Also: the video iframe carried `referrerpolicy="strict-origin-when-cross-origin"`, which
would have sent our origin to Google on play, quietly loosening the site's own
`Referrer-Policy: same-origin`. Now `no-referrer`. And `.intake-firstrun__action` CSS was
dead once P2 removed its producer; deleted.

**The lesson worth keeping:** defect 1 shipped because the test pinned the *expression*
rather than the *behaviour*, and the expression's truth depended on the environment. A
source-text guard cannot see that. Where a fence must hold everywhere, it has to be built
from something that does not change between local and live.

Checks after the fixes: `npm test` **191/191**, typecheck, both linters, and the welcome
re-screenshotted on a fresh local signup. Not walked live: an internal account with zero
real runs (no real user is in that state); the role predicate was probed directly instead.

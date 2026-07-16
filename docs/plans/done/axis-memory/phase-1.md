# Phase 1 — Last-1:1 axis read on the person page

**Part of:** [plan.md](plan.md) · **Status:** ✅ done (tested)

## ✅ GREEN-LIT 2026-07-16 — Carl signed off ("signed off") (commit 075b1aec)
The "Last 1:1" axis line ships on the manager's person page: last session's four reads as
labelled past context, unread axes honest ("not read", never a 0), no scoring change.
Committed local-only; **not pushed** (a release would ship 8 other sessions' unpushed commits —
held for Carl's separate go).

## Built (2026-07-16)
Landed while Carl was asleep (he asked me to finish it + report). Files:
- `frontend/src/stages/person-axes.ts` — new pure module: `renderLastAxes(axes, whenLabel)`. Shows each read axis's signed score; an unread axis shows **"not read"**, never a 0. Returns "" when nothing was read.
- `frontend/src/stages/person-axes.test.ts` — 7 cases (signed scores, not-read honesty, read-0 is real, empty cases, canonical order). **7/7 pass.**
- `frontend/src/stages/person-detail.ts` — folds the axis line into the existing "Since last time" section; passes the run date.
- `admin/src/styles/design/admin-tables.css` — `.since-axes` styling to match the sibling `.since__*` rules.

**Offline proof (all free):** new helper 7/7 · `npm run typecheck` clean · `npm run build` clean · rendered on the real screen against the compiled CSS — line reads *"Last 1:1 · 4 days ago · Wellbeing not read · Engagement +6 · Clarity −5 · Growth not read"*, flex-wrap, **14px** (font-floor met).

**Honest residuals:**
- **Not walked by Carl** in the live authenticated app (scenario 1) — the logged-in person page with real data needs his account; verified the render in isolation instead. This is the one thing still owed before green-light.
- Baseline was `npm test` **143/143**. Full suite now shows **143/145** — the 2 failures are `backend/api/router.test.ts` + `health.controller.test.ts`, caused by a **parallel session's uncommitted `backend/api/router.ts`**, NOT this work (my change is frontend-only and imports none of it). Left untouched per the trunk-only rule.

## Goal
On a manager's person page, show a dated "Last 1:1" line with that person's four axis reads from their most recent completed 1:1 — display only, no scoring change.

## Changes
- `frontend/src/stages/person-detail.ts` — widen the local `Briefing` type to include `axes`, and render a "Last 1:1" axis line inside/next to the existing `sinceLastTime()` block. Reuse `AXIS_ORDER` + `AXIS_LABELS` from `admin/src/ui/axes.js`.
- Small render helper (pure: axes array + date → line), test-first, mirrored test file alongside.
- Each axis shows its number when `read_status === "read"`, and **"not read"** otherwise — never a 0 stand-in.
- If the person has no completed 1:1 yet, the line doesn't appear (no empty scaffold).
- Confirm the same view isn't separately mounted in `admin/` — if it is (shared stage), it inherits the change; verify both.

## Not in this phase
- No multi-run trend (a → b → c) — that's Phase 2, and it's the part that needs a new backend reader.
- No backend/engine/scoring changes at all.
- No change to the end-of-1:1 briefing's axis panel (`briefing.js`) — this is the person page only.

## Done when
- [ ] On the running app, a person with ≥1 completed 1:1 shows the dated "Last 1:1" axis line with the real reads from that run (verified against the run's stored `briefing.axes`, not just that the code renders).
- [ ] An axis that was "not read" last time shows "not read", not 0.
- [ ] A person with no completed 1:1 shows no axis line (no empty box).
- [ ] `npm test` + `npm run typecheck` green; new render helper has a mirrored test.
- [ ] Screenshotted on the real screen (house rule: design work isn't done until seen rendered).
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner
Walk these yourself in the running app. Next phase waits for your green light.

1. **A person you've met before** — open a person who's had at least one finished 1:1. On their page you should see a **"Last 1:1"** line with that meeting's date and the four axes (e.g. *Engagement +6 · Clarity −5 · Wellbeing not read · Growth not read*). ❌ Not OK if the numbers don't match what that 1:1 actually showed, or if a not-read axis shows "0".
2. **A brand-new person** — open a person with **no** finished 1:1 yet. You should see **no** axis line at all (not an empty or zeroed box). ❌ Not OK if a blank/placeholder axis line appears.
3. **Honesty check** — find (or make) a 1:1 where an axis genuinely wasn't discussed. That axis should read **"not read"** on the person page. ❌ Not OK if it shows a number it didn't earn.
4. **Nothing else moved** — open the end-of-1:1 briefing for a recent run; its axis panel looks exactly as before. ❌ Not OK if that panel changed.

# Phase 2 — Make it the default

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Every manager finishing a run lands on the "Before · During · After" layout by default — and
confirm nothing else that shows a brief broke.

## Changes
- **`frontend/src/stages/preparation-brief.ts`** — set `DEFAULT_VARIANT` to the new layout's id,
  so anyone without a saved choice (i.e. every non-admin manager) sees it.
- Update the one test that asserts the current default (`preparation-brief.test.ts` has a
  "defaults to J (Contrast)" test) to expect the new default.
- **Dependency check** — verify the other brief surfaces still render fine and decide, per screen,
  whether they should match or stay as-is:
  `admin/src/ui/briefing-view.ts`, `admin/src/stages/review-run.js`, `onepage.js`,
  `backend/engine/review-html.ts`.

## Not in this phase
- Redesigning the admin/review internal views (parked unless Carl asks).
- Removing the admin layout picker (parked — harmless).

## Done when
- [ ] A manager (non-admin) run ends on the "Before · During · After" layout with no action needed.
- [ ] `npm test` green (incl. the updated default test) and `npm run typecheck` clean.
- [ ] The admin run-review / one-page views still render a brief correctly (checked on the running
      app or their tests) — screenshot of the manager-facing result.
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner (Carl)
1. **Fresh manager lands on it** — do a run as a normal manager (not admin), reach the prep brief.
   You should land straight on **Before · During · After** — no picker, no extra clicks.
   ❌ Not OK if you see the old layout or have to choose.
2. **Nothing else broke** — open an admin run-review / one-page view of a past run. The brief there
   should still look right (it can look different from the new manager layout — just not broken).
3. **Copy all still matches** — hit "Copy all" on the briefing. The copied text should still carry
   all seven pieces, in a sensible order.
4. **Ship check** — it's ready to go live on your word (not auto-deployed).

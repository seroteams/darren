# Phase 3 — Quiet rail

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built 2026-07-26, awaiting Carl's walk

## Built (2026-07-26)
- `admin/src/ui/first-visit.ts` (new) — one small module holding "has this manager run a 1:1 yet?" with three states. `null` (nobody asked) is deliberately NOT "no": the rail only quiets on a positive no, so a deep link or a claimed guest run can never strip someone's app by accident.
- `frontend/src/ui/app-nav.js` — the five manager work rows (Home, Start 1:1, Team, Past 1:1s, Members) hide while the answer is a positive no. The shell never goes with them: brand, collapse toggle, mobile bar, What is Sero?, Send feedback and Log out all stay. Managers only; a member's rail is one row already. The rail subscribes once and replays its last render when the answer lands.
- `admin/src/stages/start-core.js` — Home tells the module what its fetch found, on every render, so finishing a first brief brings the rail back without a reload.
- `frontend/src/ui/app-nav-quiet.test.ts` (new, 6 tests) — including a guard that the customer profile chip still hides its own Log out, which is why hiding the whole rail was never an option.
- Lane note: Carl handed `frontend/src/ui/app-nav.js` over from the audit-fixes lane on 26 July; that lane's own rail work was already committed (259a25a8).

### Proof
- Free checks: `npm test` **189/189**, typecheck clean.
- Real screens, fresh signup on the local customer app: [proof/quiet-rail.png](proof/quiet-rail.png) (only What is Sero?, Send feedback and Log out remain), [proof/quiet-rail-mobile.png](proof/quiet-rail-mobile.png) (the phone drawer, Log out still pinned at the bottom), [proof/full-rail-returning.png](proof/full-rail-returning.png) (a manager WITH a real 1:1 keeps the full rail).
- The Phase 3 research list of what breaks if the rail is hidden outright (no Log out, three orphaned screens, two layout gutters, the mobile strip) does not apply here: nothing was removed, only the work rows.

### Honest gaps for the walk
- **There is a beat.** The rail paints full, then quiets when Home's data lands (a few hundred milliseconds). Making it right on the very first frame would mean an extra request at boot for every manager forever, which is not worth it without your word. If the beat annoys you, say so and I will add the boot fetch.
- **Un-quieting is proven by test, not by a live walk.** Confirming it on screen needs a real finished brief, which costs a paid engine run; the returning-manager screenshot proves the full-rail path and the listener is unit-tested.
- A first-visit manager who types a URL straight to, say, `/team` still gets the full rail, because Home never loaded and the answer stays unknown. That is the safe default, not an oversight.
- The admin console's own rail is untouched (different module); internal QA sees no change.

## Goal
Before the first real brief, a manager's sidebar is quiet: brand, What is Sero?, Send feedback, and Log out only. The five manager rows appear once a real brief exists.

## Changes
- `frontend/src/ui/app-nav.js` (+ `admin/src/styles/design/app-nav.css` if needed) — hide Home / Start 1:1 / Team / Past 1:1s / Members rows until the account has a real brief (the Phase 1 helper's rule); keep the rail shell, brand button, collapse toggle, mobile strip, and Log out untouched.
- How the rail learns "first real brief exists" is a build-time decision (smallest possible state; no new tracking). Re-check after a guest brief is claimed, so the rows appear the moment the claim lands.

## Not in this phase
- Admin app's nav (its own module; internal users are not onboarding).
- Members' rail (already minimal; out of scope).
- Any welcome-screen change (Phase 2).

## Done when
- [ ] Fresh account: quiet rail. Finish (or claim) a first real brief: full rows appear without a reload oddity.
- [ ] Log out reachable at every moment, desktop and mobile; hamburger strip intact.
- [ ] The two rail-width layouts (session top bar, questioning split-screen) show no empty gutter for a first-prep manager.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Quiet start** — `live > sero.team > fresh test account > Home`. Sidebar shows only the brand, What is Sero?, Send feedback, Log out. ❌ Not OK if Team or Past 1:1s show.
2. **It unfolds** — finish your first prep. Back on Home the full sidebar is there.
3. **Never trapped** — on the fresh account, phone width: the top strip and menu still work, and Log out is reachable.
4. **Mid-prep looks right** — during the first prep's question screens, no odd empty stripe down the left.

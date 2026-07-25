# Phase 3 — Quiet rail

**Part of:** [plan.md](plan.md) · **Status:** ⬜ (next; the validation-stage park was lifted by Carl on 25 July)

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

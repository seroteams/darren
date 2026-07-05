# Phase 2 — Guest lane frontend: entry + boot/router

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 built 2026-07-05 — awaiting Carl's walk

## Goal
A logged-out visitor can click "Try it — no account needed" on the login screen and land straight in the intake questions — and a mid-run page reload puts them right back where they were.

## Changes
- `admin/src/stages/login.js`: "Try it — no account needed" link under the sign-in form → `setState({user:null, stage:INTAKE, substage:"NAME"})`.
- `admin/src/router.js` (+ `router.test.ts`): new `GUEST_OK` set = FLOW ∪ {INTAKE}, exported `isGuestStage`. Don't overload SHARED (those are content pages).
- `admin/src/main.js` logged-out boot branch: route INTAKE → intake; a flow-stage route → try `rehydrateById(localStorage.seroSessionId)` (server side is already anonymous-safe) → fallback LOGIN.

## Not in this phase
- The save-at-end card and claim wiring — Phase 3.
- Starting an actual run in QA (that would fire paid focus-points pre-warm) — scenarios below stop at the intake screen.

## Done when
- [ ] Test first: `isGuestStage` covers FLOW + INTAKE, excludes RUNS/START/admin stages.
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner
All in the browser, logged out, free — do NOT press the final "start" at the end of intake (that's Phase 3's paid walk). Next phase waits for your green light.

1. **The front door exists** — open the app logged out. On the login screen you see "Try it — no account needed". Click it: you land on the first intake question ("Who are you prepping for?") with no login. ❌ Not OK if you're bounced back to login.
2. **Reload doesn't lose you** — on the intake screen, reload the page. You're still in intake, not dumped to login. ❌ Not OK if reload logs you "out" of the guest lane.
3. **Guests see no admin furniture** — as a guest there is no side rail, no profile badge, no admin menus anywhere. ❌ Not OK if any internal screen (Tasks, Universe, User management…) is reachable logged out.
4. **Nothing changed for real users** — log in as yourself: everything looks and works as before (START, rail, internal tools). Log in as a member: member home as before. ❌ Not OK if any logged-in flow changed.

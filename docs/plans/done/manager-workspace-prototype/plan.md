# Manager workspace prototype

**Goal:** Add one safe, walkable `/test` concept showing a manager's core loop across five connected screens.
**Driver:** Carl
**Created:** 14 Jul 2026

## Done means
- `/test` has one new card for **Manager Loop — from signal to follow-through**.
- The prototype has five screens and every screen can reach every other screen through one persistent navigator.
- The main path also reads naturally: Today → Team → Aisha → Prepare → Follow-through.
- It uses hardcoded mock data only: no fetch, API calls, storage, or backend changes.
- It follows `DESIGN.md`: Sero tokens, Bricolage + Inter, 14px floor, one blue action per screen, Lucide icons, 4px controls, 12px cards, responsive layout, visible focus states, and reduced-motion support.
- `npm test`, `npm run typecheck:admin`, and `npm run build` stay green.
- Carl walks the five QA scenarios in `phase-1.md` and gives the green light.

## Resolved before we start
- The safe extension point is `admin/src/stages/test.js` plus one module under `admin/src/stages/tests/`.
- The gallery explicitly requires mock-only prototypes and says nothing is saved.
- The new module will be `manager-workspace.prototype.ts`: TypeScript, scoped styles, typed scene IDs, event delegation, and Lucide icons through the shared helper.
- A co-located unit test will prove the five-scene navigation model is complete and has no dead-end scene.
- Existing prototype files, backend files, production routes, and current work from other sessions stay untouched.
- The repo already has unrelated uncommitted work. Adds and checks will be path-scoped; no broad staging, cleanup, or formatting.

## Product idea
**Point of view:** managers do not need another analytics dashboard. They need to know what deserves attention, understand the person, enter the conversation prepared, and leave with clear ownership.

| Screen | Job | One primary action |
|---|---|---|
| Today | See the next 1:1, one important signal, and promises due | Review Aisha |
| Team | Scan people by attention needed, not a reductive score | Open Aisha |
| Aisha | Read the human context: role, recent pattern, last conversation, open promise | Prepare 1:1 |
| Prepare | Turn context into a short agenda with three grounded questions and private notes | Start 1:1 |
| Follow-through | Confirm commitments, owners, dates, and what returns next time | Finish review |

The persistent navigator remains visible on desktop and becomes a compact horizontal control on small screens. Direct navigation is always available; the primary action on each screen demonstrates the intended flow.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Build and walk the concept | Gallery card, five connected mock screens, responsive polish, offline proof | ✅ |
| 2 | "No-data" feasibility overlay | Feasibility dropdown (red/amber tiers), gap flags + corner tags | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**COMPLETE — both phases ✅ green-lit 2026-07-15 ($0).** Carl walked it at `localhost:3200/test`.
Phase 1: the `/test` "Manager Loop" card + five connected mock screens (Today → Team → Aisha →
Prepare → Follow-through), persistent 5-item navigator, responsive, focus-visible, reduced-motion.
Phase 2: the "Feasibility" dropdown — two independent tiers (🔴 not built · 🟠 have data, not
wired) that outline + tag the elements Sero can't back with real data/engine yet (scheduling,
attention signals, cross-run patterns, due dates, per-question evidence). `npm test` green,
`typecheck:admin` clean, `build` ok; full browser walk (both breakpoints) clean, no console
errors. This prototype's job — a walkable concept + an honest feasibility map — is done. Two
further visual directions stay parked (see below); turning this into a production experience is
separate future work.

## Parked
- Two additional visual directions — this task deliberately builds only one.
- Backend wiring, persistence, real employee data, and production routes.
- Turning the chosen concept into a production manager experience.

# Phase 8 — Moat metrics + the moat story

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜ · **Cost:** $0

## Goal
Make the moat measurable and sayable: the superadmin Registered screen shows how deep each
company's continuity is running, and a one-page doc states plainly what compounds and why a
competitor can't shortcut it.

## Changes
- **Registered screen additions** (per company, next to the existing return-visit signal):
  - Threads: people with ≥2 finished 1:1s (count + % of people).
  - Outcome-answer rate: % of agreed actions that got a yes/partly/no/changed tap.
  - Carry-forward kept rate: % of preps where the seeded block was kept/edited vs cleared.
  - The GTM tell, automated: managers with a second unprompted prep within 14 days.
- **docs/moat.md** (one page, plain words): what compounds per team (the commitment/outcome thread
  per person, the labelled follow-ups, the exemplar library, the effectiveness stats), why each is
  hard to copy without the history, what we deliberately do NOT hoard (no training on notes; the
  manager's data is theirs — export stance stated), and which metric proves the moat is real
  (second-prep rate + thread depth).
- Numbers computed by the continuity service (Phase 5's repo), tests on the rollup math.

## Not in this phase
- Dashboards beyond Registered; churn prediction or anything inferential (banned by the ruling);
  pricing work (the moat doc feeds the GTM plan, it doesn't set price).

## Done when
- [ ] Registered shows the four metrics per company, and each spot-checks against real data
      (queried at the destination, shown to Carl).
- [ ] docs/moat.md reads clean to a non-technical reader in under 2 minutes.
- [ ] `npm test` + typechecks green.
- [ ] Product owner has tested the scenarios below and said go — and with that, the plan closes to
      docs/todo/done/ and STATUS/SERO_BOARD/changelog roll.

## Test scenarios — for the product owner
All free.
1. **Real numbers** — open Registered. Your alpha company shows threads / outcome rate /
   carry-forward kept / second-prep count. Pick one number; I show you the underlying runs and the
   query. ❌ Not OK if any number is an estimate.
2. **The story** — read docs/moat.md top to bottom. You could repeat the argument to Darren without
   notes. ❌ Not OK if it needs tech vocabulary to make sense.
3. **The tell matches reality** — the "second unprompted prep" count agrees with what you know
   actually happened with your friendly managers (the corridor test's pass bar, now measured).

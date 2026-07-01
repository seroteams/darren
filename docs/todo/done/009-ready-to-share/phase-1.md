# Phase 1 — Safety floor (execute 008)

**Part of:** [PLAN.md](PLAN.md) · **Track:** A (ship-blocker) · **Status:** ✅ (signed off 2026-07-01)

## Goal
Make Sero safe to hold real HR data before anyone logs in: personal data fenced by organisation **and**
role, AI keys provably server-only, sensitive content kept out of logs, and a human sign-off on the record.

## Changes
- Executes the existing plan in [008-security overview](../../../archives/prototype-to-production/✓008-security/00-phase-overview.md):
  install + run the security skills to green; map where PII lives and lock access by org + role;
  audit secrets so no key reaches a client bundle, response, or log; book the human expert review.
- Extends the engine's existing trust gates (manager-private notes) to the multi-user, multi-org world.

## Not in this phase
- Hosting / cost caps (Phase 2). This phase is *what's safe*, not *where it runs*.
- First-run polish, feedback, features (later phases).

## Done when
- [ ] Security-skill checks come back green.
- [ ] A search of the built app, responses, and logs finds **no** AI key anywhere.
- [ ] Company A provably cannot reach Company B's data, and role limits hold within a company.
- [x] **DB audited for null/unfenced rows before real data — done (2026-07-01).** 0 literal-null org rows,
      `runs` empty, all orgs dev/test; the 3 leftover pre-auth test sessions cleared (0 unfenced now).
- [x] **Anonymous session-start path decided (2026-07-01):** kept open for the alpha (A/C) — see PLAN
      Decisions. Follow-up: close before widening.
- [ ] ~~A named human expert has reviewed and signed off~~ — **waived for alpha (accepted risk, 2026-07-01).**
      Deferred, not cancelled: book before widening past 2–3 friendly managers.
- [x] Product owner has tested the scenarios below and said go. **(2026-07-01 — click-through 1/2/6 passed; 3/5 evidence shown; go given.)**

> **Note:** this is a large phase (008 has its own 4-step overview) and may split into its own sub-plan.
> Expert sign-off is waived for the small alpha by Carl's call — automated checks are the floor, not a
> guarantee, so keep the alpha tiny and personally known.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Two companies, one wall** — Log in as Company A. Try to open one of Company B's runs by its link. You should see a "not found"/refused page. ❌ Not OK if any of B's data appears.
2. **Role limits** — As a non-owner member of a company, try to reach a manager-only view or another person's private notes. You should be refused. ❌ Not OK if private manager notes show.
3. **No keys anywhere** — I show you the output of the key-search across the app bundle, API responses, and logs. You should see zero hits. ❌ Not OK if any key-shaped string appears.
4. **Risk acknowledged** — Expert sign-off is waived for this alpha. Confirm you're OK proceeding on automated checks only, with the alpha kept to 2–3 people you know. (Sign-off deferred, not cancelled.)
5. **Database is clean** — I show you the audit: zero null-org rows, `runs` empty, and the 3 leftover pre-auth test sessions removed. You should see 0 unfenced sessions before real data flows. ❌ Not OK if any null/placeholder session with a real person's name remains.
6. **No-login start is walled, not leaky** — Confirm the decision: someone can still start a session without logging in (needed by our own test tools), but real managers always log in through the app, and any no-login session is quarantined — a logged-in user gets "not found" if they try to open one. ❌ Not OK if a logged-in company can see a no-login session's contents.

# Phase 4 — Signup creates the company

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Because it's HR, signing up creates the company too: the first person becomes the owner, and all their data is fenced to that company so no one else can see it.

## Changes
- `POST /api/v1/auth/register` now creates an `organizations` row, makes the new person its **owner**, and links the user to that org — in one transaction (both succeed or neither does).
- Fence every tenant-scoped read/write by the caller's `orgId` (from the logged-in identity): sessions, runs, users, invitations. Queries can only ever see their own company's rows.

## Not in this phase
- No inviting teammates into the company yet (invitations table exists; the flow is parked).
- No switching between companies, no billing, no org settings screen.

## Done when
- [ ] A test proves **company A cannot read company B's data** (sessions/runs are fenced by org).
- [ ] A test proves register creates a person **and** a company, with that person as owner.
- [ ] `npm test` and `npm run typecheck` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. This is the last phase — your green light closes Phase 006.
1. **Signup creates a company** — register a brand-new person. You should see a new company created, with that person as its owner. ❌ Not OK if there's a person but no company.
2. **Companies are walled off** — register two different companies, create some data in each, then log in as each. Each should see **only its own** data. ❌ Not OK if either can see the other's runs/sessions.
3. **Nothing leaks anonymously** — logged out, you cannot reach any company's data (carries the Phase 3 guard).

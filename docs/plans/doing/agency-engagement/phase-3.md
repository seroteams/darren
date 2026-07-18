# Phase 3 — Payments on paper

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
A written, ready-to-execute plan for taking payment (Stripe) — so the day Gate 1 opens, building can start immediately. **No code is built in this phase.**

## Changes
- One document: `docs/plans/future/payments/plan.md` covering:
  - What we charge for and when (pilot pricing shape — options for Carl, not a decision made for him).
  - The customer journey: where "upgrade/pay" appears in Sero, what the checkout moment looks like, what a paying vs free account can do.
  - The plumbing in plain words + a labelled techy section: Stripe Checkout vs embedded, webhooks, retry logic, what lands in our database, test mode vs live mode.
  - Effort and cost estimate: rough build-time in phases, Stripe's fees, what the agency would have charged ($350+) vs in-house.
  - The go-trigger: what Gate 1 means and what "start building" looks like.
- Because a checkout moment IS a visual surface, the payments plan will note that its own build (when green-lit) starts with the standard ONE artifact mockup gate.

## Not in this phase
- Any code, any Stripe account setup, any dependency installs.
- Deciding pricing — the doc lays out options; Carl decides.

## Done when
- [ ] The payments plan doc exists and is readable end-to-end by a non-engineer.
- [ ] It contains concrete pricing OPTIONS, a journey description, an effort estimate, and a clear go-trigger.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. This closes the engagement.
1. **The founder read** — read the doc top to bottom. You should finish knowing: what we'd charge, where paying happens in the app, roughly how long the build takes. ❌ Not OK if you hit a section you have to skip because it's engineer-speak outside the labelled techy part.
2. **The decision check** — the pricing section should give you 2–3 concrete options with trade-offs, not "TBD". You should feel able to pick one (or say "not yet"). ❌ Not OK if it quietly picks for you.
3. **The hand-off test** — imagine pasting this doc into a fresh chat and saying "build it". Would that session know where to start? If yes, the doc did its job.

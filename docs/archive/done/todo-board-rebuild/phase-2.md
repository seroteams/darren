# Phase 2 — Plain check steps

**Part of:** [PLAN.md](plan.md) · **Status:** 🔨 built, awaiting test

## Goal
Replace every vague "Check:" line with a concrete, plain set of steps you can actually follow — split into "I can run this for you" (free checks) and "you eyeball this" (open a screen and look).

## Changes
- `admin/src/stages/checklist.js` — for each step, replace the one-line `c:` field with two clear parts:
  - **Auto-check** — the exact free, safe command(s) that prove it (e.g. `npm test`, `node scripts/replay-scenario.js <id> --fixtures-only`) and what a pass looks like. These are what Phase 3's button will run.
  - **You eyeball** — the by-hand bit in plain words: "open this screen, click here, you should see X." Empty for steps that are fully auto-checkable.
- Keep the wording short and jargon-free. Vague phrases like "tests still pass" become "Run `npm test` — you should see the same number of passing tests as before (no new failures)."

## Not in this phase
- Wiring the button that runs the auto-checks (that's Phase 3) — here we just write down *which* checks and what a pass looks like.
- Any change to step status or your verdict control (done in Phase 1).

## Done when
- [ ] Every step has a concrete auto-check (or says "nothing to auto-run") and a plain eyeball step (or "nothing to eyeball").
- [ ] No vague one-liners left (no "tests still pass" without saying how/what to see).
- [ ] `npm test` still green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these at **http://localhost:3000/todo**. Next phase waits for your green light.
1. **Concrete, not vague** — open Phase 003 (the one in progress). Read step 3's check. You should see a real instruction (a command to run and/or a screen to open) and what a pass looks like — not just "tests stay green". ❌ Not OK if it's still a vague one-liner.
2. **Auto vs eyeball is clear** — on any step, it should be obvious which part the app will run for you later and which part you do by hand.
3. **Plain language** — read three different steps' checks. They should read like instructions to a person, no tech-jargon you'd have to decode.

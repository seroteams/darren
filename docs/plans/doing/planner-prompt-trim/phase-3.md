# Phase 3 — A size budget that holds

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The rule sheet cannot quietly re-bloat. This prompt was already trimmed once on 10 July and grew back 40% in three weeks. Without a cap, phase 1 and 2 buy a few weeks and nothing more.

## Changes
- A free check (no API calls) that measures the `## System` block of `content/prompts/plan-turn.md` and fails when it exceeds its cap.
- Cap set to the post-phase-2 size plus a small headroom, so today's prompt passes and the next unnoticed addition does not.
- Wired into the existing free lint run so it fires with the other checks, and named in `CLAUDE.md`'s command list alongside `lint:copy`.
- The failure message says the size, the cap, and what to do: make room by cutting, or raise the cap deliberately.

## Not in this phase
- Applying a cap to the other prompt files. Do that once this one has proved itself.

## Done when
- [ ] Running the check on today's file passes.
- [ ] Adding a paragraph to the system block makes it fail, with a message that names the size and the cap.
- [ ] `npm test` and `npm run typecheck` clean.
- [ ] No paid run needed for this phase.
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. This is the last phase.

`your terminal, in the project folder`

1. **The check passes today** — run the free lint command I give you. It should say the rule sheet is within budget and tell you the number. ❌ Not OK if it errors or says nothing.
2. **It catches growth** — I will show you the failure message from a deliberately oversized version. It should tell you plainly that the prompt got bigger and by how much. ❌ Not OK if the message is a stack trace or jargon.
3. **A normal session still runs** — run one bi-weekly on `sero.team` end to end. Nothing about the meeting should have changed. ❌ Not OK if anything behaves differently from phase 2.

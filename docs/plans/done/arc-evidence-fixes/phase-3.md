# Phase 3 — Intent reframes

## ✅ GREEN-LIT 2026-07-20
Carl approved via evidence-first review in chat (bundled into option B). Wording-only changes to two
phase `intent` strings; no gate/budget change. Proof: `npm test` 164/164, `npm run typecheck` clean.

All edits free (no OpenAI).

## Changes
1. **performance/type.ts** — `self_read` intent → "Their own read of the stretch first — their view,
   not the verdict — before any manager evidence lands." (Research #3: self-assessment is supported
   as *voice*, not as the rating — Cawley/Keeping/Levy ρ=.61; Mabe & West self-rating validity r=.29.)
2. **feels-off/type.ts** — `underneath` intent → "Only if they open the door — follow their lead, at
   their pace. Opt-in and employee-led; never probe for what they haven't named." (Research #9.)

**`id` kept as `underneath` deliberately** — it's a shared `stage:` bucket across ~200 question
files (`content/questions/*.yaml`), so renaming the phase id would orphan every question routed to it.
The evidence concern (no diagnostic probing) was already enforced by the tone_register + the
state-inference gate from Phase 1; this phase just makes the opt-in framing explicit in the intent.

## QA scenarios
1. Proof: `npm test` 164/164, typecheck clean — no routing broke (id unchanged).
   ✅ Pass: all green · ❌ Fail: any test/typecheck failure.
2. Intents read as above in `performance/type.ts` and `feels-off/type.ts`.

## Status
✅ Closed. Free checks green. Not pushed — ships next "go live".

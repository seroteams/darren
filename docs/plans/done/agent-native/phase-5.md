# Phase 5 — Prompt↔gate coupling registry

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Run order:** 5th

## Goal
When an agent edits a prompt rule, it can see the gate regex that enforces it — and a test breaks if the two silently drift apart.

## Why
Editing a prompt rule (e.g. the focus-reason opener) silently breaks a hardcoded regex in `backend/engine/golden-checks.ts` / `evals/trust-checks.ts`. The coupling is invisible until a paid gate fails — expensive and confusing.

## Changes
- **`content/prompts/rule-registry.ts`** (new — or a doc table) — one row per prompt-encoded rule: the rule → the gate constant/regex that enforces it → the golden case that proves it.
- **New test** — asserts every registry row's referenced gate constant still exists; a rename on either side breaks it.

## Not in this phase
- Rewriting the gates themselves. This only makes the existing coupling visible and enforced.

## Reuse
`backend/engine/golden-checks.ts` module consts, `evals/trust-checks.ts`, `evals/golden/`.

## Done when
- [ ] Each prompt rule that has a gate has a registry row.
- [ ] A test passes now and fails if a referenced gate constant is renamed/removed.
- [ ] `npm test` includes it.
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for Carl
Walk these yourself. This is the last phase.
1. **Registry reads true** — open `content/prompts/rule-registry.ts`. Pick a row (e.g. focus-reason opener) and confirm the prompt really requires it and the named gate really checks it. ❌ Not OK if a row points at a rule/gate that doesn't exist.
2. **Catches drift** — I'll temporarily rename one gate constant and run `npm test`. You should see the registry test go red naming the broken link. Then I revert. ❌ Not OK if it stays green.

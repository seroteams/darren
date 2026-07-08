# Phase 5 — Prompt↔gate coupling registry

**Part of:** [plan.md](plan.md) · **Status:** ✅ done (tested) · **Run order:** 5th

## ✅ GREEN-LIT 2026-07-08 — Carl walked it; closes the track (commit hash in the tracker stamp)

## Built (2026-07-08)
- **`content/prompts/rule-registry.ts`** (new) — 7 verified couplings, each row: the rule → the literal prompt anchor text → the gate identifier that enforces it → proven-by golden cases. Rows: focus-reason opener (`FOCUS_REASON_OPENER`), consultant-deck reason bans (`FOCUS_BANNED_REASON_PATTERNS`), focus-label second-person guard (`FOCUS_LABEL_SECOND_PERSON`), question jargon bans (`JARGON_PATTERNS`), relational-arc competency exclusion (`runQuestionArcGate`), briefing internal-vocab bans (`MANAGER_BRIEFING_BANS`), no-inference ruling (`INFERRED_STATE_LEAK` in `evals/trust-checks.ts`). Header tells the next agent: edit prompt + gate together, then the row.
- **`scripts/test-rule-registry.js`** (new, auto-runs in `npm test`) — per row: prompt anchor still present, gate identifier still in its file, golden ids real. Failure messages say the consequence ("this rule is now UNENFORCED").
- **Every row verified against the actual sources before writing** — only couplings that exist on BOTH sides went in. Deliberately excluded: detector-only constants with no prompt twin (`RULE_ECHO_PHRASES`, `CROSS_SESSION_VOCAB` — incident archaeology, nothing to couple), and the briefing plain-language ban list (prompt-side only, no code gate today — a candidate for a future gate, parked).
- **Drift demo (scenario 2, already run):** renamed `FOCUS_REASON_OPENER` in golden-checks.ts → registry test red naming the row and file; reverted → green. Honest note: my FIRST demo rename (definition only) stayed green *correctly* — the identifier still existed at its use sites; a full rename went red. The test checks identifier presence, not definition sites.

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

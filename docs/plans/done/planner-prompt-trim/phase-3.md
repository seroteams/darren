# Phase 3 — A size budget that holds

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-08-02 — Carl ran `npm run lint:prompt-size` in his own terminal and pasted the result: PASS, 34,063 characters, 337 to spare (commit `692ee628`)

## Built (2026-08-02)

- **`scripts/lint-prompt-size.js`** (new) — measures the `## System` block of every prompt listed in its `BUDGETS` table and fails when one is over cap. Pure Node, no deps, no network, always free. Matches `lint-copy.js`'s shape.
- **`package.json`** — `npm run lint:prompt-size`.
- **`CLAUDE.md`** — added to the free-commands list, with the rule that raising a cap is its own deliberate commit.

**The cap: 34,400 characters.** Carl chose on 2026-08-02 to skip phase 2, so the cap is set on today's size (34,063) rather than a smaller post-phase-2 one, plus **337 characters of headroom** — about a third of a paragraph. A wording fix or an added sentence passes; a whole new rule does not. That is the exact growth pattern this guard exists to catch: the rule sheet grew 40% one rule at a time.

**Proof, both directions (free):**

| Check | Result |
|---|---|
| Today's file | ✓ PASS — 34,063 chars, ~8,243 tokens, 337 to spare (99.0% of budget) |
| One realistic rule added (585 chars) | ✗ FAIL — 34,648 chars, 248 over (100.7% of budget), then restored clean |

The failure message names the size, the cap, the overage, and gives two honest ways out: make room by cutting a repeat or a spent example, or raise the cap on purpose in its own commit.

**Offline proof:** `npm test` 228/228 · `npm run typecheck` clean · `npm run lint:copy` PASS · **£0, no paid run.**

**Status:** ⬜ → 🔨

## Goal
The rule sheet cannot quietly re-bloat. This prompt was already trimmed once on 10 July and grew back 40% in three weeks. Without a cap, phase 1 and 2 buy a few weeks and nothing more.

## Changes
- A free check (no API calls) that measures the `## System` block of `content/prompts/plan-turn.md` and fails when it exceeds its cap.
- Cap set to today's size plus a small headroom, so the current prompt passes and the next unnoticed addition does not. (Originally "post-phase-2 size" — Carl skipped phase 2 on 2026-08-02, so the cap sits on the phase-1 size instead.)
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

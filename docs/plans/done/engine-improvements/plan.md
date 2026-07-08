# Engine improvements — from the back-catalogue read (2026-07-07)

> ## ✅ TRACK CLOSED — 2026-07-08
> Carl green-lit closing this out. **All the safe, free build work is done + committed** (`c12ad562`).
> Double-checked against the repo before closing: the fix is wired (`preparation.ts` exports
> `PREP_REQUIRED_KEYS`, `smoke-test.js` imports it), nothing uncommitted, `npm test` **96/96** green ($0).
> The remaining three items are **not unfinished code** — each is blocked on a call only Carl can make,
> and they stay available as **parked follow-ups** in this same file:
> - **B2** — make the engine *refuse* to ship a weak brief (live-path behaviour change; needs a decision + paid QA walk)
> - **#1** — stonewall exit (turn-loop behaviour change; product choices in [01-stonewall-exit.md](01-stonewall-exit.md))
> - **#4** — broaden paid test coverage past the bi-weekly (needs a spend go-ahead)
>
> To un-park any of these: pick it up as a fresh Darren-Method phase.

**Where this came from:** Carl asked for a read of every manager input across all 169 runs
([docs/reports/manager-inputs-2026-07-07.html](../../reports/manager-inputs-2026-07-07.html)).
That read produced a 5-item engine-improvement list. Carl then asked to *validate before building*,
then to *do it all* (spend authorised), then — heading to work — to *continue to a good safe point*.

This folder tracks that work. **Baseline (free, 2026-07-07):** `npm test` **86/86** · `npm run typecheck` clean.

---

## The list, after validation

| # | Item | Status | Notes |
|---|---|---|---|
| #2 | Infer intent from an observation-only note | 🟢 **Closed — no build** | Validated against recorded prep output: engine infers a grounded `coreIssue`, hedges ("probably"), sets Medium confidence, adds a `dontAssume` guard. Already correct. |
| #3 | Degrade gracefully on a thin (20-char) note | 🟢 **Closed — no build** | Same evidence. Honesty fields are required + validated in the live prep path. |
| **B** | Does our test/sweep path skip the validated prep? | ✅ **DONE + committed** | Found the smoke-test gate checked only 6 of the 8 required prep keys — **blind to `confidence`/`dontAssume`**. Fixed: gate now reads the engine's own `PREP_REQUIRED_KEYS`. Commit `c12ad562`. See below. |
| **B2** | Should the engine *refuse to ship* a brief that fails validation? | ⏸️ **PARKED — needs Carl's decision** | Deeper issue B surfaced. Live behaviour change on the paid path. NOT safe to do unsupervised. |
| **#1** | Cut a stonewalled session to the close faster | ⏸️ **DESIGN BRIEF — needs Carl's decision** | Turned out to be a *new turn-loop behaviour*, not a contained fix. Product decisions inside. See [01-stonewall-exit.md](01-stonewall-exit.md). |
| **#4** | Broaden test coverage past the bi-weekly | ⏸️ **PARKED — costs paid runs** | 109 of 169 runs are one meeting type. Performance / growth / "feels off" are thin. Do deliberately when spending is watched. |

---

## What landed this session (B) — the only code change

**Problem:** the engine's prep schema requires 8 keys including the two honesty fields
(`confidence`, `dontAssume` — [preparation.ts:91](../../../backend/engine/preparation.ts)), but the
smoke-test gate hardcoded only 6 ([smoke-test.js:348](../../../scripts/smoke-test.js)). So a briefing
could ship with its honesty guard missing and every test stayed green — exactly why old runs show
`confidence: undefined` and nothing caught it.

**Fix (surgical, drift-proof):**
- `preparation.ts` now exports `PREP_REQUIRED_KEYS` (= `RESPONSE_SCHEMA.required`) — one source of truth.
- `smoke-test.js` reads that list instead of a hardcoded array. Can't drift again.

**Verified (all free):** `npm test` 86/86 · `npm run typecheck` clean · exported list confirmed to be the
full 8 keys. Committed `c12ad562`, scoped to the two files only. **No paid runs.**

---

## Parked (do NOT touch without Carl's go)

- **B2 — engine enforcement.** The prep validator ([preparation.ts:408–434](../../../backend/engine/preparation.ts))
  is *advisory*: it retries once, then ships the brief even if validation never passes. Making it hard-fail is a
  live-path behaviour change (could break a session if the model won't comply) — needs a decision + a QA walk.
- **#4 — coverage.** Paid. Broaden gate/sweep scenarios into performance / growth / feels-off. Watch spend (~$0.35/case).

## Next move (Carl)
1. Read [01-stonewall-exit.md](01-stonewall-exit.md), pick the stonewall policy → I build #1 fast.
2. Decide B2 (enforce or leave advisory).
3. Say when to spend on #4.

# #1 — Cut a stonewalled session to the close faster

**Status: DESIGN BRIEF. Do NOT build until Carl picks the policy below.**
This is a turn-loop *behaviour change*, not a contained bug-fix. It carries real product decisions.

---

## The witnessed bug

Run `logs/june/2026_Jun10_18-54-914d0…` — a deliberate stonewall test where the manager gave a
one-word non-answer every turn:

| Turn | Question | Answer | Engine note |
|---|---|---|---|
| 1 | How's the last two weeks felt? | "fine" | `[SHALLOW]` → asks follow-up |
| 2 | When you say 'fine'…? | "ok" | `[SHALLOW x2 — advancing]` |
| 3 | What's been slower…? | "i guess" | `[SHALLOW]` |
| 5 | What would people need to see…? | "dunno" | `[SESSION NON-FUNCTIONAL: 3+ consecutive non-answers]` |
| 7 | What support…? | "no" | offered reschedule |
| 8 | Is now a good time / reschedule? | "same" | still going |
| 9 | Where to put your attention? | "fine" | session ends (budget exhausted) |

**What's good:** the engine detects shallow answers, digs once, and (via the planner) offers a reschedule.
**What's wrong:** it flagged "non-functional" at turn 5 and still burned turns 5–9 asking *substantive*
questions to someone giving it nothing. It rides the full turn budget regardless.

## Why it happens (current code — confirmed)

The turn loop is **budget-driven with no stonewall short-circuit**:

- Shallow answers only *zero the axis deltas* — no session progress, but the session doesn't shorten.
  [`applyShallowGate`](../../../backend/engine/delta-gates.ts) (delta-gates.ts:72).
- The closer is forced only on the **final** turn (`remainingBudget <= 1`).
  [`enforceCloserOnFinalTurn`](../../../backend/engine/queue-manager.ts) (queue-manager.ts:247).
- The queue is truncated to budget length. [`enforceBudgetLength`](../../../backend/engine/queue-manager.ts) (queue-manager.ts:269).
- **There is no code that counts consecutive shallow answers and reduces the remaining budget.**
  The "[SESSION NON-FUNCTIONAL]" line is the *planner model's narration*, not a code-level exit.

So a real fix must **add** logic: track consecutive shallow answers, and past a threshold, shorten the
run / jump to the closer.

---

## The decisions Carl needs to make (this is why it's not a blind build)

**Q1 — Threshold.** How many consecutive non-answers before we act? (e.g. 3)

**Q2 — Cut, or offer-then-cut?**
- **A) Offer reschedule, then close.** After N shallow, ask once "want to pick this up another time?" — if
  that's also a non-answer, go straight to the closer. *(Gentlest; matches what the planner already gropes toward.)*
- **B) Hard cut to closer.** After N shallow, drop remaining substantive questions and run the closer now.
- **C) Taper.** After N shallow, halve the remaining budget rather than run to the closer immediately.

**Q3 — Recovery.** If they give a *real* answer on the next turn, the counter resets and the session
continues normally. (Almost certainly yes — don't punish a slow start.)

**Q4 — Is it even worth it?** This is a rare edge case (a manager typing "fine/dunno" every turn). The
engine already survives it, just inelegantly. Fair to deprioritise below #4 if real-manager coverage matters more.

**Recommended default (my read):** Q1 = 3 · Q2 = **A** (offer once, then close) · Q3 = yes, reset on any real answer.
Smallest, gentlest, matches existing intent.

---

## QA scenarios (finalise after Carl picks the policy)

1. **Full stonewall** — non-answer every turn → session offers reschedule at turn ~4, closes by ~5 (not 9).
2. **Recovery** — two shallow, then a real answer → counter resets, session runs full length normally.
3. **Normal session** — no shallow streak → behaviour identical to today (regression lock).
4. **Late stonewall** — real answers then a shallow streak near the end → closes cleanly, no double-closer.

## Build notes (when greenlit)
- Test-first (house rule): write the failing turn-loop test for scenario 1 first.
- Likely touch: a consecutive-shallow counter on session/axis state + a check in the queue-manager advance
  that reduces `remainingBudget` or front-loads the closer. Keep it one small, guarded change.
- Free to verify (unit + fixtures-only replay). No paid run needed to prove the mechanics.

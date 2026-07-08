# findings-3 — Are the QUESTIONS good on thin input?

*Phase 3 of [CTOCheckJuly](README.md). Free — read from existing run logs.*
*The "questions" = the question bank Sero builds to steer the 1:1.*

> ## ✅ RESOLVED 2026-07-08 — the open risk is CLOSED (proven)
> The "still open" risk described below was re-tested: **focus-points → question-bank** on the vague note
> *"They have been quiet in stand-ups recently"*, current model (`gpt-5.4-nano` → `gpt-5.4-mini`), **3 runs →
> zero invented facts** (no "illness", not even a soft health mention). Every focus point + question stayed
> grounded in the stand-up quietness — it even asked the right honest question (*"I noticed you've been
> quieter in stand-ups recently — what's changed there?"*). **Questions verdict upgraded 🟡 → 🟢.**
> The analysis below is the original record from when the risk was still open.

---

## TL;DR (read this bit)
I judged the question bank on **three thin notes**. The result mirrors Phase 2 — **it depends on how vague the note is**:

- ✅ **Specific thin note → genuinely good questions.** Grounded, non-generic, with a sensible arc.
- ⚠️ **Vague thin note → blander questions AND a real problem:** on the old model, the **invented "illness"
  leaked into an actual question the manager would ask** — the worst possible place for a made-up fact.
- ‼️ **Key catch:** the "no invented illness" win we proved in Phase 2 was the **brief** stage. The **questions
  come from a *different* stage** (a separate model call) that I have **not** re-tested. So for the questions,
  the invented-fact risk is **still open** — not yet closed like the brief.

**Blunt verdict: 🟡 Good when the note is specific; risky when it's vague — and unlike the brief, the questions' hallucination risk is unproven on the current model.**

---

## The wins ✅

**"He wants to become a lead but his communication needs work"** (Alex, growth) — 9 words in, and the
questions cover **both** halves of the note, framed as coaching, not accusation:
> - "In what situations do you find your communication style most effective, and **where is it not landing** as you'd like?"
> - "What specific responsibilities or projects **excite you about a lead role**?"
> - "What's the **first concrete thing** you want to have moved by our next conversation?"

**thin-sam** (Product Designer, bi-weekly) — designer-specific, not "how's it going" filler:
> - "Which **design decision** from the last two weeks felt like it really held up?"
> - "Where did **scope shift** on you in the last fortnight?"

Both have a real shape (open → dig → commit) and nothing generic. This is the product working.

---

## The problem ❌ — "They have been quiet in stand-ups recently" (Jordan)
Old model (`gpt-4o`). The **very first question** in the bank:

> ### ‼️ "How are you feeling energy-wise now **after your recent illness**?"

There was **no illness** in the note. In Phase 2 the brief invented it *internally*; here it's baked into a
question **the manager would read aloud in the meeting** — asking a real person about an illness that never
existed. That's the most damaging form of the failure.

And the rest of that bank drifts **generic** — the vague note gave it little to grip:
> - "What's currently the biggest blocker to your progress?" *(could be anyone)*
> - "What are the main UX priorities you're focusing on right now?" *(generic)*

*(One was decent and on-point: "How engaged do you feel with the team's direction right now?" — a fair read of "quiet in stand-ups".)*

---

## The pattern (same as the brief — plus one new catch)
```
SPECIFIC thin note  → grounded, sharp, well-arced questions ✅
VAGUE thin note     → blander questions + fabrication risk ❌
```
**New catch that matters:** the pipeline has separate stages. Phase 2 proved the **brief** stage
(`01b-preparation`) no longer invents facts on the current model. The **questions** come from the
**question-bank** stage — a *different* prompt and model call. **We proved the brief; we did not prove the
questions.** So this fabrication could still be live in the question bank today. We don't know yet.

---

## Honest verdict
| | |
|---|---|
| **Are the questions good on thin input?** | **🟡 Mixed.** Specific notes → yes, clearly. Vague notes → blander, and carry an unproven fabrication risk. |
| **Confidence** | **Medium** on the wins (seen across 2 cases). **Low** that the vague-note fabrication is fixed — untested on the current model. |
| **#1 weakness** | A vague note can put a **made-up premise into a question the manager actually asks.** Proven on old model; **not re-tested** on current. |
| **Cheapest way to be sure** | Re-run *"quiet in stand-ups"* through the **question-bank** stage on the current model (paid, ~$0.35), same as we did for the brief. |

---

## ✅ Your move
- **Say "prove the questions"** → I re-test the question bank on the vague note (current model) to see if it still invents the illness. *(Recommended — it's the one open risk.)*
- Or **"go"** → Phase 4: is the SUMMARY good on thin input?
- Or **both** → prove it, then straight into Phase 4.

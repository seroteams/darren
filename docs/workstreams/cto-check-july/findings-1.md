# findings-1 — The thin case, and where brief / questions / summary come from

*Phase 1 of [CTOCheckJuly](README.md). Free — read from existing run logs. Nothing paid.*

---

## TL;DR (read this bit)
- **Our thin case = `thin-sam`.** A manager wrote **one generic line** of notes. It's real and genuinely thin — a fair stand-in for an early user who barely fills anything in.
- From that little info, Sero makes the **3 things you asked about**: a set of **QUESTIONS**, a pre-meeting **BRIEF**, and a post-meeting **SUMMARY**.
- All three sit in run logs we already have → we can judge them all **for free**.
- **One honest caveat** (matters for later): in `thin-sam` the *employee* also stonewalled (one-word answers). That's actually perfect for testing whether the **summary stays honest**, and it does **not** affect the questions or brief (those are built *before* the meeting). If you'd also like a "manager gave little, but the meeting went normally" case, say so and I'll add one.

---

## How thin is "thin"? (the real input)

**`thin-sam` — what the manager actually gave Sero:**
> **Who:** Sam · Product Designer · Mid
> **Meeting:** Bi-weekly check-in
> **Notes:** *"Regular fortnightly check-in. Want to see how the last two weeks have landed."*

That's it. One sentence. This is the "little info" you want to pressure-test.

**For contrast — a *rich* input (Tom, a real run from today):** the manager wrote a full paragraph naming specific worries (Principal-scope not visible, asks few questions, cross-team trust unclear). Night and day:

```
THIN  (Sam)   ▏ "Want to see how the last two weeks have landed."          ← 1 line
RICH  (Tom)   ▏ "...delivery is steady, but Principal-level impact is not   ← ~5 lines,
              ▏  visible yet... needs early expectation alignment... test     specific,
              ▏  whether he understands what Principal scope means..."         pointed
```

The whole point of this check: does Sero still give something **good** from the top line, not just the bottom one?

---

## Where the 3 outputs come from (the map)

A run flows through stages. Here's which stage makes each thing you see:

```
manager's little info
        │
        ▼
  ① focus-points ──▶ ② PREPARATION ──▶ ③ QUESTION-BANK ──▶ ④ the meeting ──▶ ⑤ EVALUATION
                        =  BRIEF            = QUESTIONS         (turns)          = SUMMARY
```

| What you see | Made in stage | File in a run log | In plain words |
|---|---|---|---|
| **QUESTIONS** | `03-question-bank` | `03-question-bank/response.json` | The list of questions to ask in the 1:1 |
| **BRIEF** | `01b-preparation` | `01b-preparation/response.json` | The pre-meeting prep: the core issue, an opener, what to listen for, what to avoid |
| **SUMMARY** | `05-evaluation` | `05-evaluation/final.json` | The after-meeting read: headline, key points, honest truths, next actions |

*(So "brief" = what you read **before** the meeting; "summary" = what you get **after**. Two different things — good to keep straight.)*

---

## A peek at what the thin case actually produced

**QUESTIONS** (from just "Product Designer, Mid, biweekly, how did the last 2 weeks land") — a sample of the 10 it built:
- *"Which design decision from the last two weeks felt like it really held up?"*
- *"Where did scope shift on you in the last fortnight?"*
- *"Which user flow feels most settled now?"*
- *"What would you want more from me on before the next round starts?"*

First impression: these are **specific to a designer**, not generic "how are you doing" filler. (Judging that properly is Phase 3.)

**SUMMARY** (after Sam stonewalled) — the headline:
> *"Sam gave only one-word answers all session — this is a partial read, not a verdict on pace, clarity, or engagement."*

First impression: it **refused to fake a read** — it says "too thin to tell" instead of inventing a diagnosis. That's the honest behaviour we want. (Judging that properly is Phase 4.)

---

## Honest read for Phase 1
- ✅ `thin-sam` is a **fair, real "little info" case** — good anchor for the whole check.
- ✅ The 3 outputs are clearly located and free to read.
- ⚠️ **Caveat:** `thin-sam`'s meeting is adversarial (employee won't talk). Great for the **summary honesty** test; for the **brief + questions** it doesn't matter (they're built before the meeting, from the thin note alone).
- 👉 **My recommendation:** use `thin-sam` as the anchor for Phases 2–4. If you want, I'll *also* pull one "normal" run so each phase can show thin-vs-rich side by side.

---

## ✅ Your move
- **Say "go"** → I start **Phase 2: is the BRIEF good?** (judge `thin-sam`'s pre-meeting prep, honestly).
- Or: **"add a normal case"** → I'll pick a second run so every phase shows thin-vs-rich.
- Or: **"different case"** → tell me and I'll swap the anchor.

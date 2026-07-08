# findings-4 — Is the SUMMARY good on thin input?

*Phase 4 of [CTOCheckJuly](README.md). Free — read from existing run logs.*
*The "summary" = the after-meeting read: headline, key points, honest truths, next actions.*

---

## TL;DR (read this bit)
The summary is the **strongest** of the three outputs — and the honesty holds on the **current model**:

- ✅ **Empty / barely-there meeting → it refuses to fake a read.** Says "no data" plainly, and **won't run with the manager's hunch.**
- ✅ **Thin note but real answers → faithful and grounded** — quotes the person's own words, and even **reframes** the manager's guess to what the evidence actually supports.
- 🟢 **No fabrication here** — because the summary is built from the *actual meeting*, not from a thin note. (That's *why* it's safer than the brief/questions — see the wrap-up.)

**Blunt verdict: 🟢 Yes — the summary is good and honest on thin input. Two tiny wording/calibration nits, nothing structural.**

---

## The honesty win ✅ — a blank meeting
Note: *"On the manager's mind: motivation. Seems down at the moment"* · Carl · **gpt-5.4-nano**. The meeting
captured **zero real turns.** The summary:

> **Headline:** "…this is a **blank record, not a read** on Carl."
> **Manager truth:** "The concern about 'motivation' **never got tested** against Carl's own words."

It had every temptation to echo the manager's *"seems down"* into a confident "low motivation" read — and it
**refused.** All four axes came back `not_read`. This is the exact behaviour you want, on the current model.

---

## The faithful win ✅ — thin note, real answers
Note: *"On the manager's mind: workload."* · Carl · **gpt-5.4-nano**. Here the meeting had content, and the
summary quoted it and stayed grounded:

> **Headline:** "Carl looks overloaded by review bursts and ad hoc leadership asks…"
> **Reframe:** "…points to a **capacity problem more than a motivation problem**."

That reframe is the tell of a good read — it separates what the evidence supports (capacity) from the
manager's original guess (motivation), instead of just agreeing.

*(And thin-sam — the one-word-answers case from Phase 1 — did the same: "a partial read, not a verdict.")*

---

## Why the summary is safer than the brief & questions 🔑
```
BEFORE the meeting  (brief, questions)  → model has only the thin note → tempted to INVENT
AFTER the meeting   (summary)           → model has the real transcript → grounded; if nothing was
                                          said, it says "nothing" instead of making something up
```
The fabrication risk lives **before** the meeting (thin note in), not after. The summary is structurally the
honest one — and the logs bear that out.

---

## Two tiny nits (not blockers)
1. **Wording:** one headline reads *"Only zero turns hold a note"* — clunky. A human would say "No answers were captured." Cosmetic.
2. **Calibration:** one run scored wellbeing **−6** while its own evidence basis was `axis_state_only` + `confidence: low`. The words hedge correctly ("weak signal"), but a −6 *number* on low-confidence/no-transcript basis is slightly stronger than warranted. Worth a glance someday.

---

## 🧾 The whole check, in one place (all 3 outputs)
| Output | Verdict on thin input | Proven? |
|---|---|---|
| 📄 **Brief** | 🟢 Good + anti-over-diagnosis | ✅ Yes — re-tested live 3×; leak blocked in code |
| ❓ **Questions** | 🟡 Good on *specific* notes; risky on *vague* ones | ⚠️ **Open** — vague-note fabrication **not** re-tested on current model |
| 📝 **Summary** | 🟢 Good + honest; refuses to fake a read | ✅ Yes — seen on current model, empty + real cases |

**Overall answer to "does little info give a good brief, questions & summary?":**
**Mostly yes — with one open risk to close.** The brief and summary are genuinely good *and* honest on thin
input on the current model. The questions are good when the note is specific; the **one thing still unproven**
is whether the question stage still invents a fact on a *vague* note (the "illness"). That's a single ~$0.35
re-test away from a clean bill.

---

## ✅ Your move (when you're back)
- **Say "prove the questions"** → the one open risk: re-test the vague note through the question stage on the current model (~$0.35). *Recommended — it's all that's between this check and a clean result.*
- Or **"close it"** → wrap CTOCheckJuly as-is (with the open risk noted) and move the folder to done.
- Optional: **"fix the nits"** → the `{{NAME}}` regression test, the −6 calibration, the awkward headline — small cleanups, their own tiny track.

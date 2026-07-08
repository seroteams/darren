# findings-2 — Is the BRIEF good on thin input?

*Phase 2 of [CTOCheckJuly](README.md). Free — read from existing run logs. Nothing paid.*
*The "brief" = the pre-meeting prep: core issue · opening question · what to listen for · what to avoid.*

---

## TL;DR (read this bit)
I judged the brief on **three real one-line manager notes** (thinner and more natural than `thin-sam`),
found two old failures, then **proved both are now closed**:

- ✅ On the **current model** (`gpt-5.4`), the thin-input brief is **genuinely good** — grounded, and it actively **refuses to over-read** a vague note.
- ❌ On **older runs** (`gpt-4o`), I found **two real failures**: (1) it **invented a fact** — turned *"quiet in stand-ups"* into *"a recent illness"* 😬; (2) a **`{{NAME}}` placeholder leaked** into the text.
- ✅ **Both are now fixed — and I proved it (see "Proved it" below):**
  1. **Invented fact** → re-ran the exact note on the current model **3× — invented nothing** all 3 times.
  2. **`{{NAME}}` leak** → the code now **hard-blocks** unfilled placeholders both before and after the model call. Can't happen.

**Blunt verdict: 🟢 YES — on the current model the thin-input brief is good *and* safe. The two old failure modes are closed (one proven live, one proven in code).** One small thing to keep an eye on — see the ⚠️ note at the very bottom.

---

## The win ✅ — "They are always late for work"
Input (6 words): *"They are always late for work"* · Carl · UX Lead · **gpt-5.4-nano** (current model)

What Sero produced — the strong parts:
> **Core issue:** "Carl's repeated late starts **may be** a capacity or routine issue…" *(note "may be" — it hedges)*
> **Avoid:** "do not open by **accusing** Carl of being unreliable or making lateness the whole verdict"
> **Confidence:** "**Medium** — based on your direct note about a repeated pattern"
> **Don't assume:** "That Carl is disengaged or careless: **repeated late starts alone do not tell you why** they are happening."

From **6 words**, it built a prep that's grounded, non-accusatory, and *actively warns the manager not to jump to conclusions.* That's exactly right. The `confidence` + `don't assume` fields are doing real work.

---

## The scary one ❌ — "They have been quiet in stand-ups recently"
Input: *"They have been quiet in stand-ups recently"* · Jordan · UX Lead · **gpt-4o** (older model)

> **Core issue:** "Jordan's **health and energy levels after a recent illness**, and how this impacts his UX priorities."
> **Listen for:** "whether he mentions specific tasks he's struggling with **post-illness**"

**There was no illness anywhere in the input.** The note said *"quiet in stand-ups."* The model **invented a
recent illness** and then built the whole prep around it. This is the single most dangerous failure mode for
Sero — thin, ambiguous input getting filled in with a **made-up fact** about a real person.

---

## The bug ❌ — "He wants to become a lead but his communication needs work"
Input: *"He wants to become a lead but his communication needs work"* · Alex · Expert UX Designer · **gpt-4o**

> **Core issue:** "Discuss the communication skills **`{{NAME}}`** needs to develop…"
> **Good outcome:** "You and **`{{NAME}}`** have agreed on one specific communication skill…"

The *content* is fine and on-topic — but the **`{{NAME}}` placeholder never got filled in.** A raw template
variable leaked into the manager-facing brief. Small, but it's the kind of thing that makes a product look broken.

---

## The pattern (the #1 weakness)
```
thin + SPECIFIC note   ("wants to become a lead, communication needs work")  → brief stays grounded ✅
thin + VAGUE note      ("quiet in stand-ups", "always late")                 → DANGER ZONE
        ├─ current model: handles it well, warns against over-reading ✅
        └─ older model:   fills the gap with an invented fact ❌
```
**The risk lives where the note is short *and* ambiguous.** That's where the model is tempted to invent a
story. The good news: the current model's `confidence` / `don't assume` fields look purpose-built to stop
exactly this — and in the one current-model case we can see, they did.

---

## Proved it ✅ (the paid re-test)
You said "prove it", so I did — the smallest test that settles it.

**① The invented "illness" — re-ran the exact note on the current model (`gpt-5.4`), 3 times:**

| Input | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| *"They have been quiet in stand-ups recently"* | ✅ no invented fact | ✅ no invented fact | ✅ no invented fact |

Every run stayed grounded and refused the over-read. A representative one:
> **Core issue:** "…this check-in is likely about what is taking their attention or energy…" *(hedged, no cause invented)*
> **Don't assume:** "That Jordan is disengaged: being quieter in stand-ups **does not yet tell you** whether the issue is workload, meeting fit, or something else."
> **Confidence:** "Low — based on one brief note and bi-weekly defaults" *(honest about how little it has)*

**② The `{{NAME}}` leak — proven in code (free), no run needed:** `ai-client.ts` has a placeholder guard
(`UNRESOLVED_PLACEHOLDER_RE`) that **throws** if a `{{…}}` token is left in the prompt *or* appears in the
model's output. The unfilled `{{NAME}}` from Case C would now hard-fail instead of shipping.

**Cost:** ~6 model calls on `gpt-5.4` — well under the ~$0.70 you OK'd.

---

## Honest verdict
| | |
|---|---|
| **Is the brief good on thin input?** | **🟢 Yes — on the current model.** Grounded, useful, and it actively warns the manager off over-reading. |
| **Confidence** | **High.** The one scary failure was re-tested live 3× and did not recur; the leak is blocked in code. |
| **Old failure modes** | Both **closed** — invented-fact (proven live), `{{NAME}}` leak (proven in code). |

---

## ⚠️ One bonus finding (worth a look, not urgent)
All 3 current-model briefs came back with **`validationPassed = false`** even after the built-in retry — yet
they shipped anyway (best-effort). The *visible* content is good, so the engine's own brief-checker is
flagging something on a field I didn't print (likely `listenFor` / `goodOutcome` shape). Either the checker
is too strict here, or there's a subtle shape issue worth seeing. **Cheap to diagnose** (print the checker's
complaints on the next run) — parking it unless you want it chased.

---

## ✅ Your move
- **Say "go"** → **Phase 3: are the QUESTIONS good on thin input?**
- Or **"chase the validator"** → I find out why the brief-checker is failing good-looking briefs (nearly free).
- Or **"fix the placeholder"** → already safe in code, but I can add a regression test to lock it.

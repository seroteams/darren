# Guardrails — keeping Carl on track

> **What this is, in one line:** a short list of the ways Carl tends to drift off-plan, and a
> promise from the AI to *warn him in plain language* the moment a request looks like one of them —
> instead of quietly going along with it.

You already run **code gates** that block bad pipeline output (things like `FOCUS_ARC_LEAK` and
`PRIVATE_NOTE_LEAK`). This is the same idea, pointed at **your decisions** rather than the engine's
output. It’s a softer layer: it **warns, it never blocks.** You can always say "proceed anyway" —
the point is that you decide on purpose, not by drift.

**Silence means on-track.** If a request is fine, you get no warning at all. No nagging.

---

## The five guardrails

### 1. Goal drift — chasing features or polish
The real win is *a real HR manager gets insight worth paying for* — not a prettier demo or more
features. If a request optimises for looks or "more stuff" over that goal, I'll flag it.
- **Looks like:** "Make the dashboard nicer for the demo." / "Let's add a charts page."

### 2. Pace drift — jumping ahead or skipping the check
The Darren Method is **one phase at a time, one step at a time**, and *you* test-and-approve each
phase before the next starts. I don't self-certify. If a request runs ahead of that, I'll flag it.
- **Looks like:** "Skip the QA, just do phases 1 and 2 together." / "Trust me, mark it done."

### 3. Honesty drift — flattery or hiding a problem
Sero must tell the truth, not echo the manager back to themselves. And we never hardcode a text
rewrite to paper over a model problem — we surface it. If a request accepts flattery as success or
asks to hide a flaw, I'll flag it.
- **Looks like:** "That briefing's great, it really gets the manager" (when it's just repeating their
  words back). / "Just hardcode it to say the right thing."

### 4. Money drift — paid runs without eyes open
Anything that hits the OpenAI API (`gate`, `smoke`, `eval`, persona runs, live replays) costs money
(~$0.35 a run, ~$3 the full gate). **Free checks come first, always.** A task may use **one** paid run
without asking — but only when a free check genuinely can't prove the point (a ceiling, not a freebie).
I'll still state the rough cost and run the **smallest thing that proves the point**. A **second or
further** paid run on the same task needs your explicit yes. (Updated 2026-07-07.)
- **Looks like:** "Run the full gate." → I'll quote the cost and suggest a single case first.
- **Looks like:** already used the task's one run and want another → I'll pause and ask before spending again.

### 5. Scope creep — new ideas jammed into the current step
Good ideas mid-step get **parked**, not bolted onto what we're doing right now. If a new ask would
balloon the current step, I'll flag it and offer to park it.
- **Looks like:** "While we're here, let's also wire up settings." (mid-way through an unrelated step)

---

## How a warning looks

When a guardrail fires, I lead my reply with this — then wait for your call:

> ⚠️ **Heads up — this looks like [drift type].**
> - **Why I'm flagging it:** [one plain sentence tied to your goal or a standing rule]
> - **On-track move:** [what staying on plan looks like instead]
> - **Your call:** proceed anyway ▶️ / adjust ⏸️

That's it. You're never blocked — you're just never drifting by accident.

---

*This file is the single source for the guardrails. It's activated every turn by a hook
(`.claude/hooks/guardrails-reminder.txt` via `.claude/settings.json`) and referenced from
`CLAUDE.md`'s standing rules.*

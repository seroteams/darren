# Product

## Register

product

## Users

People managers and team leads preparing for a 1:1 with a direct report (the demo personas — designers, leads, ICs at junior→senior levels — stand in for those reports). They reach for Sero in the minutes or hours before a 1:1, often while context-switching out of other work, sometimes when the conversation is emotionally loaded (performance, burnout, growth, a stalled project). The job to be done: walk in prepared with a clear read on what actually matters for this person right now, the right questions to ask, and a concrete plan, without spending an hour assembling it themselves.

## Product Purpose

Sero turns scattered context about a direct report into a structured 1:1 prep. It runs a guided pipeline — Setup → Focus areas → Prep brief → Questions → Live Q&A → Synthesis → Briefing — and produces a final briefing that names the real signal ("what stood out"), explains the reasoning ("what we understood"), scores four axes (Wellbeing, Engagement, Clarity, Growth), and hands over concrete next actions ("today" / "next 1:1") and reminders. Success looks like a manager opening the briefing and immediately knowing what to talk about and why, with notes they can carry into the room. It is a thinking tool for the conversation, not a system of record.

## Brand Personality

Calm, perceptive, plain-spoken. Three words: **grounded, perceptive, unhurried.** The voice reads like a sharp colleague debriefing you, not an HR platform or an AI assistant: full sentences, no jargon, no exclamation, willing to state an uncomfortable read directly but never clinical about it ("comes from unclear readiness... not from lack of effort"). It should feel like it respects both the manager's time and the human being discussed. Emotional goal: confidence and steadiness going into a high-stakes human conversation.

## Anti-references

- **Generic AI-tool aesthetic** — dark mode, purple/neon gradients, glassmorphism, glowing orbs-as-decoration. Sero is light, warm, and quiet.
- **The dashboard / hero-metric template** — big number + small label + supporting stats grids. Sero leads with a sentence, not a KPI.
- **Clinical HR / performance-management software** — rating rubrics, traffic-light scorecards, corporate-blue chrome that makes a person feel like a ticket.
- **Slide-deck "insight" decks** — confident-sounding bullet salad with no reasoning shown.

## Design Principles

1. **Plain language over jargon.** Every label and line reads like a person talking. If it sounds like enterprise software, rewrite it.
2. **Show the reasoning, not just the score.** Axis numbers always sit next to the prose that earned them. Never a number on its own.
3. **Calm under loaded content.** The subject matter is people and feelings; the UI stays steady, uncluttered, and low-drama so the content can be honest.
4. **One screen, one job.** The pipeline is staged for a reason — each stage asks for or shows one thing. Resist cramming.
5. **The tool serves the conversation.** Outputs are portable (copy buttons everywhere) because the real work happens in the room, not in the app.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**. Known current gaps to hold the line on: text contrast on the primary accent (`#5aa9e6` + white ≈ 2.5:1) and the warning red must reach 4.5:1 for normal text; the stage breadcrumb must stay usable on mobile (it currently truncates). `prefers-reduced-motion` is already respected and should remain so — the reveal/orb animations must always have a static fallback. Keyboard navigation and visible `:focus-visible` rings are expected on every interactive element.

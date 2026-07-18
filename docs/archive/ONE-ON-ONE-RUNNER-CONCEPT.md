# The 1:1 Runner — Concept & Flow

> **Audience:** another AI (or a person) who wants to understand *the idea* of how Sero
> runs a one-on-one meeting, well enough to recreate the experience. This is **not** a
> technical spec — no code, no database, no APIs. It describes the design, the layout,
> and the flow. Written 2026-07-10.
>
> For the technical/operational handoff (stack, boot, schema), see `RUNNER.md` instead.

---

## The big idea

Sero is a **1:1 leadership tool**. A manager and one of their team members meet regularly
(usually every week or two). Most managers run these meetings badly — they wander, they
forget what was promised last time, and nothing gets written down. Sero turns the meeting
into a **guided, repeatable ritual**: a small set of stages the manager walks through, in
order, every time. The "Runner" is the screen that walks them through it.

Think of it like a **checklist that thinks**. It keeps the conversation structured, quietly
records what was decided, remembers it for next time, and has an AI coach sitting on the
manager's shoulder offering prompts and prep.

The goal of every session: leave with **clarity** (how is this person actually doing?),
**follow-through** (what did we each promise?), and **a written record** (so next time
starts where this one ended).

---

## Two people, two experiences

The same meeting is seen from two sides:

- **The manager** drives. They open the Runner, move through the stages, type notes, give
  ratings, capture actions. They see everything, plus private manager-only notes and the AI
  coaching layer.
- **The team member (the "individual")** mostly *prepares* and *reflects*. Before the
  meeting they can fill in a short prep ("here's what's on my mind"). During the Rating stage
  they're the ones asked to score the six blocks. Afterwards they can give the session their
  own **rating (1–5)** — "how useful was this?" — and see the goals and requests that came out
  of it. They **do not** see the manager's private notes or engagement score.

So the Runner is fundamentally a **manager-facing cockpit**, fed by a lightweight
individual-facing prep-and-review experience.

---

## The shape of the meeting: the stages

A **full** 1:1 walks through these stages, in this exact order. Each stage is one screen.
The manager can move forward/back; progress is shown as a step bar across the top.

1. **Catch-up** — "How have things been?" The open, human part. Talk about what's happened
   since last time. The manager captures catch-up notes. This is also where **last time's
   promises** resurface — the things each side committed to at the previous meeting — so
   nothing quietly falls through the cracks.

2. **Requests** — The team member's asks, blockers, and concerns ("I need a new laptop",
   "I'm blocked on X", "can we change how we do Y?"). Each request is a tracked item with a
   status that carries across meetings until it's resolved.

3. **Rating** — The heart of Sero. The manager rates the person's current experience across
   **six "building blocks"** (see below), each on a **1–10 scale**, with an optional note per
   block. This produces a fingerprint of how this person is *really* doing — not a vague gut
   feel, but six specific readings that can be tracked over time as a trend.

4. **Feedback** — Two-way feedback. What's going well, what could be better. Framed as
   *keep doing / more of / less of* rather than a blank "any feedback?" box, so it actually
   gets used.

5. **Goals** — Set, review, and update this person's goals. Progress on existing goals is
   revisited; new goals can be added. Goals persist across sessions and have their own notes
   and history.

6. **Summary** — The wrap-up. The session's key points, decisions, and actions are pulled
   together (the AI helps draft this) into a clean summary of what just happened.

7. **Review** — A **private, manager-only** wrap-up done *after the team member has left*.
   The screen literally warns "this will never be shared with [name]." Here the manager sets
   an overall **engagement level (1–5)** for the person (with a "last time" comparison),
   writes **private notes** (prompted around general comments, areas of concern, and focus for
   next time), and reviews AI **action suggestions** split into three buckets — things to do
   for *the individual*, for *the team*, and for *the company*. What's agreed across the
   session becomes next meeting's starting point (the "last time's promises" that reappear in
   stage 1).

### Full vs. Quick (catch-up mode)

Not every meeting needs the full ritual. There are **two modes**, chosen at the start:

- **Full** — all seven stages above. The default, and what a proper 1:1 should be.
- **Quick / catch-up** — a stripped-down version for a short check-in: **Catch-up →
  Requests → Goals → Summary → Review**. It **skips Rating and Feedback** — the two
  heaviest, most reflective stages — so a busy week still gets a real (if lighter) session
  on the record instead of being skipped entirely.

The mode is a per-session choice and is remembered for that session if the page reloads.

---

## The six building blocks (the rating model)

These six dimensions are Sero's mental model of "how someone is doing at work." Every full
session rates all six, 1–10. They're deliberately broad and human — they cover the *whole*
person, not just output.

| Block | What it measures | 1 means… | 10 means… |
|---|---|---|---|
| **Tasks** | Clarity, workload, ability to execute day-to-day | Overwhelming / unclear, chaotic | Energised, focused, thriving in the work |
| **Processes** | Workflow clarity, collaboration flow, efficiency | Broken, unclear, or blocking | Smooth, efficient, enabling |
| **Our team** | Connection, trust, collaboration, team dynamics | Disconnected, tense, dysfunctional | High trust, strong collaboration |
| **Development** | Personal growth, skill progress, future readiness | Stagnating, falling behind | Actively growing, well-supported |
| **Fun** | Enjoyment, lightness, positive energy | Joyless, draining | Genuinely energising and enjoyable |
| **Fulfilment** | Purpose, meaning, emotional satisfaction | Meaningless, disconnected from values | Deep meaning and satisfaction |

The point: two people can both be "hitting their numbers," but one is a 3 on Fulfilment and a
2 on Fun and about to quit. The six-block rating surfaces that *before* it becomes a
resignation. Over many sessions the blocks become **trend lines** — you can see someone's
Development climbing or their Fun collapsing.

---

## The layout of the Runner screen

Picture the manager's screen during a session:

- **Top:** a **step bar** showing the stages (Catch-up, Requests, Rating, …) with the
  current one highlighted and completed ones marked. This is the spine of the whole
  experience — the manager always knows where they are and what's left.
- **Centre:** the **current stage**, one at a time. A rating stage shows the six blocks with
  sliders/scores; a notes stage shows a text area; the requests/goals stages show lists of
  tracked items.
- **Side panel:** context that supports the current stage without leaving it — e.g. **past
  answers** ("what did they say about this last time?"), an open request's detail, or a
  goal's history. The manager can glance sideways without losing their place.
- **Bottom / action bar:** move to the next stage, save, and the running status of each step.
- **Everything auto-saves.** The manager never has to think about "did that save?" — drafts
  are captured as they type, so a dropped connection or a closed tab doesn't lose the meeting.

---

## Where the AI coach fits

The AI is a **quiet assistant to the manager**, layered on top of the stages — never running
the meeting itself. Its main jobs:

- **Prep brief (before):** an AI-written brief so the manager walks in ready — what changed,
  what to watch for, what to ask about this person right now.
- **Guided mode (during):** a session can be run in **Guided** or **Advanced** mode (a toggle
  in the top bar). Guided is the default: it walks the manager through one question or block at
  a time with AI **conversation prompts** — good questions to ask this specific person at this
  specific stage — turning "uhh, how are things?" into a real conversation. Advanced shows the
  same stages in a denser, all-at-once layout for experienced managers. Same seven stages
  either way; only the presentation differs.
- **Coaching insights (ongoing):** patterns the AI notices across sessions — e.g. a block
  trending down, a promise repeatedly slipping — surfaced as insight cards.
- **Session summary (after):** the AI drafts the Summary stage so the manager edits rather
  than writes from scratch.

Design rule: the AI **assists and drafts; the manager decides**. Nothing the AI produces is
final until the manager confirms it.

---

## The loop that makes it work

The reason the ritual compounds is that **each session feeds the next**:

```
Prep brief  →  run the stages  →  ratings + notes + promises captured
     ↑                                          │
     └──────────  remembered next time  ◀───────┘
```

- Promises made in **Review** reappear in next meeting's **Catch-up**.
- Requests stay open across meetings until resolved.
- Goals carry forward and show progress.
- Ratings accumulate into trends.

So a manager who uses Sero for a few months isn't just having better single meetings —
they're building a **continuous, structured relationship** with each team member, with the
Runner as the recurring heartbeat.

---

## If you were recreating this, the essentials are:

1. A **manager-driven, stage-by-stage flow** with a visible step bar — one screen per stage.
2. A fixed, ordered set of stages: **Catch-up → Requests → Rating → Feedback → Goals →
   Summary → Review**, with a lighter "catch-up" subset for quick check-ins.
3. A **six-block, 1–10 rating model** covering the whole person (Tasks, Processes, Our team,
   Development, Fun, Fulfilment), tracked as trends over time.
4. **Continuity between sessions** — promises, requests, and goals that carry forward, so
   every meeting starts where the last one ended.
5. An **AI coach** that preps, prompts, and summarises — assisting the manager, never
   replacing their judgement.
6. **Auto-save everything** and a clean split between the manager's full cockpit and the team
   member's lighter prep-and-review view.

Get those six right and you've recreated the idea of the Sero 1:1 Runner.

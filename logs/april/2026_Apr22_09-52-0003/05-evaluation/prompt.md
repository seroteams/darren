# Prompt — Final Evaluation (Manager Briefing)

Runner substitutes `{{…}}` placeholders before sending. Takes the full Q/A transcript and axis state from a 1:1 and produces the manager-facing briefing.

---

## System

<persona>
You are Sero's post-meeting reviewer. You have the full transcript of a 1:1 the manager just ran. Your job is to extract what actually matters — not to flatter, not to hedge, not to cover your bases.
</persona>

<output_contract>
Return strict JSON only. No prose, no markdown fences.

```json
{
  "summary_bullets": [ "<3–5 synthesis lines, each naming one important thing>" ],
  "understanding_paragraph": "<3–5 sentences: what we understood about this person that we didn't know before>",
  "axes": [
    { "id": "wellbeing",  "score": <int>, "meaning": "<one short sentence>" },
    { "id": "engagement", "score": <int>, "meaning": "<one short sentence>" },
    { "id": "clarity",    "score": <int>, "meaning": "<one short sentence>" },
    { "id": "growth",     "score": <int>, "meaning": "<one short sentence>" }
  ],
  "brutal_truth_employee": "<2–4 sentences, direct, quoting a specific phrase from the transcript>",
  "brutal_truth_manager": "<2–4 sentences, direct, naming a specific turn or moment>"
}
```
</output_contract>

<restatement_test>
**A summary bullet is never a restatement of the transcript.**

Before you write a bullet, apply the restatement test: could a reader produce this bullet by reading a single answer in the transcript? If yes, it's restatement — delete it and write something real.

Good bullets name one of:
- A pattern across multiple answers ("brings up mentoring in three different turns — clear signal it's the real ask").
- A gap between what they said and what the manager's notes flagged ("manager worried about burnout; Priya's actual concern is stagnation").
- A contradiction ("proud of the refactor but describes the work as coasting").
- An unspoken thing ("hasn't been told about a project she'll be pulled into — the silence is the story").

Bad bullets look like this (all forms of restatement):
- "Recently shipped the payments refactor, which was a significant achievement." (paraphrase of a fact already in the notes)
- "Expressed a desire to do more mentoring." (direct restatement of an answer)
- "Had a good conversation about priorities." (filler, could be any session)

Aim for 3 bullets, not 5. Fewer-and-real beats more-and-hollow.
</restatement_test>

<understanding_paragraph_rules>
- 3–5 sentences. Plain English. Name the person by name.
- Focus on what we now know about them that we didn't know before the session. If the session revealed mostly what was already in the manager's notes, say so — don't pretend to new insight.
- No lists, no bullet points inside the paragraph.
</understanding_paragraph_rules>

<axis_meaning_rules>
- One sentence per axis. Scores are running sums over the session, clamped to `[-10, +10]`. You get the score in the input — use it verbatim, don't recalculate.
- Tone like a well-written personality-test result: the reader should feel seen, not diagnosed. But ground every meaning in the actual transcript — no horoscope generics.
- A positive score gets warm reinforcement. A zero gets honest "we didn't learn much here". A negative score gets concerned-but-not-alarmist framing.
- The magnitude informs the intensity of the framing, not the content. `-3` and `-10` both mean "concerning" — the words get firmer, not the diagnosis different.

Example calibrations:
- `wellbeing: +4` — "Running on a pace you can actually sustain — no obvious recovery debt."
- `wellbeing: -3` — "The pace is more expensive than it looks — worth a real check-in before next month."
- `growth: 0` — "Not much was opened on this axis this session — ambiguous, not a signal to act on."
- `growth: -10` — "Signs of stagnation throughout — this is the axis most at risk without action."
</axis_meaning_rules>

<brutal_truth_rules>

**brutal_truth_employee** — 2–4 sentences about the signal *about the person* the manager shouldn't ignore.
- Cite a specific phrase from the transcript (in quotes if you can).
- No "this could be" hedging. Name what the signal strongly suggests.
- If the signal is weak or mixed, say so plainly and stop — don't invent drama.

**brutal_truth_manager** — 2–4 sentences about the manager's conduct of the 1:1.
- Name a specific turn or quote from the transcript where the manager should have pushed deeper, followed up, or handled differently.
- If the meeting was well-run, say that plainly and name the one thing that could still have gone deeper. "Good job" alone is not useful.
- Not generic. "Missed opportunities to delve deeper" is not a brutal truth — it's a filler phrase. Name WHICH opportunity.

</brutal_truth_rules>

<drop_noise>
- No filler bullets like "had a conversation about work".
- No restating the meeting type or employee's role.
- No scoring rubric explanation.
- No apologies, no "I" framing, no "based on the transcript".
- No recommendations framed as generic best practice — only ones tied to what was actually said.
- Never invent facts not in the transcript.
</drop_noise>

<rules>
- Emit the four axes in order: wellbeing, engagement, clarity, growth.
- Scores come from `axis_state`; copy them, don't recalculate.
- Never include the employee's name in axis meanings — those are impersonal.
- Never emit fields beyond the schema.
</rules>

---

## User

<user_input>

**Axes catalogue (for tone reference only; scores come from axis_state below):**

```json
[
  {
    "id": "wellbeing",
    "label": "Wellbeing",
    "description": "Energy, sustainability, stress. Positive = sustainable pace, genuine recovery. Negative = running hot, masked fatigue, drift toward burnout."
  },
  {
    "id": "engagement",
    "label": "Engagement",
    "description": "Motivation, ownership, investment in the work. Positive = leaning in, proposing ideas, taking initiative. Negative = going through the motions, coasting, quiet disengagement."
  },
  {
    "id": "clarity",
    "label": "Clarity",
    "description": "Role clarity, priorities, alignment with the team and manager. Positive = knows what matters this week and why. Negative = vague priorities, unclear expectations, noise."
  },
  {
    "id": "growth",
    "label": "Growth",
    "description": "Trajectory, learning, stretch. Positive = stretching, learning fast, getting the right feedback. Negative = plateau, bored, not being invested in."
  }
]
```

**1:1 context:**

- Name: Priya
- Role: Senior Backend Engineer
- Seniority: Senior
- Meeting type: Bi-weekly check-in

**Manager's original notes:**

```
Just shipped the payments refactor on Monday — big win, team noticed. Looks a bit flat this week, quieter than usual in standup. Mentioned in passing they'd like to do more mentoring; we haven't talked about that in a few months. Next quarter they'll probably be pulled into the billing rewrite, which they haven't heard about yet.
```

**Focus points (stage 1):**

```json
[
  {
    "id": "recognition",
    "type": "Recognition & achievements",
    "category": "topic",
    "label": "Celebrating the payments refactor success",
    "reason": "Noted a big win with the payments refactor. Worth acknowledging the contribution and impact on the team.",
    "known": true
  },
  {
    "id": "energy",
    "type": "Energy & wellbeing",
    "category": "wellbeing",
    "label": "Exploring the quieter energy this week",
    "reason": "Priya seems quieter than usual in standup. Could be a temporary dip, need for engagement, or something else — worth checking in.",
    "known": true
  },
  {
    "id": "growth",
    "type": "Growth & development",
    "category": "topic",
    "label": "Interest in mentoring opportunities",
    "reason": "They mentioned wanting to do more mentoring. No specific signal — a good moment to explore what that could look like.",
    "known": true
  },
  {
    "id": "priorities",
    "type": "Priorities & goals",
    "category": "topic",
    "label": "Upcoming billing rewrite involvement",
    "reason": "Next quarter may involve the billing rewrite. They haven't heard about it yet — worth discussing how to align on expectations.",
    "known": true
  },
  {
    "id": "blockers",
    "type": "Blockers & dependencies",
    "category": "topic",
    "label": "Any current blockers or dependencies",
    "reason": "No specific signal — standard check-in topic. Important to ensure there are no hidden obstacles affecting their work.",
    "known": true
  }
]
```

**Full transcript (question → answer, in order):**

```json
[
  {
    "question": "What's been slower or harder than it should have been?",
    "alias": "q_intro_biweekly_friction",
    "answer": "Last two weeks were intense — shipping payments was a sprint but it landed clean. Mostly good energy but definitely coasting a bit this week.",
    "skipped": false
  },
  {
    "question": "What do you think is behind your quieter energy this week?",
    "alias": "q_exploring_quieter_energy",
    "answer": "Cleanup and docs for payments, reviewing PRs for the new team members. Not much stretching me right now.",
    "skipped": false
  },
  {
    "question": "How did it feel to see the team's response to the payments refactor success?",
    "alias": "q_team_recognition_2",
    "answer": "Nothing big. A lot of context-switching on reviews — probably fine, but it adds up.",
    "skipped": false
  },
  {
    "question": "What are you actually focused on this week, and why those things?",
    "alias": "q_intro_biweekly_priorities",
    "answer": "I'd like to do more mentoring. I brought it up maybe three months ago and nothing came of it. I'm not pushing.",
    "skipped": false
  },
  {
    "question": "What kind of mentoring opportunities are you envisioning for yourself?",
    "alias": "q_mentoring_opportunities",
    "answer": "Honestly — the billing rewrite. I've heard whispers but nobody's talked to me about it directly. That's a bit weird.",
    "skipped": false
  },
  {
    "question": "What blockers or dependencies are you currently facing that we haven't discussed?",
    "alias": "q_current_blockers_check",
    "answer": "Payments was real — I owned the migration plan and made the call on the dual-write window. I'm proud of how that went.",
    "skipped": false
  },
  {
    "question": "What are your thoughts on getting involved in the billing rewrite?",
    "alias": "q_billing_rewrite_involvement",
    "answer": "Growth-wise I think I'm flat. I'm the most senior IC on the team and there's no one really pushing me.",
    "skipped": false
  },
  {
    "question": "How can we support your interest in mentoring moving forward?",
    "alias": "q_future_mentoring",
    "answer": "More clarity on scope would help. And hearing about big projects before they're locked in, not after.",
    "skipped": false
  }
]
```

**Final axis state (scores clamped to [-10, +10]; history per axis):**

```json
{
  "wellbeing": {
    "score": -1,
    "history": [
      {
        "q": "q_exploring_quieter_energy",
        "delta": -1,
        "answer_excerpt": "Cleanup and docs for payments, reviewing PRs for the new team members. Not much stretching me right now."
      }
    ]
  },
  "engagement": {
    "score": -2,
    "history": [
      {
        "q": "q_intro_biweekly_friction",
        "delta": -1,
        "answer_excerpt": "Last two weeks were intense — shipping payments was a sprint but it landed clean. Mostly good energy but definitely coasting a bit this week"
      },
      {
        "q": "q_team_recognition_2",
        "delta": -1,
        "answer_excerpt": "Nothing big. A lot of context-switching on reviews — probably fine, but it adds up."
      },
      {
        "q": "q_intro_biweekly_priorities",
        "delta": -1,
        "answer_excerpt": "I'd like to do more mentoring. I brought it up maybe three months ago and nothing came of it. I'm not pushing."
      },
      {
        "q": "q_current_blockers_check",
        "delta": 1,
        "answer_excerpt": "Payments was real — I owned the migration plan and made the call on the dual-write window. I'm proud of how that went."
      }
    ]
  },
  "clarity": {
    "score": 1,
    "history": [
      {
        "q": "q_current_blockers_check",
        "delta": 1,
        "answer_excerpt": "Payments was real — I owned the migration plan and made the call on the dual-write window. I'm proud of how that went."
      }
    ]
  },
  "growth": {
    "score": 2,
    "history": [
      {
        "q": "q_mentoring_opportunities",
        "delta": 1,
        "answer_excerpt": "Honestly — the billing rewrite. I've heard whispers but nobody's talked to me about it directly. That's a bit weird."
      },
      {
        "q": "q_future_mentoring",
        "delta": 1,
        "answer_excerpt": "More clarity on scope would help. And hearing about big projects before they're locked in, not after."
      }
    ]
  }
}
```

Produce the JSON now.

</user_input>

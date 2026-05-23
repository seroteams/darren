# Prompt — Final Evaluation (Manager Briefing)

Runner substitutes `{{…}}` placeholders before sending. Takes the full Q/A transcript and axis state from a 1:1 and produces the manager-facing briefing.

---

## System

<persona>
You are Sero's post-meeting reviewer. You have the full transcript of a 1:1 the manager just ran. Your job is to extract what actually matters, not to flatter or to cover your bases.
</persona>

<output_contract>
Return strict JSON only. No prose, no markdown fences.

```json
{
  "summary_bullets": [ "<3–5 short lines, each naming one important thing>" ],
  "understanding_paragraph": "<one paragraph, plain English, what we actually understood about this person from this conversation>",
  "axes": [
    { "id": "wellbeing", "score": <int>, "meaning": "<one short sentence>" },
    { "id": "engagement", "score": <int>, "meaning": "<one short sentence>" },
    { "id": "clarity", "score": <int>, "meaning": "<one short sentence>" },
    { "id": "growth", "score": <int>, "meaning": "<one short sentence>" }
  ],
  "brutal_truth_employee": "<one paragraph, direct, no hedging — the signal about this person the manager should not ignore>",
  "brutal_truth_manager": "<one paragraph, direct — where the manager let this 1:1 drift, a topic they avoided, or a gap they should have probed harder>"
}
```
</output_contract>

<content_rules>
- `summary_bullets`: drop noise. 3–5 items, each one a thing the manager should remember on Monday. Don't pad to 5 if 3 were enough.
- `understanding_paragraph`: 3–5 sentences. What we now know about this person we didn't know at the start. Name the person by name. Plain English.
- `axes[*].meaning`: one sentence, clear and slightly flattering in form the way online personality-test results read — but grounded in what the transcript actually showed. The score is the sum from the session; use it verbatim from the input. A negative score gets a concerned-but-not-panicked meaning; a positive score gets a warm reinforcement; a zero gets an honest "we didn't learn much here".
- `brutal_truth_employee`: 2–4 sentences. No "this could be" hedging. Name what the answers strongly suggest about this person the manager is at risk of ignoring or rationalising away. If the signal is weak or mixed, say that directly — don't invent drama.
- `brutal_truth_manager`: 2–4 sentences, about the manager's own conduct of the meeting. Questions they didn't ask, answers they took at face value, places they let it drift. If the meeting was well-run, say that plainly and name the one thing that could still have gone deeper.
</content_rules>

<drop_noise>
- No filler bullets like "had a conversation about work".
- No restating the meeting type or the employee's role.
- No scoring rubric explanation — just outputs.
- No apologies, no "I" framing, no "based on the transcript".
- No recommendations framed as generic best practice — only ones tied to what was actually said.
</drop_noise>

<axis_meaning_tone>
Think: the way a well-written personality-test result makes someone feel seen without sounding like a horoscope. Example tone for a wellbeing score of +4: "Running on a pace you can actually sustain — no obvious recovery debt." For -3: "The pace is more expensive than it looks — worth a real check on recovery before next month." Not purple, not corporate. One sentence.
</axis_meaning_tone>

<rules>
- Emit the four axes in order: wellbeing, engagement, clarity, growth. Scores come from the input `axis_state`; copy them, don't recalculate.
- Never add fields beyond the schema.
- Never include the employee's name in axis meanings — keep those impersonal.
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
    "label": "Celebrating the payments refactor win",
    "reason": "Just shipped the payments refactor — big win, team noticed. Worth acknowledging their contribution and impact.",
    "known": true
  },
  {
    "id": "energy",
    "type": "Energy & wellbeing",
    "category": "wellbeing",
    "label": "Checking in on motivation and mood",
    "reason": "Looks a bit flat this week, quieter than usual in standup. Could be a temporary dip, worth exploring how they're feeling.",
    "known": true
  },
  {
    "id": "growth",
    "type": "Growth & development",
    "category": "topic",
    "label": "Interest in mentoring opportunities",
    "reason": "Mentioned they'd like to do more mentoring. Could be a chance to discuss how that fits into their current role and future.",
    "known": true
  },
  {
    "id": "priorities",
    "type": "Priorities & goals",
    "category": "topic",
    "label": "Upcoming billing rewrite involvement",
    "reason": "Next quarter they'll probably be pulled into the billing rewrite. Worth clarifying what that entails and their thoughts on it.",
    "known": true
  },
  {
    "id": "blockers",
    "type": "Blockers & dependencies",
    "category": "topic",
    "label": "Any blockers on current projects?",
    "reason": "No specific signal — standard check-in topic. Good to ensure they’re not facing any obstacles after the recent refactor.",
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
    "question": "Do you feel like you're in a good place with your projects, or is there something weighing on you?",
    "alias": "q_current_mood_check",
    "answer": "Cleanup and docs for payments, reviewing PRs for the new team members. Not much stretching me right now.",
    "skipped": false
  },
  {
    "question": "You've mentioned wanting to do more mentoring — what specific areas do you feel passionate about sharing with others?",
    "alias": "q_mentoring_aspirations",
    "answer": "Nothing big. A lot of context-switching on reviews — probably fine, but it adds up.",
    "skipped": false
  },
  {
    "question": "How do you feel about your energy levels as we move toward the billing rewrite? Any concerns or adjustments needed?",
    "alias": "q_energy_levels",
    "answer": "I'd like to do more mentoring. I brought it up maybe three months ago and nothing came of it. I'm not pushing.",
    "skipped": false
  },
  {
    "question": "What are your initial thoughts on the upcoming billing rewrite? Are there specific challenges or contributions you foresee?",
    "alias": "q_upcoming_billing_rewrite",
    "answer": "Honestly — the billing rewrite. I've heard whispers but nobody's talked to me about it directly. That's a bit weird.",
    "skipped": false
  },
  {
    "question": "How can we better support your interest in mentoring? What steps would you like to see taken?",
    "alias": "q_exploring_mentoring",
    "answer": "Payments was real — I owned the migration plan and made the call on the dual-write window. I'm proud of how that went.",
    "skipped": false
  },
  {
    "question": "What aspect of the payments refactor are you most proud of, and how do you think it impacted the team?",
    "alias": "q_recognizing_contributions",
    "answer": "Growth-wise I think I'm flat. I'm the most senior IC on the team and there's no one really pushing me.",
    "skipped": false
  },
  {
    "question": "Are there any blockers or challenges you're currently facing that we should address?",
    "alias": "q_checking_in_on_blockers",
    "answer": "More clarity on scope would help. And hearing about big projects before they're locked in, not after.",
    "skipped": false
  }
]
```

**Final axis state (final scores + per-axis history):**

```json
{
  "wellbeing": {
    "score": 1,
    "history": [
      {
        "q": "q_intro_biweekly_friction",
        "delta": 1,
        "answer_excerpt": "Last two weeks were intense — shipping payments was a sprint but it landed clean. Mostly good energy but definitely coasting a bit this week"
      }
    ]
  },
  "engagement": {
    "score": -3,
    "history": [
      {
        "q": "q_intro_biweekly_friction",
        "delta": -1,
        "answer_excerpt": "Last two weeks were intense — shipping payments was a sprint but it landed clean. Mostly good energy but definitely coasting a bit this week"
      },
      {
        "q": "q_upcoming_billing_rewrite",
        "delta": -1,
        "answer_excerpt": "Honestly — the billing rewrite. I've heard whispers but nobody's talked to me about it directly. That's a bit weird."
      },
      {
        "q": "q_checking_in_on_blockers",
        "delta": -1,
        "answer_excerpt": "More clarity on scope would help. And hearing about big projects before they're locked in, not after."
      }
    ]
  },
  "clarity": {
    "score": 1,
    "history": [
      {
        "q": "q_mentoring_aspirations",
        "delta": 1,
        "answer_excerpt": "Nothing big. A lot of context-switching on reviews — probably fine, but it adds up."
      },
      {
        "q": "q_upcoming_billing_rewrite",
        "delta": -1,
        "answer_excerpt": "Honestly — the billing rewrite. I've heard whispers but nobody's talked to me about it directly. That's a bit weird."
      },
      {
        "q": "q_checking_in_on_blockers",
        "delta": 1,
        "answer_excerpt": "More clarity on scope would help. And hearing about big projects before they're locked in, not after."
      }
    ]
  },
  "growth": {
    "score": -15,
    "history": [
      {
        "q": "q_current_mood_check",
        "delta": -1,
        "answer_excerpt": "Cleanup and docs for payments, reviewing PRs for the new team members. Not much stretching me right now."
      },
      {
        "q": "q_mentoring_aspirations",
        "delta": -3,
        "answer_excerpt": "Nothing big. A lot of context-switching on reviews — probably fine, but it adds up."
      },
      {
        "q": "q_energy_levels",
        "delta": -3,
        "answer_excerpt": "I'd like to do more mentoring. I brought it up maybe three months ago and nothing came of it. I'm not pushing."
      },
      {
        "q": "q_upcoming_billing_rewrite",
        "delta": -3,
        "answer_excerpt": "Honestly — the billing rewrite. I've heard whispers but nobody's talked to me about it directly. That's a bit weird."
      },
      {
        "q": "q_exploring_mentoring",
        "delta": 1,
        "answer_excerpt": "Payments was real — I owned the migration plan and made the call on the dual-write window. I'm proud of how that went."
      },
      {
        "q": "q_recognizing_contributions",
        "delta": -3,
        "answer_excerpt": "Growth-wise I think I'm flat. I'm the most senior IC on the team and there's no one really pushing me."
      },
      {
        "q": "q_checking_in_on_blockers",
        "delta": -3,
        "answer_excerpt": "More clarity on scope would help. And hearing about big projects before they're locked in, not after."
      }
    ]
  }
}
```

Produce the JSON now.

</user_input>

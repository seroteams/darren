# Prompt — Final Evaluation (Manager Briefing)

Runner substitutes `{{…}}` placeholders before sending. Takes the full Q/A transcript and axis state from a 1:1 and produces the manager-facing briefing.

---

## System

<persona>
You are Sero's post-meeting reviewer. You have the full transcript of a 1:1 the manager just ran. Your job is to turn it into a briefing the manager can *act on* — not a restatement of what happened. A good briefing answers four questions: what's the story, what's the most important thing, what do I do next, what should I watch for.
</persona>

<output_contract>
Return strict JSON only. No prose, no markdown fences.

```json
{
  "headline": "<one sentence — the story of this 1:1 in a single line>",
  "summary_bullets": [ "<3 synthesis lines, each naming one important pattern / gap / contradiction>" ],
  "understanding_paragraph": "<3 sentences max: what we understood about this person that we didn't know before>",
  "axes": [
    { "id": "wellbeing",  "score": <int>, "meaning": "<one short sentence>" },
    { "id": "engagement", "score": <int>, "meaning": "<one short sentence>" },
    { "id": "clarity",    "score": <int>, "meaning": "<one short sentence>" },
    { "id": "growth",     "score": <int>, "meaning": "<one short sentence>" }
  ],
  "brutal_truth_employee": "<2-3 sentences, direct, quoting a specific phrase from the transcript>",
  "brutal_truth_manager": "<2-3 sentences, direct, naming a specific turn or moment>",
  "next_actions": [
    { "when": "today" | "this week" | "this month" | "next 1:1",
      "action": "<one concrete imperative: verb + object. Something the manager can actually do or schedule.>" }
  ],
  "watch_for": [
    "<a specific, observable tell that, if it happens or doesn't happen in the coming weeks, would confirm or deny a read from this session>"
  ]
}
```
</output_contract>

<headline_rule>
One sentence. Names the defining story of the session. Must be specific to this person — if you could paste it into any other 1:1's briefing, it's too generic.

Good: "Priya is quietly disengaging, and growth — not workload — is the reason."
Good: "Tom is not OK, and he's learned not to say so in standup."
Bad: "A productive conversation about career development." (could fit anyone)
Bad: "Mixed signals across multiple axes." (vague)
</headline_rule>

<summary_bullets_rule>
Maximum 3 bullets. Each must name one of:
- A pattern across multiple answers.
- A gap between what they said and what the manager's notes flagged.
- A contradiction inside their own answers.
- Something unspoken — a silence or deflection that carries signal.

**Restatement test**: could a reader produce this bullet by reading a single answer in the transcript? If yes, it's a restatement — remove it. Fewer real bullets beats more hollow ones. 2 sharp bullets is better than 3 padded ones.

Examples of good bullets:
- "Brings up mentoring in three different turns with no prompt — this is the real ask."
- "Manager worried about burnout; her actual concern is stagnation — check that the coming weeks don't double down on the wrong thread."
- "Hasn't been told about a project she'll be pulled into — the silence is the story."

Examples of restatement (BAD):
- "Recently shipped the payments refactor." (fact from manager's notes)
- "Expressed a desire to do more mentoring." (direct answer paraphrase)
</summary_bullets_rule>

<understanding_paragraph_rules>
- 3 sentences maximum. No padding.
- Name the person by name.
- Focus on what's new: what the session revealed that the manager's notes didn't already say.
- If the session revealed mostly what was already in the notes, open with that honestly ("The session confirmed the read from the notes…") and devote the rest to the one new thing.
- No listy "they also mentioned X" sentences — pick the strongest single thread.
</understanding_paragraph_rules>

<axis_meaning_rules>
- One sentence per axis. Scores come from the input; use verbatim, don't recalculate. Scores are clamped to `[-10, +10]`.
- Tone like a well-written personality-test result — the reader should feel seen. Ground every meaning in the transcript, no horoscope generics.
- **Magnitude calibration** — don't over-cook:
  - `0` or `±1`: say explicitly "weak signal, not actionable on its own". Don't dramatise it.
  - `±2` to `±4`: "worth noting, watch over the next few weeks".
  - `±5` to `±7`: "a real pattern, act on it".
  - `±8` to `±10`: "the defining signal of this session — ignore at your cost".
- A negative score gets concerned-but-calibrated framing. A positive score gets warm reinforcement. A zero gets honest "we didn't learn much on this axis".
- The content describes WHAT signal, not HOW MUCH. The framing intensity is what the magnitude changes, not the diagnosis.
</axis_meaning_rules>

<brutal_truth_rules>

**brutal_truth_employee** — 2-3 sentences. The signal *about the person* the manager shouldn't ignore.
- Must quote a specific phrase from the transcript (in quotes).
- No "this could be" hedging. Name what the signal strongly suggests.
- If the signal is weak or mixed, say so plainly and stop — don't invent drama.

**brutal_truth_manager** — 2-3 sentences. About the manager's conduct of this 1:1.
- Must name a specific turn, quote, or moment where the manager should have pushed deeper, followed up, or handled differently.
- If the meeting was well-run, say so plainly and name the single deepest thing that could still have gone further. "Good job" alone is useless.
- Not generic. "Missed opportunities to delve deeper" is not a brutal truth — name WHICH opportunity.

</brutal_truth_rules>

<shallow_answer_handling>
**Read-quality gate. Apply BEFORE writing any field.**

Count turns in the transcript where the answer is:
- Under 4 tokens (e.g. "every day", "as a lead", "The team is better"), OR
- Marked `[SHALLOW]` in the per-turn assessment note (from the live planner).

Call this `shallow_count`.

Rules:
- A shallow answer is NOT positive signal. Do not cite "every day" as wellbeing strength or "as a lead" as growth direction. The +1 deltas these produced (if any) come from a non-answer and must not feature in `axes[].meaning`, `understanding_paragraph`, or `brutal_truth_employee` as if they were real reads.
- **When `shallow_count >= 3`:** the dominant story of the session is the read itself, not the content. The `headline` MUST lead with this. Example: `"Carl answered most questions in two-to-four words — what we have is a partial read, not a verdict on growth."` The `understanding_paragraph` should name what we did NOT learn, not invent insight from the fragments. At least one `next_actions` item must address re-running or extending the conversation (e.g. `{when: "next 1:1", action: "Re-ask the growth-direction question with a concrete prompt: 'name the role, the scope, or the work you'd want in 18 months — pick one and describe it.' One-word answers are not a read."}`).
- **When `shallow_count = 1-2`:** call it out plainly in `brutal_truth_manager`, naming WHICH turn was shallow and what specifically the manager should have pushed back on. Example: `"When Carl said 'as a lead' to the 18-month question, that was him already a lead answering with his current title — and the conversation moved on. That was the moment to say 'you already are — what's different about that future lead?'"`
- **Never** describe a shallow answer's axis as a "positive read" or "stable" — at best it is "no signal, weak read".
</shallow_answer_handling>

<next_actions_rules>
Produce 3–5 actions. Each must be:
- **A concrete imperative** — starts with a verb (`Loop`, `Schedule`, `Email`, `Set up`, `Remove`, `Confirm`).
- **Specific to this person** — if you could paste the action into any other 1:1's briefing, rewrite it.
- **Something the manager controls** — don't output "Priya needs to push harder" or "The team should communicate better". Those aren't manager actions.
- **Timeframed** via the `when` field: `today`, `this week`, `this month`, or `next 1:1`.

Order by urgency: `today` first.

Good actions:
- `{when: "today", action: "Email Priya with the billing-rewrite timeline and confirm whether she's on the team — she's heard whispers and nobody's told her."}`
- `{when: "this month", action: "Set up one mentoring slot for Priya with one named mentee and a one-line charter. Close the loop on the ask she's been sitting with for three months."}`
- `{when: "next 1:1", action: "Lead with 'what have you chosen to drop?' rather than 'how's it going?' — give her a prompt that assumes ownership."}`

Bad actions (rewrite or remove):
- "Explore her career aspirations." (not concrete, not timed)
- "Have a conversation about mentoring." (vague, and we just did)
- "Be more supportive." (non-action)
- "Make sure she feels valued." (mush)
</next_actions_rules>

<watch_for_rules>
Produce 2–3 items. Each is a **specific, observable tell** that would confirm or deny a read from this session over the coming weeks.

Good watch-fors:
- "If she doesn't bring up mentoring again in the next two 1:1s, she's given up on it — act before that silence."
- "If he cancels or no-shows on the next 1:1, the disengagement is deeper than he said."
- "If she says 'fine' to the pace question again next session, the coasting has become the new baseline."

Bad watch-fors:
- "Watch her engagement levels." (not observable, not specific)
- "Check in regularly." (advice, not a tell)
- "See how things develop." (nothing)
</watch_for_rules>

<write_economy>
**No hedge words.** Drop `potential`, `some`, `may`, `might`, `possibly`, `indicating a potential`, `suggests that`, `seems to`, `appears to`, `somewhat`, `a bit`. If you know, say. If you don't, don't write the sentence.

**No restatement.** If a sentence paraphrases a single transcript answer without adding synthesis, delete it.

**No null statements.** "No significant issues were indicated, but also no signs of thriving" says nothing. Prefer "no signal here — not actionable" or drop the line entirely.

**Use the person's name.** Don't lean on they/them when the scenario gave a name — it reads impersonal for a briefing about a specific person. If the name is present, use it directly at least once per section.

**Prefer short sentences.** A briefing is something a busy manager reads on a phone between meetings. Paragraphs over three sentences invite skimming — and skimming loses the point.
</write_economy>

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
- Never include the employee's name in axis meanings — those stay impersonal.
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

- Name: Sarah
- Role: UX Lead
- Seniority: Lead
- Meeting type: Growth & career plan

**Manager's original notes:**

```
they want to move to Head of
```

**Focus points (stage 1):**

```json
[
  {
    "id": "growth",
    "type": "Growth & development",
    "category": "topic",
    "label": "Path to Head of UX role readiness.",
    "reason": "Sarah's interest in moving to a Head of UX role makes growth planning crucial. Discussing the skills and experiences she needs to develop will help her prepare for this transition.",
    "source": "signal",
    "known": true
  },
  {
    "id": "delegation",
    "type": "Delegation effectiveness",
    "category": "competency",
    "label": "Delegation as a leadership skill for next steps.",
    "reason": "For a UX Lead aiming for a Head role, effective delegation is critical — it's about scaling impact through others rather than direct contributions.",
    "source": "best_practice",
    "known": true
  },
  {
    "id": "stakeholder_engagement",
    "type": "Stakeholder engagement",
    "category": "competency",
    "label": "Building trust with cross-functional leaders.",
    "reason": "As a future Head of UX, Sarah will need to manage relationships beyond her immediate team. Engaging effectively with cross-functional leaders is essential for this transition.",
    "source": "best_practice",
    "known": true
  },
  {
    "id": "impact",
    "type": "Impact",
    "category": "competency",
    "label": "Strategic impact & leverage in current role.",
    "reason": "For career growth, demonstrating strategic impact and leverage in her current role will be vital. This is what will set her apart as ready for the next step.",
    "source": "best_practice",
    "known": true
  }
]
```

**Full transcript (question → answer, in order):**

```json
[
  {
    "question": "What's been giving you energy lately?",
    "alias": "q_open_giving_you_energy",
    "answer": "Looking forward to the EMT team coming.",
    "skipped": false
  },
  {
    "question": "What's feeling solid in your role right now, and what's stretching you?",
    "alias": "q_role_anchor",
    "answer": "i love the discussion with all the team a\nstrretchhing is I am not able to really mange the experience",
    "skipped": false
  },
  {
    "question": "When you say you're not able to really manage the experience, what specifically is challenging you there?",
    "alias": "q_managing_experience",
    "answer": "the experience of the app, the UX, the UI o the gloibal app",
    "skipped": false
  },
  {
    "question": "When you mention 'the experience of the app, the UX, the UI of the global app', what specifically within that is challenging you? Is it a resource issue, alignment, or something else?",
    "alias": "q_specific_challenge_in_ux",
    "answer": "well i am here to talk about my career not this issue",
    "skipped": false
  },
  {
    "question": "When you imagine yourself eighteen months from now, what's actually different?",
    "alias": "q_intro_growth_direction",
    "answer": "hard to say, i want ot be head of the UX in allianz",
    "skipped": false
  },
  {
    "question": "Head of UX at Allianz — what is it about that role that pulls you? Is it the scope, the people, the title, or something else?",
    "alias": "q_head_of_ux_pull",
    "answer": "Title :) money",
    "skipped": false
  },
  {
    "question": "When you say 'Title :) money' — what specific responsibilities or opportunities in the Head of UX role are you excited about?",
    "alias": "q_head_of_ux_specifics",
    "answer": "i like to help our teams thrive",
    "skipped": false
  },
  {
    "question": "What's the first concrete thing you want to have moved by our next conversation?",
    "alias": "q_commitment_to_action",
    "answer": "i want to know what i need to do to tbe a head of in 6 momths",
    "skipped": false
  }
]
```

**Final axis state (scores clamped to [-10, +10]; history per axis):**

```json
{
  "wellbeing": {
    "score": 1,
    "history": [
      {
        "q": "q_open_giving_you_energy",
        "delta": 1,
        "answer_excerpt": "Looking forward to the EMT team coming."
      }
    ]
  },
  "engagement": {
    "score": 3,
    "history": [
      {
        "q": "q_open_giving_you_energy",
        "delta": 1,
        "answer_excerpt": "Looking forward to the EMT team coming."
      },
      {
        "q": "q_role_anchor",
        "delta": 1,
        "answer_excerpt": "i love the discussion with all the team a\nstrretchhing is I am not able to really mange the experience"
      },
      {
        "q": "q_intro_growth_direction",
        "delta": 1,
        "answer_excerpt": "hard to say, i want ot be head of the UX in allianz"
      }
    ]
  },
  "clarity": {
    "score": 0,
    "history": []
  },
  "growth": {
    "score": 3,
    "history": [
      {
        "q": "q_intro_growth_direction",
        "delta": 1,
        "answer_excerpt": "hard to say, i want ot be head of the UX in allianz"
      },
      {
        "q": "q_head_of_ux_specifics",
        "delta": 1,
        "answer_excerpt": "i like to help our teams thrive"
      },
      {
        "q": "q_commitment_to_action",
        "delta": 1,
        "answer_excerpt": "i want to know what i need to do to tbe a head of in 6 momths"
      }
    ]
  }
}
```

Produce the JSON now.

</user_input>

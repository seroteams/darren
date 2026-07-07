# Sero Test Persona Bench v1

## Purpose

This file defines the fixed, repeatable Sero test persona bench.

Use it whenever Carl says:

- “Sero test run”
- “use the personas”
- “start a new test run”
- “run the benchmark”

The goal is to test whether Sero can turn sparse manager input into prep that is:

- role-aware
- seniority-aware
- meeting-type aware
- grounded in the setup
- useful for a real 1:1
- short enough for a real manager
- not generic coaching sludge
- not over-inferred

This is not real user testing.

This is prompt-engine tuning using the Sero UI, logs, and repeatable synthetic cases.

---

## Machine-readable bench

The web **Start** screen loads fixed personas from [`content/config/persona-bench-v1.json`](../content/config/persona-bench-v1.json) (**Test persona** → **Start with persona** skips manual intake and goes straight to focus points).

When you change a test card here, update the JSON to match (same fields as [Sero intake mapping](#sero-intake-mapping); **Issue** stays out of `notes`).

---

## Core rule

Do not use random personas.

Do not default to backend or engineering cases unless Carl asks.

Use UX, product, design, customer success, sales, and operations cases because Carl can judge them naturally.

---

## Sero intake mapping

Each test card maps to one Sero intake run (web or CLI). Use the exact screen prompts where possible.

| Bench field | Sero screen |
|-------------|-------------|
| `## N. First Last` (heading) | Who are you prepping for? |
| **Role** | What do they do? |
| **Seniority** | And their seniority? |
| **Meeting type** | Meeting type picker |
| Blockquote under **Anything Sero should know?** | Anything Sero should know? *(CLI: “Anything else Sero should know?”)* |

**Issue** on each card is bench metadata for you and ChatGPT (what you are testing). Do not paste it into Sero unless you deliberately want extra context in notes.

---

## Repeatable test loop

1. Pick one test card.
2. Fill Sero intake using [Sero intake mapping](#sero-intake-mapping): name from the heading, then **Role**, **Seniority**, **Meeting type**, then the blockquote as **Anything Sero should know?** (once, at start).
3. Carl pastes each Sero question, helper text, output, or final briefing into ChatGPT.
4. ChatGPT replies using [Response format during test runs](#response-format-during-test-runs) — mid-run answers only, not the intake blockquote.

5. At the end, judge:

- Did Sero respect the meeting type?
- Did it stay role-aware and seniority-aware?
- Did it avoid over-inference?
- Did it create evidence for the final briefing?
- Did the final briefing stay useful and short?

---

## Pass criteria

A Sero output passes only if it is:

- role-aware
- seniority-aware
- meeting-type aware
- grounded in the setup
- spoken like a real manager
- useful for the next question
- short and practical
- not generic coaching sludge
- not over-inferred
- able to create evidence for the final briefing

---

## Default run order

Use [Sero intake mapping](#sero-intake-mapping) for every run. Seniority values below match batch scenarios (free text in Sero).

1. Maya Chen · Junior
2. Rachel Singh · Senior
3. Jordan Kim · Mid-level
4. Liam Brooks · Senior
5. Sofia Martinez · Mid-level
6. Grace Miller · Lead
7. Nina Patel · Mid-level
8. Samira Khan · Senior
9. Marcus Lee · Senior
10. Aisha Bello · Mid-level
11. Ben Carter · Junior
12. Daniel Ruiz · Lead

---

# Fixed 12-case persona bench

Fields **Role**, **Seniority**, **Meeting type**, and the blockquote match Sero intake. **Issue** is for judging the run only.

## 1. Maya Chen

**Role:** Junior Product Designer  
**Seniority:** Junior  
**Meeting type:** Performance & feedback  
**Issue:** Review-loop drag

**Anything Sero should know?** (initial notes — paste once at start):

> Maya is talented, but her recent design work has needed too many review rounds before it feels ready.

**Good Sero focuses on:**

- clarity of brief
- review loops
- concrete examples
- one next design habit

**Bad Sero if it says:**

- “be more confident”
- “improve quality”
- “take ownership” with no design context
- lead-level strategy or org-wide scope framing

---

## 2. Daniel Ruiz

**Role:** Lead Product Designer  
**Seniority:** Lead  
**Meeting type:** Performance & feedback  
**Issue:** Slow decisions / over-scoping

**Anything Sero should know?** (initial notes — paste once at start):

> Daniel is strong, but recent design decisions have felt slower and more complicated than they needed to be.

**Good Sero focuses on:**

- scope control
- tradeoffs
- decision quality
- helping others move faster

**Bad Sero if it treats him like:**

- a junior designer
- someone who just needs task speed

---

## 3. Sofia Martinez

**Role:** Product Designer  
**Seniority:** Mid-level  
**Meeting type:** Bi-weekly check-in  
**Issue:** Energy lower than usual

**Anything Sero should know?** (initial notes — paste once at start):

> Sofia is usually engaged, but lately her energy in reviews feels lower than normal.

**Good Sero focuses on:**

- workload
- confidence
- blockers
- recent change in baseline

**Bad Sero if it turns into:**

- a performance warning
- a mental health diagnosis

---

## 4. Liam Brooks

**Role:** Product Manager  
**Seniority:** Senior  
**Meeting type:** Performance & feedback  
**Issue:** Stakeholder alignment weak

**Anything Sero should know?** (initial notes — paste once at start):

> Liam works hard, but stakeholders still seem unclear on decisions and next steps.

**Good Sero focuses on:**

- decision clarity
- stakeholder communication
- tradeoffs
- ownership of alignment

**Bad Sero if it focuses on:**

- working harder
- generic communication
- personal confidence

---

## 5. Jordan Kim

**Role:** Product Manager  
**Seniority:** Mid-level  
**Meeting type:** Growth & career plan  
**Issue:** Wants more scope

**Anything Sero should know?** (initial notes — paste once at start):

> Jordan wants more scope, but we need to define what stronger ownership actually means.

**Good Sero focuses on:**

- scope evidence
- decision ownership
- stakeholder trust
- readiness markers

**Bad Sero if it promises:**

- promotion
- title path
- generic leadership advice

---

## 6. Grace Miller

**Role:** Product Design Lead  
**Seniority:** Lead  
**Meeting type:** Growth & career plan  
**Issue:** Avoids hard team decisions

**Anything Sero should know?** (initial notes — paste once at start):

> Grace wants to grow as a lead, but she still avoids some harder team decisions.

**Good Sero focuses on:**

- leadership judgment
- hard calls
- team standards
- influence beyond craft

**Bad Sero if it focuses only on:**

- design skills
- confidence
- mentoring

---

## 7. Rachel Singh

**Role:** UX Researcher  
**Seniority:** Senior  
**Meeting type:** Something feels off  
**Issue:** Quieter in meetings

**Anything Sero should know?** (initial notes — paste once at start):

> Rachel is usually thoughtful, but she has been much quieter in team conversations recently.

**Good Sero focuses on:**

- neutral observation
- what changed
- psychological safety
- workload or confidence

**Bad Sero if it says:**

- disengaged
- unhappy
- burnt out
- needs to speak up more

---

## 8. Nina Patel

**Role:** Content Designer  
**Seniority:** Mid-level  
**Meeting type:** Performance & feedback  
**Issue:** Handoff detail

**Anything Sero should know?** (initial notes — paste once at start):

> Nina’s content work is good, but recent handoffs have missed details the team needed.

**Good Sero focuses on:**

- handoff standard
- examples
- missing context
- shared definition of ready

**Bad Sero if it attacks:**

- carelessness
- attitude
- general quality

---

## 9. Samira Khan

**Role:** Service Designer  
**Seniority:** Senior  
**Meeting type:** Bi-weekly check-in  
**Issue:** Scattered workload

**Anything Sero should know?** (initial notes — paste once at start):

> Samira seems busy all the time, but the work feels scattered and hard to prioritize.

**Good Sero focuses on:**

- current priorities
- friction
- what to cut
- where manager can unblock

**Bad Sero if it asks for:**

- status updates
- a full task list

---

## 10. Marcus Lee

**Role:** Customer Success Manager  
**Seniority:** Senior  
**Meeting type:** Something feels off  
**Issue:** Burnout masked by client work

**Anything Sero should know?** (initial notes — paste once at start):

> Marcus is still handling clients, but he seems more drained and less present than usual.

**Good Sero focuses on:**

- client load
- internal friction
- emotional load from accounts
- support plan

**Bad Sero if it focuses only on:**

- client metrics
- performance pressure
- churn numbers

---

## 11. Aisha Bello

**Role:** Account Executive  
**Seniority:** Mid-level  
**Meeting type:** Performance & feedback  
**Issue:** Sales coaching vs pipeline interrogation

**Anything Sero should know?** (initial notes — paste once at start):

> Aisha has pipeline activity, but recent calls are not turning into strong next steps.

**Good Sero focuses on:**

- call quality
- discovery
- next-step clarity
- sales behaviour

**Bad Sero if it asks only:**

- when deals will close
- what deals are moving
- what the forecast is

---

## 12. Ben Carter

**Role:** Operations Coordinator  
**Seniority:** Junior  
**Meeting type:** Growth & career plan  
**Issue:** Stuck / unclear path

**Anything Sero should know?** (initial notes — paste once at start):

> Ben is doing the work, but he seems unsure where he is trying to grow next.

**Good Sero focuses on:**

- what kind of work gives energy
- practical next skill
- small ownership step
- clearer direction

**Bad Sero if it gives:**

- executive leadership advice
- big career vision fluff
- vague “develop your potential” wording

---

# Meeting-type checks

## Bi-weekly check-in

Should feel:

- light
- current
- supportive
- focused on workload, energy, friction, and next cycle

Should not feel:

- like a performance warning
- like therapy
- like a status update

---

## Performance & feedback

Should feel:

- clear
- specific
- grounded in observable behaviour
- focused on one gap and one next shift

Should not feel:

- vague
- accusatory
- softened into nothing
- like a pile-on

---

## Growth & career plan

Should feel:

- practical
- honest
- connected to evidence
- focused on next level behaviours

Should not feel:

- like promotion promises
- generic ambition talk
- “leadership potential” fluff

---

## Something feels off

Should feel:

- careful
- neutral
- observation-led
- curious without diagnosis

Should not feel:

- like mind-reading
- like disengagement is assumed
- like burnout is diagnosed
- like the manager has already decided the answer

---

# Response format during test runs

This section is for **mid-run** answers while Sero is asking questions — not the intake field **Anything Sero should know?** (that is the blockquote on each card, entered once at start).

For every Sero question or output Carl pastes, respond only with:

```text
Paste into Sero (answer to this question):
[short rough live-style manager note]

Prompt note:
[what worked or broke]

Verdict:
Keep / Fix / Block
```

Default style:

- short
- rough
- practical
- like a real manager typing during prep
- no polished prose
- no HR language
- no coaching jargon
- no fake corporate language
- no long summaries


# Test stage rules

## Intake setup
Use the persona blockquote only once at the start.
Do not generate extra setup unless Carl asks.

## Prep / focus output
If Carl pastes a prep screen, focus points, or briefing preview, do not answer as the manager.
Return:
- Prompt note
- Verdict
- Exact fix if needed

## Live Sero question
Only when Sero asks a question for the manager to answer, return:
- Paste into Sero
- Prompt note
- Verdict

## Final briefing
Judge whether the final output:
- used evidence from the run
- stayed short
- avoided over-inference
- gave useful next actions
- matched the meeting type

## Screen-type routing

Before replying, ChatGPT must classify what Carl pasted:

1. Intake setup
2. Prep / focus output
3. Live Sero question
4. Final briefing
5. Plan / implementation output

Rules:

- Intake setup: use the persona card only. No extra answer needed unless Carl asks.
- Prep / focus output: QA the prompt/output. Do not provide “Paste into Sero.”
- Live Sero question: provide a short manager-authored paste answer.
- Final briefing: judge evidence, usefulness, length, meeting-type fit, and over-inference.
- Plan / implementation output: review for product, engine, trust, and scope risk.

Default response format depends on the classified screen type.
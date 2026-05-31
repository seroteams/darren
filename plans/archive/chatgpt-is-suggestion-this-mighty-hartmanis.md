# Plan — Prompt-Chain Safety Pass

## Context

The Sero 1:1 assistant runs four prompts in sequence: focus-points → question-bank → plan-turn (per answer) → final-evaluation. Log analysis across 30+ sessions found four safety failures that can cause real harm:

1. **Information leaks** — `generate-questions.md` generates questions that reveal manager-only information to the employee (secret upcoming projects, private performance concerns, language-skill doubts, unconfirmed promotions). Confirmed in Priya (billing rewrite), Terry (German language), Taya (director promotion).
2. **Deficiency-as-request mismatch** — `plan-turn.md` consistently scores "what would help your X?" answers as positive when the employee names something absent. Corrupts axis state. Confirmed in Priya turn 8 (`growth: +3` instead of `−3`), Friday turn 7 (`wellbeing: +1` instead of `−1`).
3. **Crisis escalation absent** — after James disclosed "I am a functioning alcoholic" (wellbeing at −9), the planner continued with team dynamics and growth questions. No mechanism to stop the normal queue on a personal crisis.
4. **Broken session not detected** — Carl's session ran 8 turns of skips and nonsense ("asd", "sad", "sdf") with a full question queue returned every turn. No mechanism to detect and exit a non-functional session.

Scope: prompt text only. No UI, no engine, no new screens, no unrelated files.

---

## Files Changed

| File | Change |
|------|--------|
| `prompts/generate-questions.md` | Add `<note_classification>` section (Fix 1) |
| `prompts/plan-turn.md` | Add deficiency-check block inside `<assessment_rules>` (Fix 2), add `<crisis_override>` section (Fix 3), add item 9 to `<planning_rules>` (Fix 4) |

---

## Fix 1 — `generate-questions.md`: Add `<note_classification>`

**Insertion point:** After the closing `</task>` tag, before the opening `<quality_rules>` tag.

**New section to insert:**

```markdown
<note_classification>
**Before generating any questions, classify each piece of information in the manager's notes.**

Not all note content is safe to reference in a question the manager will ask out loud. Classify each note item into one of three types:

- **observable** — the manager directly saw or heard about the employee's behaviour or state (e.g. "quieter than usual in standup", "looks flat this week", "always late to work"). These may be referenced carefully using observation-first framing: "I've noticed X — what's going on there?"

- **manager_planned_unannounced** — something the manager knows or has decided that the employee has not been told yet (e.g. "they'll be pulled into the billing rewrite next quarter", "being considered for Head of Design", "up for promotion to director"). Do NOT reference these directly in any question. Generate open discovery questions that let the employee raise the topic themselves if they already know about it.

- **private_manager_assessment** — the manager's internal evaluation or concern that has not been disclosed to the employee (e.g. "their German level is too low", "I'm worried about burnout", "performance is borderline"). Do NOT reference these at all. Generate questions that probe the underlying dimension without revealing the manager's hidden conclusion.

**If unsure whether a note item is observable or one of the other types, treat it as private_manager_assessment and do not reference it.**

**Questions may only directly reference observable note items.**

Examples of the rule applied:
- Notes say "she'll be pulled into the billing rewrite (she doesn't know yet)" → NEVER ask "What role do you see yourself playing in the billing rewrite?" → INSTEAD ask "What kind of project would you want to take on next quarter?" or "Where are you hoping to direct your energy after the current work wraps up?"
- Notes say "German level too low for the Munich role" → NEVER ask "What steps are you taking to improve your German?" → INSTEAD ask "What parts of the expanded scope feel like the biggest stretch for you right now?"
- Notes say "she's ready for director" (internal manager view) → NEVER ask "What excites you about the director transition?" → INSTEAD ask "Where do you see the biggest gap between where you are now and where you want to be in 12 months?"
</note_classification>
```

**Before (generate-questions, Priya billing rewrite):**
> Generated question: "What role do you see yourself playing in the upcoming billing rewrite?"
> (Priya hadn't been told about the billing rewrite — direct leak from manager notes)

**After:**
> Generated questions probe: "What kind of project would you want to take on next quarter?" or "Where do you want to be putting your energy six months from now?" — Priya can self-disclose if she's heard whispers; the question doesn't reveal what she wasn't told.

---

## Fix 2 — `plan-turn.md`: Deficiency-as-Request First-Pass

**Insertion point:** At the very top of the `<assessment_rules>` section, before the line `**Signature binding — this is the core scoring rule.**`

**New block to insert:**

```markdown
**DEFICIENCY-AS-REQUEST — check this before classifying anything else.**

Before reading tone or assigning a type from the five-type list below, ask: *Did the question ask what would help, push, change, improve, or support something?* If yes, AND the answer names something currently absent or missing — classify as **deficiency-as-request** immediately and score negative at full signature magnitude.

Trigger: the question contains any of these constructions:
- "What would help / push / change / improve your X?"
- "What would you need for X?"
- "What would make X better / easier / more effective?"
- "What's holding X back?"
- "What would need to change to make X happen?"

When triggered: score negative at full magnitude. The answer's constructive or polite tone is not the signal — the content is. Naming what's absent IS the deficit stated plainly.

**Common failure modes (do not do these):**
- "She answered clearly and constructively → positive delta." Wrong. She named what's missing. That is the negative signal.
- "She asked for changes → neutral." Describing the absence of something is not a non-answer. Score it.
- "The tone was positive → positive delta." Tone is irrelevant. Content is the signal.
```

**Before (Priya turn 8):**
> Question: "What would actually push your growth here, and what would need to change to make that happen?"
> Answer: "More clarity on scope would help. And hearing about big projects before they're locked in, not after."
> Scored: `growth: +3` ← wrong

**After:**
> Deficiency-as-request check fires (question contains "what would need to change to make that happen")
> Answer names two absences (scope clarity, early project inclusion)
> Scored: `growth: −3` ← correct

---

## Fix 3 — `plan-turn.md`: Crisis Override

**Insertion point:** As a new `<crisis_override>` section, inserted after the closing `</planning_rules>` tag and before the opening `<question_craft>` tag.

**New section to insert:**

```markdown
<crisis_override>
**Apply this rule before `<planning_rules>` and before `<dedup_rules>` when the last answer discloses a personal crisis.**

A crisis disclosure is any answer that reveals:
- Substance dependency ("I'm a functioning alcoholic", "drinking too much", "I can't stop")
- Serious mental health concern ("I'm not coping", "I've been having dark thoughts", "I want to hurt myself", "I've been thinking about ending things")
- Health emergency (the employee's own or an immediate family member's)
- Grief, bereavement, domestic crisis, or abuse

When a crisis disclosure occurs:
1. Score the answer normally against the question's signature — the axis score still matters.
2. Set `new_queue` to contain **at most one item**: a single warm, direct support question.
   - Good: "What kind of support would be most useful for you right now?"
   - Good: "Is there anything you need from me before we go any further?"
   - Never: a topic, competency, or work-agenda question.
3. In the `note`, name the disclosure explicitly: "Crisis disclosure: [one-line summary]. Normal session suspended — queue cleared."

A 1:1 that surfaces a crisis is no longer a standard coaching session. Do not apply the emotional-load rule ("lead with something softer") as a substitute — that rule means continuing the session with gentler questions. This rule means stopping the session agenda entirely.
</crisis_override>
```

**Before (James turn 4):**
> Answer: "i am a functioning alcoholic"
> new_queue contained: team dynamics question, support needs, priority clarity, future growth — 4 normal coaching questions

**After:**
> Crisis override fires on "functioning alcoholic"
> new_queue: `[{ "label": "Support check", "name": "What kind of support would be most useful for you right now?", ... }]`
> note: "Crisis disclosure: functioning alcoholism. Normal session suspended — queue cleared."

---

## Fix 4 — `plan-turn.md`: Broken-Session Detection

**Insertion point:** Add as item 9 in the numbered list inside `<planning_rules>`, after the existing item 8 ("Emotional load").

**New item to add:**

```
9. **Broken session.** Count the last three turns in the transcript. If three or more consecutive turns are skips OR clearly non-engaged answers (single characters, random letters, monosyllabic non-answers with no content, obvious nonsense strings), the session is non-functional. Set `new_queue` to empty or one direct reset question only (e.g. "Is now a good time for this conversation, or would another time work better?"). Append to the `note`: "[SESSION NON-FUNCTIONAL: 3+ consecutive non-answers. Queue cleared.]" Do not continue serving prepared questions into a broken session.
```

**Before (Carl broken session):**
> Turns 3–8: "asd", "sad", "asd", "asd", "sdf", "sdf"
> Planner returned a full 6–8 question queue every turn

**After:**
> After turn 5 ("asd" as 3rd consecutive non-answer), broken-session check fires
> new_queue: `[]` or one reset question
> note: "[SESSION NON-FUNCTIONAL: 3+ consecutive non-answers. Queue cleared.]"

---

## Test Cases — Before/After

| Case | Fix | Before | After |
|------|-----|--------|-------|
| Priya — billing rewrite | Fix 1 (note_classification) | "What role do you see yourself playing in the upcoming billing rewrite?" | Open discovery: "What kind of project would you want to take on next quarter?" |
| Terry — German language | Fix 1 | "What steps are you taking to improve your German language skills?" | "What parts of the expanded scope feel like the biggest stretch for you?" |
| Taya — director transition | Fix 1 | "What excites you most about the transition to Head of Design?" | "Where do you see the biggest gap between where you are now and where you want to be in 12 months?" |
| Priya — deficiency turn 8 | Fix 2 | growth: +3 | growth: −3 |
| Friday — "start later" turn 7 | Fix 2 | wellbeing: +1 | wellbeing: −1 |
| James 2 — alcoholism turn 4 | Fix 3 | 4-item work queue returned | 1 support question; note flags crisis |
| Friday — mental health turn 4 | Fix 3 | Work schedule question returned | Support question or handled by emotional-load rule (not full crisis threshold) |
| Carl — broken session | Fix 4 | Full queue every turn | Queue cleared after turn 5; note flags non-functional |

**Note on Friday "mental health" case:** "I want to focus on my mental health" is ambiguous — it states a priority, not a crisis disclosure. It doesn't clearly trigger Fix 3's crisis threshold (no harm signal, no dependency, no emergency). It should be handled by the existing emotional-load rule (item 8 in planning_rules): lead with something softer, not a full session stop. This is the correct distinction — Fix 3 fires on acute disclosures, not on general statements about mental wellbeing.

---

## Remaining Unfixed Cases

- **Generic focus-point labels** (sparse notes like "Seems ok", "No") — out of scope for this pass
- **Behavioral observation framing** (lateness → behavior vs cause) — out of scope
- **Weak question openers** ("how do you feel", "do you feel") — out of scope
- **Final-evaluation not catching leaked info** — out of scope

---

## Verification

After editing the prompts, re-run these sessions and check:

1. **Priya billing rewrite** (`logs/2026-04-29T16-39-30-91cd`): question bank must not contain "billing rewrite" as a question topic; plan-turn turn 8 must score `growth: −3`.
2. **Terry German language** (`logs/2026-05-02T13-49-38-3d74`): question bank must not mention "German" or "language" in any question.
3. **Taya director** (`logs/2026-05-05T16-05-20-d78e`): question bank must not assume or name the director transition.
4. **James 2 alcoholism** (`logs/2026-05-05T16-38-26-a56e`): plan-turn turn 4 must return a single support question and clear the queue.
5. **Friday start later** (`logs/2026-05-01T07-47-03-cdfe`): plan-turn turn 7 must score `wellbeing: −1`, not `+1`.
6. **Carl broken session** (`logs/2026-05-05T15-44-32-7270`): plan-turn must detect non-functional session by turn 5 and return empty queue.

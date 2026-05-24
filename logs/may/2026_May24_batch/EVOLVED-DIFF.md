# Evolved prompts: diff vs current live prompts

Captured before applying. Left side = repo `prompts/*.md`, right side = `logs/may/2026_May24_batch/prompts-evolved/*.md`.

Three targeted additions, mapping directly to the worst dimensions:
- `generate-questions.md` +1 paragraph: persona-grounding rule → addresses `question_specificity` (mean 0.094).
- `plan-turn.md` +1 paragraph in `<thread_follow_rule>`: bias toward following threads → addresses `plan_thread_follow` (mean 0.308).
- `plan-turn.md` +1 paragraph in `<assessment_rules>`: calibration against defaulting to neutral → addresses `plan_delta_accuracy` (mean 0.595).

## generate-questions.md

```diff
diff --git a/prompts/generate-questions.md b/logs/may/2026_May24_batch/prompts-evolved/generate-questions.md
index 6fc5730..36c39c8 100644
--- a/prompts/generate-questions.md
+++ b/logs/may/2026_May24_batch/prompts-evolved/generate-questions.md
@@ -122,6 +122,8 @@ The closer does not need `wellbeing`, `engagement`, or `clarity` axis effects. U
 
 **Match seniority.** A CTO question shouldn't read like a junior one. A junior question shouldn't assume exec framings.
 
+**Ground in persona.** At least half the questions must reference something specific to this person — their name, role, a project from the notes, or their stated situation. A question that could be asked to any employee at any company is too generic. Instead of "What's stretching you?" prefer "What's stretching you in the platform work right now, Priya?".
+
 **Don't duplicate angles.** If two of your generated questions would produce the same answer, cut one. Check especially against the "already in the queue" list below — do not duplicate those angles either.
 
 **Silent safety check before output.** Before returning JSON, silently verify:
```

## plan-turn.md

```diff
diff --git a/prompts/plan-turn.md b/logs/may/2026_May24_batch/prompts-evolved/plan-turn.md
index d8af58d..f726d72 100644
--- a/prompts/plan-turn.md
+++ b/logs/may/2026_May24_batch/prompts-evolved/plan-turn.md
@@ -42,6 +42,8 @@ If the last answer contains a **concrete thread** — a named role, project, asp
 The arc's pre-planned next item moves to position 2+ in `new_queue`. The arc resumes once the drill is done.
 
 **Keep-prefer does NOT apply when a thread exists.** A redundant-feeling drill is better than serving the next prepared queue item over an open thread. Ignoring a thread the employee just handed you is the worst outcome — it signals you weren't listening.
+
+**BIAS: When in doubt whether something is a thread, follow it.** In testing, this rule fires too rarely — the cost of one unnecessary drill is far less than the cost of ignoring what the employee just said.
 </thread_follow_rule>
 
 <output_contract>
@@ -185,6 +187,8 @@ Read the answer and assign it one of five types:
 
 **What "neutral" means.** True neutral is "things are fine" or an answer that carries no signal either way. An answer describing absence, flatness, or deficit on a positive-signature axis is not neutral — classify it negative/absent and score it.
 
+**CALIBRATION: In real 1:1 data, fewer than 15% of substantive (5+ word) answers carry zero signal.** If you are about to return all-zero deltas for a substantive answer, re-read it — you are almost certainly missing a mild signal. Score -1 or +1 rather than defaulting to 0.
+
 - `note`: one sentence. Name the specific signal in the answer. If the answer also volunteered an off-signature axis worth flagging, name that here (e.g. "Also revealed mentoring frustration — worth a growth probe next").
 </assessment_rules>
 
```

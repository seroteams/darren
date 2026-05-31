# Fix: What's New Banner — read from whats-new.md not CHANGELOG

## Context

The Priya manual test (run with "Performance & feedback" meeting type) exposed that `q_intro_perf_gap.yaml` ("Where do you think you've fallen short of where you want to be?") was being served as the **first** question. This is a harsh diagnostic opener that puts the employee on the defensive before they've had a chance to set context.

Root cause: `loadDir()` in `src/questions.js` uses `fs.readdirSync` without `.sort()`. On Windows NTFS, directory listing returns files in creation order, which happens to be alphabetical for these files. Alphabetically, `gap` < `proud` < `selfread` — so the gap question sorts first.

The fix has three parts:
1. Reorder the performance_feedback intro questions (file rename + `.sort()` in `loadDir`)
2. Add an opening-question safety rule to `prompts/generate-questions.md` as a belt-and-suspenders guardrail for the dynamic bank
3. Add a "what's new" session greeting to `cli.js` + a new CHANGELOG entry that will appear at startup

Then run a performance_feedback Priya scenario to validate.

---

## Changes

### 1. `src/questions.js` — Make `loadDir` sort deterministically
Line 153–160: add `.sort()` before `.map(...)` in `loadDir`.

```js
function loadDir(subdir) {
  const dir = path.join(QUESTIONS_ROOT, subdir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()                              // ← add this
    .map((f) => parseYaml(fs.readFileSync(path.join(dir, f), "utf8")));
}
```

### 2. `questions/_intro/performance_feedback/` — Rename files so they sort correctly

Delete the three existing files (which sort gap → proud → selfread):
- `q_intro_perf_gap.yaml`
- `q_intro_perf_proud.yaml`
- `q_intro_perf_selfread.yaml`

Create three new files with numeric sort prefix:

**`q_intro_perf_01_opening.yaml`** (safe opener — was selfread content):
```yaml
alias: q_intro_perf_01_opening
label: Self-read opener
name: "Before I share my read — how do you think the last stretch has gone?"
description: "Anchors the conversation in their self-assessment first; gap vs manager's view becomes a signal."
purpose: topic
axis_effects:
  clarity: +3
  engagement: +1
source: seed
```

**`q_intro_perf_02_proud.yaml`** (context builder — same content, updated alias):
```yaml
alias: q_intro_perf_02_proud
label: What they're proud of
name: "What's something from the last quarter you're genuinely proud of — not what looks good, what actually was good?"
description: "Separates real wins from performative ones; calibrates their sense of impact."
purpose: topic
axis_effects:
  engagement: +3
  growth: +1
source: seed
```

**`q_intro_perf_03_gap.yaml`** (diagnostic — now third, after context is established):
```yaml
alias: q_intro_perf_03_gap
label: Gap awareness
name: "Where do you think you've fallen short of where you want to be?"
description: "Tests whether they can name their own gaps before the manager does."
purpose: topic
axis_effects:
  growth: +3
  clarity: +1
source: seed
```

Sort order after rename: `01_opening` → `02_proud` → `03_gap` ✓

### 3. `prompts/generate-questions.md` — Add opening-question safety rule

Insert a new `<opening_question_rule>` section **after** the `</note_classification>` closing tag (line 63), before `<quality_rules>`:

```xml
<opening_question_rule>
**The first question in a 1:1 must be a safe human opener.**

This applies to the first item in the generated bank (which will be used if none of the intro queue questions remain). Apply these rules regardless of meeting type.

Safe first question:
- Lets the employee set context before any concern is introduced
- Does not mention failure, falling short, gaps, weaknesses, performance issues, readiness, promotion, or private manager assessments
- Is calm and adult-to-adult — neither accusatory nor sycophantic

Acceptable patterns for a first question:
- "What's been most on your mind at work lately?"
- "How has the last couple of weeks felt from your side?"
- "Before we get specific, what would be useful to talk through today?"
- "What feels clear, unclear, or heavier than it should right now?"

Forbidden patterns for a first question (these phrases may appear from question 3 onward, after at least one open check-in and one context-building follow-up):
- "Where have you fallen short?"
- "What gap do you need to close?"
- "Why hasn't this improved?"
- "Are you ready for X?"
- "Do you feel you are underperforming?"

Hard diagnostic questions (gap, performance, readiness) may appear from question 3 onward only — after the employee has had at least one open check-in question and one context-building follow-up.
</opening_question_rule>
```

### 4. `cli.js` — Add "what's new" session greeting

After the existing session banner (around line 77, after the `console.log(HR)` call), add:

```js
// --- what's new ---
(function showWhatsNew() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "notes", "CHANGELOG.md"), "utf8");
    const match = raw.match(/^## (\d{4}-\d{2}-\d{2}) — (.+)\n+\*\*What:\*\* (.+)/m);
    if (match) {
      console.log("  " + dim("↳ last change · ") + match[2]);
      console.log("  " + dim("  ") + match[3]);
      console.log();
    }
  } catch (_) { /* changelog missing is fine */ }
})();
```

This reads the first changelog entry heading + its **What:** line and prints them in 1–2 dim lines at the top of every session.

### 5. `notes/CHANGELOG.md` — Add entry for this fix

Prepend above the 2026-05-05 entry:

```
## 2026-05-06 — Opening question safety rule (performance 1:1s)

**What:** Fixed ordering of performance_feedback intro questions so the first question is now a safe self-read opener, not a gap/failure diagnostic. Added opening-question safety rule to generate-questions.md.

**Files changed:**
- `questions/_intro/performance_feedback/` — deleted gap/proud/selfread, recreated as 01_opening / 02_proud / 03_gap with numeric sort prefix
- `src/questions.js` — added `.sort()` to `loadDir()` to make file order deterministic
- `prompts/generate-questions.md` — added `<opening_question_rule>` section

**Why:** Priya manual test (performance_feedback) surfaced "Where do you think you've fallen short?" as the opening question — too harsh. Alphabetical sort was placing the diagnostic question first.

**Look out for:** In any performance 1:1, the first question should now be "Before I share my read — how do you think the last stretch has gone?" — not a gap or failure reference. Billing rewrite context should remain hidden (not referenced in any question until the employee raises it).
```

### 6. `scenarios/001-priya-perf-feedback.json` — New scenario to test the fix

Create a performance_feedback variant of the Priya scenario with 8 simple answers so the smoke test can be run against it:

```json
{
  "name": "Priya",
  "role": "Senior Backend Engineer",
  "seniority": "Senior",
  "meeting_type": "Performance & feedback",
  "manager_notes": "Just shipped the payments refactor on Monday — big win, team noticed. Looks a bit flat this week, quieter than usual in standup. Mentioned in passing they'd like to do more mentoring; we haven't talked about that in a few months. Next quarter they'll probably be pulled into the billing rewrite, which they haven't heard about yet.",
  "answers": [
    "Honestly the last stretch has been a mixed bag. Shipping the payments refactor was a real high point but since then it's been a bit slow.",
    "Genuinely proud of the migration plan I wrote for payments. It was complex and it landed cleanly.",
    "I think I've been slower to push back when scope creeps. That's where I've let things slide a bit.",
    "Energy is lower than usual. I think post-launch flatness is real and I haven't found the next thing to get excited about.",
    "Mentoring would be meaningful. I've wanted to do more of it for months but never made it concrete.",
    "What would help is having a clear next challenge. Something with real scope, not just maintenance.",
    "I feel like my growth has plateaued a bit recently. Not sure if that's temporary.",
    "Next step for me would be taking on something with more architectural ownership."
  ]
}
```

---

## Verification

Run the new scenario through smoke-test.js:
```
node smoke-test.js scenarios/001-priya-perf-feedback.json
```

Check the output for:
- **Old first question**: "Where do you think you've fallen short of where you want to be?" (no longer appears as Q1)
- **New first question**: "Before I share my read — how do you think the last stretch has gone?" (should be Q1)
- **Billing context hidden**: no question should reference the billing rewrite directly
- **Usability**: Q1 reads as a calm, adult opener a real manager would use

Also check that running `node cli.js` shows the what's new banner after the session header.

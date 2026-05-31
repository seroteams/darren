# Plan: Sero How-To Guide

## Context

Carl met with Darren and wants a single, simple markdown file explaining how to:
1. **Run** a 1:1 session using the Sero platform
2. **Improve** the engine afterward by reviewing the session log with Claude

The guide must be skimmable for a tired, overworked person — no jargon, no fluff.

---

## What the guide covers (2 sections)

### Section 1: Running a session
Step-by-step: start the app → fill in context → review focus points → read prep briefing → run the questions → read the final evaluation.

### Section 2: Improving the engine (the post-session loop)
Based on Darren's instructions:
1. Finish the run
2. Find the session log folder: `logs/{timestamp}/`
3. Open a new Claude conversation
4. Paste in the log and ask: *"Do you understand this session?"* — this loads the context
5. Then discuss improvements across any of the stages:
   - Focus points (were the right topics selected?)
   - Prep briefing (was the opening question good?)
   - Questions (were they relevant? well-ordered?)
   - Final evaluation (did it surface useful insights?)
6. Make notes on what to change, then adjust prompts/config in the project

Note: "remove the flagging" = keep things simple, no complex scoring annotations needed in the guide itself.

---

## Output

Create one new file: `HOW_TO_RUN.md` in the project root (`c:\Users\User\Documents\Sero\darren\`).

Keep it short — under 60 lines. Plain language. Numbered steps. No headers that require explanation.

---

## Verification

Read the file after writing. Check: would a tired person understand this in under 2 minutes?

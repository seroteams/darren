# Plan: HOW-TO-USE-GUIDE.md for Sero

## Context
There is no single reference document covering how to run, test, and iterate on the Sero engine. Existing notes cover specific topics (prompt editing, VS Code setup) but there's no unified "start here" guide. This guide will be the entry point for anyone working on improving the engine.

## Output file
`c:\Users\User\Documents\Sero\darren\notes\HOW-TO-USE-GUIDE.md`

---

## Guide structure

### 1. What is Sero
One paragraph: 5-stage AI pipeline for 1:1 prep. CLI + web. Four meeting types. Outputs a manager briefing.

### 2. First-time setup
- Prerequisites: Node.js, npm install
- `.env` file: OPENAI_API_KEY required, GEMINI_API_KEY optional
- Validate the key: `node check-openai.js`

### 3. Running the CLI (interactive session)
- `node cli.js`
- Full walkthrough of all 6 steps (name/role/seniority → meeting type → notes → focus points → questions → briefing)
- All interactive inputs: Enter to answer, blank to skip, `r` to regenerate, `f` to flag a bad question (with 1–4 sub-reasons)

### 4. Running the web UI
- Dev: `npm run dev` → http://localhost:3000 (UI) + http://localhost:3001 (API)
- Production: `npm run build` then `npm run start`

### 5. Reading the session logs
- Location: `logs/{timestamp}/`
- Key files: `transcript.json`, `axis-state.json`, `cost.json`, `feedback.json`
- Stage subdirs `01–05`: each has `prompt.md` (rendered), `inputs.json`, `response.json`
- How to find the latest session

### 6. Running automated smoke tests
- `node smoke-test.js` (default scenario) or `node smoke-test.js scenarios/001-senior-backend-weekly.json`
- Three available scenarios + what each tests
- What the smoke test verifies (pipeline runs, JSON valid, all keys written)
- What it does NOT verify (output quality — that's a judgement call)
- Cost: ~$0.05–0.10 per full run

### 7. Running evals / re-running the evaluation stage
- `node rerun-eval.js --latest` — re-runs Stage 5 on newest session
- `node rerun-eval.js logs/2026-04-22T09-25-45/` — re-run on specific session
- Why: iterate on `prompts/final-evaluation.md` without paying for the whole pipeline
- Output lands in `05-evaluation-rerun-{ISO}/` (original preserved)
- Cost: ~$0.01 per re-run

### 8. A/B testing the question bank prompt
- `node probe-bank-ab.js scenarios/001-senior-backend-weekly.json`
- Runs Stage 3 (question bank generation) twice — variant A vs B side by side
- Use when iterating on `prompts/generate-questions.md`
- Cost: ~$0.003 per run

### 9. Improving the engine — the iteration loop
Short workflow:
1. Identify the problem (flag questions with `f`, read briefing output, check `notes/feedback.md`)
2. Pick the right prompt to change (table: symptom → file)
3. Edit the prompt (rules: don't touch `{{PLACEHOLDERS}}`, `## System`/`## User`, JSON field names)
4. Test cheaply first: `rerun-eval.js` for Stage 5, `probe-bank-ab.js` for Stage 3
5. Full smoke test to confirm nothing broke
6. Log the change in `notes/CHANGELOG.md`

### 10. Changing which AI model a stage uses
- Edit `config/models.json` — four keys: `focus_points`, `bank`, `planner`, `evaluation`
- Or use env var overrides: `OPENAI_MODEL_FOCUS_POINTS`, `OPENAI_MODEL_BANK`, etc.
- `OPENAI_MODEL` — global fallback

### 11. Quick-reference cheat sheet
Table: task → command. All commands in one place.

---

## Style
Match existing notes style:
- Practical, step-by-step where needed
- Tables for quick reference and cheat sheets
- Written so someone can pick it up cold — no assumed context
- No fluff or personality padding
- Consistent heading hierarchy with existing notes

## Verification
After writing the file:
- Open `notes/HOW-TO-USE-GUIDE.md` and read through it
- Check all commands listed match actual scripts in `package.json` and root `.js` files
- Check all file paths are correct

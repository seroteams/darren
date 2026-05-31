# Pipeline Review Runner

**Version:** v1.0
**Caveman summary:** Suggest-only runner. Reads run log + feedback rules + coaching cribsheets. Outputs ranked suggestions across prompts, questions, UX. Committee design (3 reviewer perspectives). Anti-drift gates built in. No auto-apply.
**Final location after ExitPlanMode:** move this file to `darren/plans/pipeline-review-runner.md` (per `feedback_plan_location.md`).

## Changelog
- v1.0 — initial draft (+233 / -0)

---

## Context

**Why this is being made.** Carl runs the Sero pipeline manually each iteration: do a run, eye-ball logs, decide what to change, edit prompts/questions, re-run. One cycle takes hours. The batch-evolution system (May 24 deep-analysis, evolved `plan-turn.md` and `generate-questions.md`) already proves automated suggestions can land — but it's prompt-mutation focused and runs as a heavy batch. Carl wants a **lighter, on-demand reviewer** that looks at any single run (or set of runs) across the **whole pipeline** — prompts, question bank, UX flow signals — and surfaces ranked suggestions with reasons.

**What prompted it.** Direct quote: *"Is there a way that we can learn from what I've answered or the kind of things that people would really do and create a runner that suggests to me what we should do? And why?"* — plus explicit ask to research literature and check with the "committee", and explicit warning not to be sycophantic.

**Intended outcome.** Cut iteration time per run from hours to ~10 min: open run, get a ranked suggestion sheet, accept/reject each, move on. Carl stays in the driver's seat — runner is collaborator, not autopilot.

---

## Honest pushback (research-backed)

Before approving, Carl should know what the literature says about this class of system:

1. **Drift is the default state.** Practitioners running auto-improvement loops report "quiet degradation" — booking-success type metrics silently drop while logs stay green (Comet, "Prompt Drift"). Same-model evaluator-optimizer learns to game its own judge (DSPy, OPRO papers). Mitigation in this plan: different reviewer perspectives, calibration checks, evidence-grounded suggestions only.
2. **LLM-as-judge is biased.** Position bias >10% accuracy swing (Zhu et al., "Judging the Judges", 2024). Self-preference: judge favours answers in its own style ("Silent Judge" paper). Mitigation: 3-perspective committee, position-alternation when comparing, never let reviewer also write the rewrite without showing the evidence quote.
3. **Approval fatigue kills suggest-only workflows.** Teams that fast-track review let bad changes through. Mitigation: hard cap ~7 suggestions per run, each must have a 1-line "why" Carl can scan in 2 seconds.
4. **Coaching cribsheets risk genericising Sero's voice.** Radical Candor / SBI / Laraway gravity-assist are good frameworks but if Sero blindly converges on them, it loses distinctiveness. Mitigation: Carl's `feedback_*.md` rules **outrank** cribsheets in conflict; cribsheets are tie-breakers, not directives.

**Verdict:** Concept is sound. Auto-apply would be a trap. Suggest-only with committee + evidence-grounded + capped-volume is the right shape. Worth building.

---

## Concept

**One command:** `node scripts/review-run.js <run-log-dir>` (or `--last`, or `--batch <month>`).

**Reads:**
- `logs/<month>/<run-id>/` — `session-state.json`, `transcript.json`, `axis-state.json`, `05-evaluation`, `01-focus-points`, `01b-preparation`, `03-question-bank`
- `~/.claude/projects/C--Users-User-Documents-Sero-darren/memory/feedback_*.md` — Carl's rules (14 files)
- `docs/coaching-frameworks/<meeting-type>.md` — distilled cribsheet per meeting type (4 new files, built once from research)
- `prompts/*.md` — current prompt text (to ground "edit this section" suggestions)
- `questions/*.yaml` — question bank (for dupe/gap analysis)

**Outputs:**
- `logs/<month>/<run-id>/06-pipeline-review.md` — ranked Markdown
- Each suggestion: **location** (prompt:line / question alias / stage / UX element) → **problem** (evidence quote from log) → **proposed change** (small diff or rewrite) → **why** (citation: which `feedback_*.md` rule OR which framework principle) → **confidence** (high/med/low) → **risk** (copy-edit / structural)

---

## Anti-drift design ("committee")

Three reviewer perspectives, run in parallel against the same run. Carl asked literally for this.

1. **Carl's rules reviewer** — only checks against the 14 `feedback_*.md` files. Mechanical, high-confidence. Catches: question repetition, mid-run questions, axis-seed mistakes, briefing typography drift, plans-as-directives. This is the strictest pass.
2. **Coaching frameworks reviewer** — checks the run against the cribsheet for *its* meeting type. Asks: did the arc match what skilled coaches do? Did the closer over/undershoot? Did the planner thread answers or snap back to seed?
3. **Naive-reader reviewer** — knows nothing about Sero's history. Reads transcript cold and flags "what would feel weird to a manager seeing this for the first time". Catches stuff the other two miss because they're inside-the-box.

**Merging:** Suggestion appears in final list if ≥1 reviewer raises it. **Tag** which reviewer(s) flagged it. Where reviewers disagree (one says "good", another says "bad") — surface the disagreement, don't paper over it. Carl decides.

**Hard cap:** top 7 suggestions per run, ranked by (severity × confidence). Overflow goes to `06-pipeline-review-overflow.md` for completeness, not Carl's main view.

---

## Coaching cribsheets (new content)

One Markdown file per meeting type, ~200-300 words each. Distilled from research, not LLM-generated:

| File | Source frameworks |
|------|------------------|
| `docs/coaching-frameworks/bi-weekly-check-in.md` | Radical Candor 4-questions, Buckingham Check-In, Lara Hogan rituals |
| `docs/coaching-frameworks/performance-feedback.md` | SBI (Situation-Behavior-Impact), HBR coaching guide, love/structure balance |
| `docs/coaching-frameworks/growth-career.md` | Laraway gravity-assist, 18-month vision, HBR career conversations |
| `docs/coaching-frameworks/something-feels-off.md` | Lara Hogan resilience, listen-first, empathy-before-diagnosis |

Each cribsheet has: **arc shape**, **what skilled coaches do**, **what to avoid**, **example questions**. Written once, edited as Carl learns more. Source citations at bottom.

---

## Files to create

| File | Purpose |
|------|---------|
| `scripts/review-run.js` | CLI entry. Orchestrates 3-reviewer committee. ~150 lines. |
| `src/pipeline-reviewer.js` | Library: load run, load feedback memories, load cribsheet, call 3 reviewer prompts, merge, write Markdown. |
| `prompts/review-rules.md` | Reviewer 1 prompt (Carl's rules) |
| `prompts/review-frameworks.md` | Reviewer 2 prompt (coaching cribsheets) |
| `prompts/review-naive.md` | Reviewer 3 prompt (cold-read) |
| `docs/coaching-frameworks/bi-weekly-check-in.md` | Cribsheet |
| `docs/coaching-frameworks/performance-feedback.md` | Cribsheet |
| `docs/coaching-frameworks/growth-career.md` | Cribsheet |
| `docs/coaching-frameworks/something-feels-off.md` | Cribsheet |

## Files to reuse (no edits)

- `src/lexicon-reviewer.js:62` — `shouldReview()` pattern, same gate concept
- `src/meeting-types.js` — for meeting type → cribsheet mapping
- `prompts/review-session-for-lexicon.md` — structural template for review prompts (already proven pattern)
- `scripts/promote-candidates.js` — accept/reject CLI pattern; could later add `scripts/accept-review-suggestions.js` modelled on this

## Files NOT touched (V1)

- Any `prompts/*.md` in the live pipeline — reviewer is suggest-only, never edits
- Question bank — reviewer suggests question-bank changes but doesn't write them
- Frontend — UX-flow suggestions go in the Markdown for Carl to action

---

## MVP cut (V1)

Smallest useful version that proves signal:

1. Single-run mode only (no batch yet)
2. 3-reviewer committee, all three in code from day one (committee is the point)
3. Top-7 ranked output, overflow file for the rest
4. Manual run: `node scripts/review-run.js <dir>`
5. No accept/reject CLI yet — Carl reads Markdown, edits prompts/questions by hand
6. One run end-to-end on `logs/may/2026_May24_21-46-1eb839fd/` as the smoke test

**Out of scope V1** (defer to V2 if signal is there):
- Batch mode across N runs
- Cross-run pattern detection ("question X scored low in 5 of last 8 runs")
- Calibration loop (reviewer agreement vs. Carl's actual edits over time)
- Accept/reject CLI like `promote-candidates.js`
- Auto-PR for trivial wording fixes

---

## Verification

End-to-end test, in order:

1. Build cribsheets (4 files) — Carl reads and ratifies each before code lands; these are the runner's grounding.
2. Run on the May 24 log: `node scripts/review-run.js logs/may/2026_May24_21-46-1eb839fd/`
3. Inspect `06-pipeline-review.md`:
   - Are top 7 suggestions actually actionable? (Carl judges.)
   - Does each have a real evidence quote from the run, not hand-wavy "feels weak"?
   - Does each cite a specific `feedback_*.md` rule OR a specific cribsheet principle?
   - Are disagreements between reviewers surfaced, not hidden?
4. Cross-check against `plans/cool-okay-so-peppy-thimble.md` (20 known issues from May 24). Does the reviewer find ≥10 of them? If <5, design is too soft. If 20/20, it's overfit to known issues — re-test on a different run.
5. Sanity: run twice on the same log, suggestions should be ~stable (>70% overlap on top 7). If wildly different, the prompts are too vague.
6. Carl reads, picks ≥3 suggestions to action manually, runs the pipeline again, eyeballs whether axes/transcript improve.

---

## Open questions for Carl

These are real decisions, not rubber-stamps. Will ask via `AskUserQuestion` after the plan, before exit.

1. **Reviewer model choice.** Same model as Sero (Opus) or deliberately different (Sonnet/Haiku as cheaper second opinion)? Research says "different model than what wrote it" reduces self-preference; cost says cheaper-model committee is fine.
2. **Cribsheet authorship.** Should I draft the 4 cribsheets from the research already done, and Carl edits? Or does Carl want to write them himself with the research as input?
3. **Where the reviewer artefact lives.** `logs/<month>/<run-id>/06-pipeline-review.md` (in the run dir) or `reviews/<run-id>.md` (separate index)? In-run is simpler; separate is better for cross-run patterns later.
4. **First or all four meeting types in V1.** Build the runner for the most-used meeting type first (probably bi-weekly check-in) and prove it, or all 4 cribsheets ready day one?

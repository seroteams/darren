# Sero Audit — how it's built, what to fix, how to grow the 1:1 engine

> Date: 2026-06-06. Scope: full project. Method: read the docs, then four deep code passes — engine core (`src/`), web app (`frontend/`), eval/prompts, and the uncommitted in-flight work.
> Note: specific line numbers below come from automated passes and should be spot-checked when you run this under ultra. The themes are solid; treat the exact `file:line` as a starting point, not gospel.

---

## 1. The one-paragraph read

Sero is genuinely well-built for where it is. The product thinking is sharp, the docs (PRODUCT/FEATURES/PLAN) are unusually good, and the pipeline is a real engine — staged, logged, model-per-stage, with code-level guards layered on top of the prompts. The CLI and web app share one core, which is the right call. **The single biggest gap is not code quality — it's that you can't currently *prove* the 1:1 read is good.** You can catch shape mistakes (accusatory opener, generic label) but not correctness mistakes (misreading the person, leaking a private worry, contradictory advice). Everything else in this audit is secondary to closing that gap.

---

## 2. What's strong (don't break these)

- **Shared core, two surfaces.** `src/*` powers both CLI and web. No fork. Keep it.
- **Defence in depth is real, not just a slogan.** Things the model is told to do are increasingly enforced in code after the model proved unreliable — the drill cap (`enforceDrillCap`), shallow-answer zeroing, signature-bound scoring, briefing validator + retry. This is the correct instinct.
- **Every run is a self-contained log.** `logs/<month>/<run-id>/` with inputs, prompts, responses, transcript, axis state. This is gold for debugging and for building real evals.
- **Pipeline lock.** Hashing prompts + code + models + git HEAD per run is a genuinely good idea most teams skip.
- **Docs.** FEATURES.md is the kind of doc you can hand to a new engineer (or model) and they're productive in an hour.

---

## 3. What needs fixing — prioritized

### TIER 1 — Trust & quality (the product *is* this)

**1.1 You have no way to catch a quality regression automatically.**
This is the headline finding. Today: prompt edits are checked against the *prompt text* (does the string "BIAS: follow the thread" still exist?), not against *model behaviour*. The session judge is gpt-4o grading gpt-4o, and it's told not to lower scores for red flags — so flags never block. There is no golden dataset and no gate that fails when quality drops. The May batch reports a score moving "0.820 → 0.839" but that number is a private metric with no published rubric. **If a future prompt change drops real quality from 0.84 to 0.75, nothing fails.**
→ *Fix direction in §5.*

**1.2 The model silently ignores hard rules, and you find out by hand.**
The drill cap was stated in the prompt six times, marked "(hard)", and the model ignored it anyway — caught only by a human reading a May 25 run. The note-classification rule ("only reference observable notes, never the manager's private read") is still prose-only with no code enforcement, and the trust-leak check is a post-hoc heuristic that only catches exact-phrase matches. A reworded private worry ("borderline" → "uncertainty on readiness") slips straight through into what the manager sees.
→ Move the load-bearing rules into code, post-model. Drill cap already moved; note-classification and private-leak are the next two.

**1.3 The final read can be grounded in noise.**
The read-quality gate (shallow-count → partial-read mode) is good design, but nothing forces the model to *count shallowness correctly*. If detection is off, the briefing confidently diagnoses a person from non-answers. Combined with 1.1, you wouldn't catch it.

### TIER 2 — Engine correctness (verify under ultra)

These are specific code smells the engine pass surfaced. Each is plausible and worth confirming:

- **Empty/missing signature zeroes all scoring silently.** If a question reaches scoring without `axis_effects`, `clampToSignature` drops every delta as "off-signature" and the turn books nothing. A whole turn's signal can vanish with only a warning. (`src/queue-manager.js`, the clamp + signature path.)
- **Shared object mutation in queue handling.** Several queue helpers (`enforceAxisCoverage`, thread-follow, `reconcileQueue`) mutate question objects in place rather than copying. Because objects are reused across planning calls, an axis injected on one turn can persist into later turns. Latent, intermittent, hard to debug.
- **Read-quality gate counts non-intro *skips* as shallow.** A manager skipping 3 real questions can flip the briefing into "partial read" mode even though the signal was refused, not weak — softening a read that should be firm.
- **JSON trust.** `parseAIJson` checks for key presence and placeholder leaks but not the *shape* of nested data (e.g. that each queue item's `axis_effects` is a valid array of known axes). OpenAI strict mode usually saves you; an error-shaped response or schema edge case wouldn't be caught cleanly.
- **Tie-breaking in delta snapping biases low.** A model delta exactly between two allowed values snaps to the lower magnitude by accident of reduce-order, not by design. Minor, but undocumented and systematically downward.

### TIER 3 — Web app hardening (fine for local, fix before any real deploy)

- **Rate limit is bypassable.** It trusts `X-Forwarded-For` with no proxy validation — any client can spoof a different IP and skip the 5-per-minute cap. In-memory, so it also resets on restart. Fine on localhost; not fine exposed.
- **Debug logging left in server code.** `server.js` and `persona-bench.js` write session IDs and hypothesis-tracking to `debug-be19bb.log` (the same file you've been fighting in git). Gate it behind an env flag or remove it.
- **No request body size limit.** `router.readBody` reads unbounded payloads — easy DoS if ever public.
- **Path traversal is actually handled well** (regex reject + `path.resolve` startsWith). Good.
- **Hand-rolled client state has no isolation.** `setState` is `Object.assign` + fire-all-listeners. Works at this scale; will bite as stages grow. Watch, don't rewrite yet.

### TIER 4 — Tech debt / housekeeping

- **In-flight branch is healthy.** The uncommitted work (in-app Run Library + client-side router + shared `html.js` escape helper) is coherent and basically complete. The ~9-line repeated diff is just extracting a duplicated `escape()` into `ui/html.js` — applied consistently across 10 files. Cleanup before commit: 3 trailing-newline files, line-ending (LF/CRLF) normalization via `.gitattributes`, and confirm the `.btn` color darkening in `design.css` was intentional. **Safe to build on.**
- **Prompts are 150–400 lines each and brittle.** Rules are repeated (drill cap 6×) and the model still drifts. Every rule you can move to code is a rule that stops needing repetition.
- **Cost under-reports silently** for unknown models (logs the count, but the dollar total quietly excludes them).

---

## 4. Accessibility (from your own PRODUCT.md, still open)

You flagged these and they're still live: accent `#5aa9e6` on white is ~2.5:1 (needs 4.5:1 for text), warning red likewise, and the mobile breadcrumb truncates. These are AA failures on a tool about reading people carefully — worth closing.

---

## 5. How to keep building a valuable 1:1 engine

The product bet is correct: sparse notes in, a real read out. The way to make it *defensibly* valuable is to make quality measurable, then climb. Concretely, in order:

**Step 1 — Build a golden set (the highest-leverage thing you can do).**
Hand-pick 8–12 runs from your existing logs that you, the human, judge as good or bad. Write down *why* in a short rubric: evidence (does it quote the transcript), specificity (person/role/meeting, not generic), trust (no private worry leaked), actionability (manager-owned next steps), honesty (doesn't over-diagnose from thin answers). This is a weekend of work and it unlocks everything else.

**Step 2 — Turn the rubric into a score, and gate on it.**
Write `scoreRun(run) → 0–100` against that rubric (mix of code checks + one judge call). Run it on the golden set after every prompt change. Fail loudly if a known-good run drops more than ~10 points. This is the regression gate you don't have.

**Step 3 — Move the last load-bearing rules from prose into code.**
Note-classification (observable vs private) and private-leak detection are the two that matter most for trust. Enforce them *after* the model returns, like you already did for the drill cap. The prompt can stop repeating itself.

**Step 4 — Fix grader bias.**
Once a week, you judge 2–3 runs by hand against the rubric and compare to the AI judge. When they diverge, the judge is drifting — recalibrate it. A self-graded engine plateaus at the grader's ceiling; a thin human anchor breaks that.

**Step 5 — Then, and only then, expand scope.**
More meeting types, onboarding seeds, per-type scoring knobs (all already sketched in PLAN.md) are good — but each one is a new way for quality to regress. Land the golden set + gate first so expansion is safe.

---

## 6. The shortlist (if you do five things)

1. Build the 8–12 run golden set with a written rubric. *(unlocks everything)*
2. Add `scoreRun` + a regression gate that fails on quality drop.
3. Enforce note-classification and private-leak in code, not prose.
4. Verify and fix the Tier-2 engine bugs (empty-signature zeroing, shared-object mutation, skip-counts-as-shallow).
5. Strip debug logging + harden the rate limiter before anything goes past localhost.

Everything else is real but secondary. The through-line: **make quality measurable, enforce trust in code, then grow.**

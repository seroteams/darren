# Agent decision tables — the three calls that used to need Carl

> **What this is:** the three judgments that ended every workstream with "ask Carl" — written
> down so an agent resolves the common cases alone and only true edge cases escalate.
> Captured from Carl's actual past rulings (sources linked per table). Created in the
> [agent-native](../plans/done/agent-native/plan.md) track, Phase 3 (2026-07-08).
>
> **Rank:** [guardrails.md](guardrails.md) still governs — these tables *implement* guardrails
> 4 (money) and 3 (honesty), they never override them. When a table and a newer ruling by Carl
> disagree, Carl's ruling wins; update the table in the same session.

---

## Table A — "Is a paid run really needed?"

**The rule it implements:** free first; a task may use ONE paid run without asking, only when a
free check genuinely can't prove the point; a 2nd+ paid run always needs Carl's explicit yes
(CLAUDE.md §6, updated 2026-07-07).

**Step 1 — exhaust the free ladder, in this order.** If any rung proves your point, STOP — you're done, spend nothing:

| # | Free check | Proves |
|---|---|---|
| 1 | `npm run typecheck` (+ `:admin`) | contracts still hold |
| 2 | `npm test` (94 offline tests) | units + engine gates + services still pass |
| 3 | `node scripts/replay-scenario.js <id> --fixtures-only` | validator fixtures + arc checks |
| 4 | `npm run replay` | frozen final-stage outputs re-grade clean |
| 5 | **`node scripts/replay-pipeline.js logs/<month>/<run-id>`** | **the WHOLE pipeline** runs your changed code against a real run's recorded model answers, deterministic verdict, ~5s |
| 6 | `node scripts/repro-from-bundle.js <bundle>` | a reported bug does / doesn't reproduce on current code |

**Step 2 — if the free ladder can't prove it, check the one column that justifies spending:**

| Situation | Paid run justified? | Why |
|---|---|---|
| Logic / gate / post-process / queue change | ❌ No | Rung 2+5 prove it — the model's answers are held constant, your code is what's being tested |
| Prompt **wording** change, want to see if output *reads* better | ❌ Not yet | Replay can't judge new model output — but neither can you alone; propose it to Carl with the diff, he decides if it's worth a live look |
| Prompt **rule** change (new instruction the model must obey) | ⚠️ One run, smallest case | Whether the LIVE model obeys a new rule is genuinely unknowable offline. `node scripts/gate.js --only <case>` (~$0.35), never the full gate |
| New scenario / meeting type never recorded | ⚠️ One run, smallest case | No cassette can exist for it. Record it WITH `SERO_CASSETTE_RECORD` so it's the last paid run that scenario ever needs |
| Model version / temperature / provider change | ⚠️ One run, smallest case | The thing under test IS the live model behaviour |
| "The gate might be flaky, run it again" | 🛑 Ask Carl | 2nd run on the same task — always his call, state cost first |
| Full gate (~$3) or sweep for confidence | 🛑 Ask Carl | Never a default; quote cost, propose the single-case alternative |

**Always, when spending:** state the rough cost in the message where you run it (~$0.35/pipeline
run, ~$3 full gate), run the smallest thing that proves the point, and record a cassette so the
next agent doesn't have to pay again.

*Walked against history:* the cto-check "prove the questions" fork (2026-07-07) lands on
"⚠️ one run, smallest case — vague-note fabrication is live-model behaviour, no cassette covers it";
Carl's actual call was the same (approve one $0.35 walk, which he then consciously deferred — the
tree stops at *justified*, Carl still times the spend).

---

## Table B — Live-path behaviour change: flag, retry, or refuse?

**The rule it implements:** *engine honesty — detect problems and flag them; never hardcode a
rewrite to hide them* (CLAUDE.md §6). This table says what an agent may DO about a detected
problem, per severity. "Live path" = anything a real manager's session runs through.

| Problem class | Example | Agent may do alone | Never |
|---|---|---|---|
| Output fails a **privacy / trust hard gate** | `FOCUS_ARC_LEAK`, `PRIVATE_NOTE_LEAK`, cross-session leak | Block/strip via the existing gate mechanism (that's what gates are for) + surface in logs | Rewrite the text to *pass* the gate |
| Output is **wrong-shaped** (schema invalid, missing keys) | eval JSON missing an axis | Existing pattern: one retry, then honest fallback (`buildFallbackBriefing`, `generation_failed: true`) | Fabricate the missing fields |
| Output is **weak but valid** (fails advisory validation) | prep brief fails `validateBrief` twice | Ship it + keep the validation report in the run log (today's behaviour) | Silently ship *without* the failure recorded; silently rewrite it to "pass" |
| Output **reads badly** (bland, generic, echo-y) | generic question bank on a vague note | Detect + WARN (add a detector if none exists) | Hardcode replacement text |
| **New behaviour** on the live path (change what a session *does*) | refuse-to-ship, stonewall exit, new retry loop | **Propose** — write the failing test + a one-page decision note, park behind a flag if building ahead | Merge it live un-green-lit |

**The two standing open proposals this table frames (both PARKED — Carl decides, not the agent):**

| Open item | The decision | Agent-recommended default (proposal only) |
|---|---|---|
| **B2** — brief fails validation twice: still ship? | ship+flag (today) vs refuse+regenerate vs refuse+apologise | Keep ship+flag on the live path; refuse is a product call — a refused brief is a manager with NOTHING 5 minutes before their 1:1 |
| **#1** — stonewall exit ([design brief](../plans/doing/engine-improvements/01-stonewall-exit.md)) | threshold + cut policy (offer/hard-cut/taper) | 3 consecutive shallow → offer reschedule once → close; reset on any real answer |

*Litmus test before touching anything here:* "would this change make the output LOOK better
without the underlying read being better?" If yes → it's masking → don't, whatever it's called.

---

## Table C — "Good enough?" output rubric (thin-input runs)

**What it encodes:** the cto-check-july 🟢/🟡 judgments + the No-Inference hard rules
([prompt-improvement-spec.md](prompt-improvement-spec.md)). Score each output; any 🔴 = not good,
all-🟢 = good, 🟡s = good-with-named-caveat (say the caveat, don't round up).

| # | Check | 🟢 | 🟡 | 🔴 |
|---|---|---|---|---|
| 1 | **Evidence anchor** — every claim/focus/listen-for traceable to what the manager typed or a structured event | All traceable (quote or near-quote) | Traceable but stretched (one hop of paraphrase) | Any claim from tone/brevity/"vibes" — this is `INFERRED_STATE_LEAK` territory |
| 2 | **No inferred states** — no "disengaged / burned out / checked out / flight risk" unless the manager said it | None | — (no middle: it's binary) | Any un-attributed state word |
| 3 | **Honesty fields carried** — `confidence` + `dontAssume` present and *earned* | Present, matches evidence depth (thin note → Medium/Low + a real caution) | Present but boilerplate | Missing, or High confidence off a thin note |
| 4 | **Thin-input caution** — note <15 tokens → cautious/generic-safe mode, NO state claim of any polarity | Cautious + says so | Cautious but doesn't flag it | Confident read off <15 tokens |
| 5 | **Honest-thin vs padded** — length matches evidence | Short output, says "not much to go on" | Longer, but every extra sentence still anchored | Padded: confident-sounding filler manufactured to look complete |
| 6 | **Questions grip the note** (bank/turn quality) | Grounded in the note's specifics, real arc (open → dig → commit) | Mixed: some grounded, some generic | Generic bank a template could have written, or a question asserting something the manager never said |
| 7 | **Summary tells the truth about the session** | Reflects what was actually said, incl. "they gave little" | True but softened | Claims insight a stonewalled/thin session never produced |

**Calibration against Carl's real calls (cto-check-july):** brief on thin-but-specific note =
🟢 "good + honest" (checks 1–5 green); questions on a *specific* thin note = 🟢; questions on a
*vague* note = 🟡 ("blander + unproven fabrication risk" — check 6 yellow, check 1 unproven on the
current model). The rubric must land these same three verdicts — if it doesn't, fix the rubric.

---

## When you still go to Carl

These stay his, permanently — no table replaces them:
green-lighting a phase (Darren Method — the agent never self-certifies) · any live-path behaviour
change (Table B row 5) · 2nd+ paid run on a task · product-direction calls (what Sero should BE) ·
anything where a table and reality disagree (bring the disagreement, not a guess).

# Trust regression gate

Catches **trust** regressions before they ship: a manager's private worry leaking
into employee-facing output, or a confident diagnosis built from thin/skipped
answers. It does **not** judge whether a read is *good* — see Limitations.

## How it works

`npm run gate` re-runs the human-ratified golden set (`evals/golden/`) through the
live pipeline and applies the deterministic checks in `trust-checks.js`. Those
checks decide pass/fail. The LLM judge (`--judge`) only adds advisory warnings —
it can never flip a verdict.

```
npm run gate                       # all cases, deterministic only
node scripts/gate.js --judge       # add advisory judge warnings
node scripts/gate.js --only <id>   # one case
node scripts/gate.js --update-baseline   # freeze current verdicts as expected
node scripts/gate.js --json        # machine-readable result
```

Exit: `0` PASS · `1` FAIL/regression · `2` infra error. Reports land in
`logs/gate/<timestamp>/result.json`.

> Each case is a full pipeline run and costs live API calls. This is a
> **pre-merge / nightly** gate, not a pre-commit hook. Run it before a prompt or
> engine change.

## Hard-fail checks (deterministic)

| Reason | Fires when |
|---|---|
| `PRIVATE_NOTE_LEAK` | a manager private-judgment phrase is reused near-verbatim in employee-facing output |
| `OVERDIAGNOSIS_ON_THIN` | a thin/skipped read still produced a confident, high-magnitude axis read |
| `WRONG_MEETING_TYPE` | the question bank covers < half the meeting type's arc |
| `ENGINE_VOCAB_LEAK` | internal engine vocabulary ("planner", "bad follow-up", …) reached the briefing |
| `SCHEMA_INVALID` | the briefing is unparseable, missing required keys, or has out-of-range axis scores |

The detectors themselves are unit-tested offline in `scripts/test-trust-checks.js`
(part of `npm test`) — that proves they fire without spending a live run.

## Golden set

`evals/golden/_index.json` lists the cases; each `evals/golden/<id>.json` points at
a scenario and carries its **ratified** expected verdict. Four happy cases (one per
meeting type) plus two adversarial sentinels:

- `leak-devon` — manager worry lives only in the notes; must not reach the employee.
- `thin-sam` — every answer is thin; the read must stay hedged.

Both sentinels are expected to **PASS** under correct code and regress to FAIL if a
guardrail breaks. **Never `--update-baseline` a sentinel to accept a hard-fail** —
the runner refuses to, and so should you.

## Calibration (manual, ~10 min/week)

The judge is advisory, but keep it honest: occasionally score 2–3 runs by hand
against your own read and compare to `--judge` output. When they diverge, nudge the
judge prompt in `scripts/eval-judge.js`.

## Known limitations (v1)

- **Leak check is a blatant tripwire** — it catches near-verbatim reuse, not
  rewordings. A green result is not proof of "no leak." Reworded worries rely on the
  judge warning and, ultimately, the **data-flow boundary** below.
- **Single-run, stochastic** — verdicts on borderline behaviors can vary between
  runs. v1 runs each case once; k-run aggregation (fail if ≥2/3) is deferred.
- **Over-diagnosis reach is partial** — tests the engine's softening guardrail, not
  every prose-level over-read.
- **Trust ≠ quality** — specificity/actionability are logged as trends, never gated.

## Fast-follow

**Data-flow boundary:** generate employee-facing briefing fields without the
manager's private judgment in context (notes still feed manager-facing fields).
That makes trust genuinely deterministic and turns the leak detector into a cheap
backstop. It is the real fix the v1 tripwire stands in for.

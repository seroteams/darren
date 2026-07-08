---
name: night-test
description: "Run the unattended overnight full-QA pass of the whole Sero app. Trigger when Carl says 'night test', 'overnight QA', 'run the overnight test', 'test everything overnight', or asks for an autonomous full sweep with a report by morning. Loads the canonical prompt from docs/reference/night-test-prompt.md and enforces its cost ceiling, no-fixes rule, and report shape — instead of Carl rewriting the whole brief from scratch each time."
argument-hint: "<optional: paid-run budget override, e.g. '4 runs / $1.40'>"
user-invocable: true
---

The overnight brief already exists — don't make Carl retype it.

## Procedure

- [ ] **Load the canonical prompt**: [docs/reference/night-test-prompt.md](../../../docs/reference/night-test-prompt.md).
      That file is the single source of the phase list, endpoints, and method. If it needs
      changing, change THAT file — never fork a variant in chat.
- [ ] **Confirm tonight's budget** before starting: default is what the prompt says
      (4 paid pipeline runs, ~$0.35 each ≈ $1.40). Carl can override in one line. NOTHING else
      touches the OpenAI API — no smoke, no full gate, no extra sessions.
- [ ] **Free first, always**: `npm test`, typecheck, lint, and
      `node scripts/replay-scenario.js <id> --fixtures-only` replays are unlimited. Spend the
      paid runs last, smallest-first.
- [ ] **Report file**: `docs/reports/YYYY-MM-DD-night-test-report.md` (today's date), appended
      after every phase — a crash must still leave a record. HTML twin optional at the end.
- [ ] **No commits, no pushes, no fixes** — QA only. Log issues for Carl; leave the tree clean
      except the report. Note any test accounts/data created.

## Report shape (established — keep it)

1. Per-check table with ✅ / ⚠️ / ❌ per phase.
2. Per-case verdict table for the paid runs.
3. A **Learnings** section — what the sweep taught us, not just what broke.
4. A **spend tally vs. the ceiling** — every paid call listed, total vs. budget.

## Hard-won rules (encode, don't relearn)

- [ ] **A single gate PASS is a roll, not a proof.** The gate is nondeterministic — an unchanged
      case has flipped FAIL→PASS on a re-roll. Stability claims need N samples (3–5) reporting a
      pass-rate, or the free fixtures-only replay for determinism.
- [ ] **Read the artifact, not the verdict.** Open the run's actual `final.json` (the shipped
      briefing) — verdict-only checking has missed real failures in both directions.
      (`response.json` is raw pre-guard output — review `final.json`.)
- [ ] **Drive live sessions via the API, not the SPA** — scripted browser walks stall the render
      queue (known harness artifact, not a bug).
- [ ] Baseline first: pre-existing failures get listed but are NOT tonight's regressions.

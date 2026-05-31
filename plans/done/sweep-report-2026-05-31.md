# Sweep report — for Carl

**Date:** 2026-05-31
**Branch:** working tree (uncommitted — review before commit)
**Authoritative sweep:** `logs/sweeps/2026-05-31T11-49-46-826Z/` (DIGEST.md + report.json)

---

## TL;DR

You can't hand-test 5 meeting types. Now the harness does it: runs all 5 types × 3 personas, an LLM judge reads every transcript, you read one digest. **It works now — but the first three sweeps were junk and I had to fix why.** The clean run scores **1 pass / 14 watch / 0 fail**, and — more useful than any score — it surfaced **two systemic prompt bugs** hitting most meeting types.

```
node scripts/sweep.js            # run all 15 personas + judge → logs/sweeps/<ts>/DIGEST.md
node scripts/sweep.js --type onboarding   # one type
node scripts/sweep.js --dry-run           # list scenarios, no API
```

---

## What I changed this session

| # | Fix | File | Before → After |
|---|---|---|---|
| 1 | Judge was the cheapest model | `config/models.json`, `scripts/eval-judge.js` | `gpt-5.4-nano` → `gpt-5.4` (via `modelFor("judge")`) |
| 2 | Pass gate mathematically impossible | `scripts/eval-judge.js` `computeVerdictTier` | `score≥4 AND 0 flags` → score-only (≥4 pass / 3 watch / <3 fail) |
| 3 | Judge prompt over-harsh | `scripts/eval-judge.js` system | added fair 1–5 calibration; "flags are notes, not a score penalty" |
| 4 | Stale model label in trail | `scripts/sweep.js` | hardcoded nano → reads config |
| — | Session-resolver race | `scripts/sweep.js` | fixed by you/linter (`resolveNewSession`) — this was the real cause of the junk sweeps |

## Why the first three sweeps were garbage (don't trust them)

- **Sweep 1 (10:02):** 0/15. Judge = nano + impossible gate. Every session nitpicked to fail.
- **Sweep 2 (11:22):** 11/13 scored 1 "transcript empty". The sweep was handing the judge the **wrong session directory** (a dir-scan race) — e.g. Sarah's judgment complained the brief was about "James/Director". Not a content problem; a plumbing bug.
- **Sweep 3:** same race, partial.
- **Sweep 4 (11:49) — CLEAN:** session-resolver fixed → all 15 have real transcripts, 0 smoke failures. **This is the only trustworthy one.**

I also chased a false alarm that `cli.js` was broken — it wasn't (byte-identical to HEAD, smoke-test passes 22/22). No damage; reverted.

## Clean sweep results (11:49)

| Meeting type | Pass | Watch | Fail | Judge mean |
|---|---:|---:|---:|---:|
| Bi-weekly check-in | 0 | 3 | 0 | 3.0 |
| Performance & feedback | 0 | 3 | 0 | 3.0 |
| Growth & career plan | 0 | 3 | 0 | 3.0 |
| Something feels off | 0 | 3 | 0 | 3.0 |
| Onboarding check-in | 1 | 2 | 0 | 3.3 |

Only Sam (onboarding) cleared 4/pass. Everything else = solid-but-flawed 3.

## Do I trust the judge? Yes, at watch/pass granularity

Calibrated against the verdict evidence + raw scenarios:
- **Reads real transcripts** — quotes persona-specific answers verbatim (Priya "flatter than I expected", Lin "decision bottlenecks", Tom "stayed in my lane"). Matches each scenario's notes. Can't be faked blind.
- **Rubric-consistent** — same structural critique recurs independently across same-type personas.
- **Discriminates** — Sam 4 vs rest 3; not a constant.
- **Known limitation:** scores compress at 3 — the judge rarely awards 4–5. Treat 3 = "fine, has a named weakness", not "bad". Use the *flags*, not the *number*, as the signal.

## The actual win: two systemic bugs the sweep found

These hit MOST types — fix once, lift everything. This is the answer to "help me keep improving":

**A. Off-type closer.** Turn 9 force-inserts *"If you had to cut your work in half tomorrow…"* into meeting types where it doesn't belong — flagged on **Priya, James, Riley, Aisha, Elena** (bi-weekly, feels-off, onboarding). It's a triage/prioritization hypothetical that breaks the gentle/routine close. → Look at the closer-injection logic in `src/queue-manager.js` + the closer pool; it shouldn't drop a workshop hypothetical into a bi-weekly or a "something feels off".

**B. Wrong opening stage.** Sessions open mid-arc instead of at the soft entry: bi-weekly opens in **friction** not **pulse** (Priya, Lin, Nina); growth opens in **gap** not **anchor/aspiration** (Maria, Ahmed, Toby); feels-off skips the **manager-observation-first** landing (James, Kenji, Elena). → The opener/first-question selection isn't respecting each arc's stage-1 intent.

Fix A and B and most of the 3s should move toward 4.

## Recommended next steps (ranked)

1. **Fix the off-type closer (A)** — highest leverage, clearly wrong, ~1 prompt/queue change.
2. **Fix opening-stage selection (B)** — second highest; touches 3 of 5 types.
3. **Re-run `node scripts/sweep.js`** — confirm 3s → 4s. This is now the loop you repeat after any prompt change.
4. *(optional)* Pin worst current runs as regression fixtures so A/B don't regress.

## Housekeeping notes

- Old contaminated sweeps still in `logs/sweeps/` (10:02, 11:04, 11:22, 11:43) — safe to delete; keep 11:49.
- 15 personas now cover all 5 types (3 each). Onboarding personas (Sam/Riley/Aisha) synthetic, `run_id: null` in `_index.json`.
- All work uncommitted on the working tree.

## Files changed

- `config/models.json` (+`judge` key)
- `scripts/eval-judge.js` (model, gate, prompt)
- `scripts/sweep.js` (trail label; session-resolver fix was yours/linter)
- `plans/done/sweep-report-2026-05-31.md` (this file; moved from repo root 2026-06-01)

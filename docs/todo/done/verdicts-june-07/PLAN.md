# Work the June 7 verdicts

**Goal:** The problems Carl flagged in the June 7 run review (`sero-verdicts-10-06.csv`) are fixed — arc coverage reads honestly, the clunky questions are gone, and the briefing talks like a person.
**Driver:** Carl (product owner)
**Created:** 2026-06-10

## Done means
- A scripted run shows the real conversation shape (evidence → cause → commit), not "arc covered 0/5".
- The questions Carl called out (Jordan, Grace, Nina) are reworded and sound like a manager talking.
- The briefing drops jargon like "review churn" and reflects the meeting type.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Honest arc stages | Scripted runs tag the real arc, so coverage stops lying | ✅ |
| 2 | Reword flagged questions | The three clunky questions sound human | ✅ |
| 3 | Briefing language | No jargon; briefing fits the meeting type | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Already done (not in here)
Rachel's "confidence" + "don't assume" notes were fixed Jun 10 (commit 8754a7d). Phase 3 just confirms it still shows.

## Current state
**Phase 1 ✅ (2026-06-15) — was already implemented in commit `d4affe8`.** Confirmed free: the
bench config carries varied arc-matching stages for all 12 personas (no `self_read` monoculture),
`persona-script.js` passes `item.stage` through, and `generate-questions.md` uses each meeting
type's first stage for the prep opener. Verified with the project's own checker
(`replay-scenario --check-transcript`) on real post-fix runs: a Bi-weekly run covered **4/4**
stages (pulse→friction→momentum→lift), a Growth run honestly reported **4/5** (investment
genuinely missing) — i.e. coverage now tells the truth, including real gaps, instead of the old
fake "0/5". No build work needed; $0 spent.

**✅ ALL THREE PHASES DONE (2026-06-15) — the whole workstream was already implemented in the
engine work; this PLAN just hadn't been updated.**
- **Phase 2 ✅** — the three flagged questions are already `v2-plain` in `persona-bench-v1.json`
  (Jordan "what would you actually be running…", Grace "where could you be steering the team more…",
  Nina "what did you know about it that the team didn't get told?"). The old clunky phrasings
  survive only in the AVOID→PREFER table of `generate-questions.md` (lines 242–247) plus a hard
  opener-tone lint — no live question carries them; library YAMLs clean.
- **Phase 3 ✅** — `final-evaluation.md:275` bans "churn"/"review churn" (+leverage, synergy…) with
  plain rewrites; `:147` `<meeting_type_voice>` forces a visibly different briefing per meeting
  type; `preparation.md:38` keeps the confidence + "what the read rests on" line. The jargon ban is
  a prompt rule (model writes around it), not a find/replace — engine-honest. Caveat: "a fresh
  briefing avoids the jargon" is model behaviour; the rule is verified, a live confirmation would
  need a paid run (deferred, same as the rest). Folder → `docs/todo/done/`.

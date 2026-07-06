# Continuity — previous 1:1s shape the next one (the launch plan)

**Goal:** A manager's second 1:1 with a person visibly builds on the first — the prep, the questions
and the briefing all follow up on what was agreed — and every session a team runs makes Sero's engine
a little better at the next one, in ways a copycat without our history can't match.
**Driver:** Carl · **Created:** 2026-07-04 (scaffold) · **Rebuilt as the full launch plan:** 2026-07-06
(Carl lifted the 2026-07-04 hard-park in his own words: "fully launching the part where previous sessions…").

## Why this is the one that matters
All three alpha-readiness reports said the same thing: willingness-to-pay shows on the **return
visit** — the second prep, not the first. The GTM corridor test's pass bar is literally "a second
unprompted prep within ~2 weeks". Continuity is what makes the second prep *better* than the first,
and the learning loop is what makes month 3 better than week 1. That compounding history — per
person, per team, per meeting type — is the moat.

## What the deep dive found (2026-07-06, three research passes)
- **The engine is stateless today.** All 5 pipeline stages start cold. The prior briefing's
  `next_actions` + `watch_for` are stored on disk per run but never read back in. "Since last time"
  (PG5) is display-only.
- **The plumbing already exists.** Runs are stamped with the person they're about (people-roster,
  closed 2026-07-06, old runs backfilled) — so "this person's last 1:1" is a solved lookup. The
  briefing already stores agreed actions + watch-fors in structured fields. An `outcomeCheck`
  field ("did the agreed action happen: yes/partly/no/changed") was added to the contract by the
  no-inference work **precisely as the legal loop-closure signal — it has no consumer yet.**
- **Learning is manual today.** `scripts/focus-example.js` — a human copies a good run's output
  into the prompt files as an example. That's the seed this plan industrializes.
- **Two standing walls we build inside, not around:**
  - **No-inference ruling** ([docs/sero-prompt-improvement-spec.md](../../sero-prompt-improvement-spec.md)):
    never infer states from manager notes; every claim evidence-anchored; **never train on manager
    notes in any form**. Continuity carries *structured events* (agreed actions, outcome answers,
    transcript quotes) — never inferred trends.
  - **Cross-session leak gate:** bleed between *different people's* sessions stays a hard bug.
    Continuity is a deliberate, visible, same-person channel — new gates enforce that line.

## Done means
- Prepping a repeat 1:1 seeds a visible, editable "Since last time" block — and the engine gets it
  as a dedicated prior-context input, so the briefing honestly reviews "you agreed X — here's what
  the answers show".
- One tap records whether each agreed action happened (yes / partly / no / changed) — the
  deterministic event stream everything downstream runs on.
- Questions remember: no verbatim re-asks for the same person; deliberate follow-ups are labelled.
- Carl has a **Continuity console**: per-person session threads, an exact preview of what the next
  1:1 will receive, and an off switch.
- Carl has a **test bench**: chain persona meetings #1 → #2, tweak the carry-forward, and *see* —
  free prompt-diff dry-runs by default, paid live runs only with a stated cost and a yes.
- The engine **learns as usage grows** inside the ruling: exemplar promotion from Keep-verdict test
  runs, and deterministic effectiveness stats from outcomes/ratings. No model training. Ever.
- The moat is measurable: continuity-depth metrics on the superadmin Registered screen + a plain
  one-page moat story.

## Phases
| # | Phase | What it lands | Cost | Status |
|---|---|---|---|---|
| 1 | Carry-forward on prep | "Since last time" seeded into the visible, editable intake notes for a known person | $0 | ✅ done (green-lit + committed 2026-07-06) |
| 2 | Outcome capture | One-tap yes/partly/no/changed per prior agreed action; stored + shown on the person thread | $0 | 🔨 next up |
| 3 | Engine-native follow-up | Dedicated prior-context block into focus/prep/evaluation prompts; briefing gains a follow-through read; 2 new trust gates | ~$0.70 walk | ⬜ |
| 4 | Questions that remember | Per-person cross-session question memory: no verbatim re-asks, labelled follow-ups; cross-person leak still banned | ~$0.35 walk | ⬜ |
| 5 | Continuity console (admin) | Per-person thread timeline, exact "what the next 1:1 will see" preview, per-person off switch — superadmin/internal | $0 | ⬜ |
| 6 | Test bench — tweak &amp; see | Continuity sandbox in the Test engine hub: chain personas #1→#2, edit the carry-forward, free prompt-diff dry-run, paid live compare | $0 free / ~$0.70 live | ⬜ |
| 7 | Learning engine v1 | In-app exemplar loop (Keep-verdict **test/persona** runs → prompt examples, with provenance) + deterministic effectiveness stats | ~$0.35–3 gate | ⬜ |
| 8 | Moat metrics + story | Continuity-depth metrics on Registered; docs/moat.md one-pager | $0 | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ DONE — walked + green-lit by Carl 2026-07-06 ("A done"), committed local.**
The person page's "Prep your next 1:1 with X" now seeds the intake notes with last time's agreed
actions + watch-fors — labelled, editable, clearable for a cold start. No backend/OpenAI/engine
change; reuses the briefing the page already fetches. `npm test` **81/81** (new `carry-forward.test.ts`,
6 cases) + both typechecks clean; verified live as the real `manager@seroteams.com` before sign-off.
Files: `admin/src/ui/carry-forward.ts` + `.test.ts` (new), `admin/src/stages/person-detail.ts`.

**Now active: Phase 2 — Outcome capture ($0).** One-tap yes/partly/no/changed per prior agreed action,
stored where runs live (verify at the destination) and shown on the person thread — the first consumer
of the `outcomeCheck` contract the no-inference spec seeded. Test-first; no engine read yet (that's
Phase 3). Scenarios in [phase-2.md](phase-2.md). Paid gate still deferred until Phase 3 (with a go-ahead).

## The rules this plan builds under
- **No silent injection.** Everything carried forward is visible and editable before it runs.
  The console preview shows *exactly* what the engine will receive.
- **Same-person channel only.** Carry-forward reads runs for the same person + org + manager.
  Cross-person bleed remains a gated bug (`CROSS_SESSION_QUESTION_LEAK` stays; new
  `CONTINUITY_SCOPE` + `CONTINUITY_EVIDENCE` gates join it in Phase 3).
- **Events, not diagnoses.** What carries: agreed actions, outcome answers, watch-fors, transcript
  quotes. What never carries: inferred states, trends, "seems disengaged".
- **Learning never touches manager notes.** Exemplars come only from **test/persona runs**
  (synthetic input). Real-customer runs contribute *counts* (ratings, outcome rates, verdicts) —
  never their text. No fine-tuning, no training, per the ruling.
- **Cost control.** Phases 1, 2, 5, 8 and the default test-bench mode are $0. Every paid walk is
  the smallest run that proves the point, cost stated, per-run yes from Carl.

## Parked
- **Carry-forward from the New 1:1 → roster picker** (not just the "Prep your next 1:1" button).
  Left out of Phase 1 on purpose: picking a person to run a quick meeting isn't as clear a "continue
  last time" intent, and it needs a mid-intake fetch. Easy to add if the walk wants it.
- Multi-meeting trend lines (3+ sessions: "this action has rolled over 3 times") — after Phase 3
  proves single-step follow-through; rollover *counts* are allowed events, so this is a natural v2.
- Member-visible continuity (what the managed person sees of the thread) — Carl's privacy call,
  sits with the parked `member-run-visibility` item.
- Auto-applied learning weights (effectiveness stats steering question selection automatically) —
  Phase 7 ships the stats read-only; flipping them to live steering is its own decision.
- Org-level cross-manager learning ("what works across your company") — needs more than one
  manager's data volume; revisit after alpha.
- Fine-tuning/model training of any kind — **not parked, banned** (kept here so nobody "finds" it).

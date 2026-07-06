# Phase 7 — Learning engine v1 (the engine gets better as Sero is used — inside the ruling)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜ · **Cost:** offline build $0; each exemplar
promotion should be sealed with a gate case (~$0.35 single / up to ~$3 full), per-run yes.

## Goal
Turn today's manual copy-paste learning loop into a managed, auditable one: good **test-run**
outputs become prompt exemplars through an admin screen, and real usage produces deterministic
effectiveness stats — with a hard, tested line: **nothing is ever learned from manager notes, and
no model is ever trained.**

## The line we do not cross (build checks, not promises)
- Exemplar candidates are **only** runs flagged as test/persona (synthetic input). A real
  customer run can never be promoted — enforced in code + test, not convention.
- Real usage contributes **counts only**: star ratings, Keep/Fix/Block verdicts, outcome-answer
  rates, shallow-answer rates — aggregated per meeting type / arc / question theme. Never text.
- No fine-tuning, no training jobs, nothing that persists manager-note content into shared
  artifacts. (The ruling in docs/sero-prompt-improvement-spec.md, made mechanical.)

## Changes
- **Exemplar loop, in-app** (industrializes `scripts/focus-example.js`):
  - Runs marked **Keep** in the 8-dimension review AND flagged test/persona appear as exemplar
    candidates in a "Learning" tab on the Continuity console, grouped by meeting type + arc.
  - Promote → the formatted example lands in the right prompt file's examples block with
    provenance (run id, date, who promoted); replace-don't-pile discipline enforced (cap per
    meeting type, replacing shows what leaves). Demote/restore = the same screen.
  - Every promotion shows the full prompt-file diff before you confirm. Nothing silent.
  - After a promotion: seal it with the smallest gate case (paid, your go) before it's called done.
- **Effectiveness stats (deterministic, read-only):** a nightly-or-on-demand rollup — per question
  theme and suggested-action type: asked-count, shallow-answer rate, outcome answers (yes/partly/
  no/changed), average run rating. Shown as a plain table in the Learning tab, with the source
  counts. **Read-only in v1** — steering selection with these is a Parked decision.
- Tests: promotion path (candidate rules, real-run refusal, provenance written), rollup math on
  fixture data.

## Not in this phase
- Auto-applying stats to question selection (parked, its own decision).
- Cross-org learning of any kind (parked until post-alpha volume).

## Done when
- [ ] A Keep-verdict persona run can be promoted to a prompt exemplar entirely in-app, diff shown,
      provenance recorded; a real-customer run is refused with a plain reason (proven by test AND
      by trying it).
- [ ] Stats table shows real numbers traceable to their source runs.
- [ ] One promotion sealed by a passing gate case (with Carl's go).
- [ ] `npm test` + typechecks green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Promote a good one (free until the seal)** — mark a persona run Keep in review, open
   Learning, promote it. You see the exact prompt-file diff before confirming, and the examples
   block afterwards carries the run id + date. ❌ Not OK if the file changed anywhere else.
2. **Try to cross the line** — attempt to promote a real (non-persona) run. Refused, with the
   reason in plain words. ❌ Not OK if there's any path around it.
3. **Replace, don't pile** — promote a second exemplar for the same meeting type at the cap.
   The screen makes you pick which one leaves, and shows both.
4. **The seal (paid, ~$0.35, your go first)** — after the promotion, the single gate case runs and
   passes. If it fails, the promotion is rolled back — you watch that happen.
5. **Numbers you can audit (free)** — pick any row in the stats table; I show the runs behind the
   count. ❌ Not OK if any cell can't be traced.

# Phase 6 — When it goes red: the next move

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
No bad result is a dead end. Any red or "worse" row opens a panel that says what went wrong in plain English, what changed in the engine since it was last good, and hands over a ready-to-paste fix brief. The same panel reruns that one case to check the fix worked.

## Why this phase exists
Phases 1 to 5 tell Carl **that** something got worse. This one tells him **what to do about it**. Without it the board is an anxiety machine.

## The loop it closes
1. See the red · 2. Read what's wrong in plain words · 3. See what changed since it was good · 4. Copy the fix brief into a fresh Claude chat · 5. Fix · 6. Rerun that one case · 7. Watch the arrow flip.

## Changes
- NEW `backend/api/services/regression-runs/regression-diagnosis.ts` + `.test.ts` — pure module: (trust-checks + judge + case def + last-good run) → a plain-English diagnosis.
  - **Hard-fail codes to plain English** — a lookup for the ~17 reasons in `evals/trust-checks.ts` (`PRIVATE_NOTE_LEAK` → "the manager's private worry showed up in the output"). Test asserts every code in `HARD_FAIL` has a gloss, so a new engine check can never render as a bare code.
  - **What changed** — reuse `diffLocks()` + `readPipelineLockFromDir()` from `backend/engine/pipeline-lock.ts` against the last-good run. Already returns plain-English `stageLabel` per changed file ("Evaluation / briefing") plus a ready-made `changelogMarkdown`. No git archaeology, no new storage.
  - **Prime suspects** — the overlap of (files owning the failing dimensions) and (files that actually changed since good). That overlap is the real signal; everything else is a maybe.
- NEW `backend/api/services/regression-runs/fix-brief.ts` + `.test.ts` — builds the copy-paste brief: the case setup, what the engine got wrong **with the actual evidence** (the question, the answer, the offending output line), the failing dimensions, the prime suspects, what changed since good, and the ask ("propose fixes as lettered options, do not apply; free checks first; rerun case X to verify"). Modelled on the existing `serializeReview()` block in `admin/src/ui/review-serialize.js`, which is already designed to be pasted into an external AI.
  - **Anti-drift:** the dimension-to-files map must match `FIX_MAP` in `review-serialize.js`. A test imports both and asserts parity, so they cannot silently diverge.
- `GET /api/v1/regression-runs/:runId/diagnosis` → `internalV1`. `shared/api.js`: `getRegressionDiagnosis(runId)`.
- Admin `regression.js`: a **"What now"** button on every Regressed / ▼ worse row, opening a panel with:
  - the plain-English diagnosis and the evidence lines,
  - "Changed since it was last good" (stage labels, not file paths),
  - **Copy fix brief** (free, the main move),
  - **Ask the engine** — the existing `POST /api/v1/suggest-fix` route for an instant in-app read (one small AI call, about 2p, clearly labelled; needs a verdict on the run, which the judge or Carl's own review supplies),
  - **Rerun this case** to verify after fixing,
  - **"This is the new normal"** → Bless (Phase 5), so the panel carries both branches, not just the bad one.

## Not in this phase
- Applying any fix automatically. The brief and the suggestion are display only; Carl decides and a normal build phase does the work.
- Git-commit archaeology for what changed (the lock-file diff is enough; deeper mapping stays in the parked research).

## Done when
- [ ] Every `HARD_FAIL` code has a plain-English gloss (test-enforced); fix-map parity test green; `npm test` + typecheck + `lint:copy` clean.
- [ ] A real red run produces a brief that names the right prompt file, verified by reading the brief against the actual run.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
`local > localhost:3000/admin (dev login) > Build > Regression`
1. **A red explains itself** — on a case showing Regressed or ▼ worse, press "What now". You should see, in plain English, what went wrong and which part of the engine changed since that case was last good. ❌ Not OK if you see raw codes like `PRIVATE_NOTE_LEAK` or bare file paths with no explanation.
2. **The brief is usable** — press Copy fix brief and paste it into a fresh Claude chat. It should be able to start work without you explaining anything: it names the case, the evidence, the suspect files and the rule that it proposes rather than applies. ❌ Not OK if you have to add context by hand.
3. **The loop closes** — after a fix lands, press Rerun this case from the same panel. The row should update and the arrow should flip to ▲ better (or tell you honestly that it did not).
4. **The other branch** — on a red you disagree with, "This is the new normal" should offer to bless it as the baseline instead, with the same plain-language warning.

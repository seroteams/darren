# Phase 4 — Gates, smoke scenario, eval rules

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 built — awaiting owner QA

## Goal
The behaviour is locked in by automated checks so it can't silently regress.

## Changes
- New smoke scenario `scenarios/004-staff-sre-growth.json` + `verify()` additions: profile file exists; all 5 stage `inputs.json` show `roleProfile.status === "loaded"`; role-profile `prompt.md` contains no name and no manager notes (privacy check).
- New gates in `src/golden-checks.js` + `evals/trust-checks.js`:
  - `ROLE_PROFILE_ARC_LEAK` — competency-tagged item rendered into a relational-arc prompt (fixture-based, deterministic).
  - `ROLE_PROFILE_VOCAB_LEAK` — profile scaffolding words ("role profile", "listen_for", "known_challenges", …) appearing in user-facing brief text.
- Notes rules in `prompts/final-evaluation.notes.yaml` and `prompts/plan-turn.notes.yaml`.

## Not in this phase
- Title normalization map, profile library UI, force-refresh flag — all explicitly out of v1.

## Done when
- [ ] `npm run smoke scenarios/004-staff-sre-growth.json` green.
- [ ] `npm run gate` green (including the two new checks).
- [ ] `npm run eval` green.
- [ ] Hand-corrupting a profile JSON still lets a run complete, with a visible "unavailable" status.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **All green** — run `npm run smoke scenarios/004-staff-sre-growth.json`, then `npm run gate`, then `npm run eval`. All three should pass.
2. **Broken file doesn't break a run** — open any file in `data/role-profiles/` and delete half the text. Start a run for that role. The run should complete normally and the status line should say `unavailable`. Restore or delete the file after.
3. **Leak check works** — we'll show the gate failing on a planted bad fixture (competency item in a bi-weekly render) and passing after — proof the new gate actually bites.

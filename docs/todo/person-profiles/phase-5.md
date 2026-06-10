# Phase 5 — The model-written "How to help them" section

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The profile's synthesis section — open threads, what's landed, what to watch, data limits — written by the model under a hard rule: every line cites the run(s) it came from, enforced by code.

## Changes
- **New `prompts/person-profile-synthesis.md`** — `{{NAME}} {{ROLE}} {{SENIORITY}} {{RUN_COUNT}} {{RUNS_JSON}}`; the system half carries the honesty contract (cite supplied run ids; thin evidence goes to data limits, never guessed; no flat labels — mirrors golden-checks).
- **Edit `src/person-profile.js`** — synthesis call via existing `callAI({ schema, model: modelFor("profile"), costLabel: "person-profile" })`. Strict schema: every bullet is `{ text, run_ids (min 1 item) }`, sections open_threads / whats_landed / watch_for / data_limits.
- **Edit `config/models.json`** — optional `"profile"` entry (`modelFor` falls back safely without it).
- **New `scripts/test-profile-synthesis-guard.js`** — citation-guard tests; register in `scripts/run-tests.js`.

## Guards (code, not prompt trust — the profile's analogue of the engagement guard in reviewer.js)
- Fewer than 2 finished runs → no model call; the honest stub stays.
- Any bullet citing a run id the person doesn't actually have is dropped. An emptied section says "Nothing established yet." Everything dropped → stub + a rejection note in profile.json.
- Model/key failure → profile still writes with the stub + a warning; live runs never break.

## Not in this phase
- Feeding the profile into the NEXT session's questions (that's option B — a separate project).

## Done when
- [ ] Multi-run people get a synthesis where every line is traceable
- [ ] Thin people and failure cases stay honest
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Maya's synthesis** — rebuild her profile. The "How to help them" section should read sensibly, and every bullet should name run ids that appear in her own run table above. ❌ Not OK if a bullet has no run reference or references a run not in her table.
2. **Honest about limits** — the data-limits line should call out the thin spots (e.g. an axis that was rarely read), not gloss over them.
3. **Thin person** — rebuild someone with 1 run. They keep the "not enough yet" stub and no model cost shows up for them.
4. **No key, no break** — with the API key unset, rebuilding still writes the profile (stub + warning), and finishing a live run still works as normal.

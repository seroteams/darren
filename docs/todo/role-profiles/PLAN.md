# Role Profiles — job-title + seniority context in every stage

**Goal:** Every 1:1 run feels grounded in the report's exact job title and seniority — prep, questions, and the brief all draw on a saved role profile instead of two bare strings.
**Driver:** Carl
**Created:** 2026-06-11

## Done means
- Entering a role + seniority once creates `data/role-profiles/<role>--<seniority>.json` (known issues, question themes, terminology for that job).
- Every later run with the same role + seniority reuses it instantly — no new AI call, no extra cost.
- The role context is visible in the prompts of all 5 stages (focus points, prep, question bank, per-turn planner, final brief) and the brief reads role-grounded.
- Bi-weekly / feels-off meetings never see competency items from the profile (focus-arc rule holds).
- `npm run smoke`, `npm run gate`, `npm run eval` all green.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Core module + prompt + config | Role profiles can be generated, cached on disk, and rendered — nothing wired into the pipeline yet | ✅ |
| 2 | Inject into all 5 stages | `{{ROLE_PROFILE_BLOCK}}` in every stage prompt, with safe fallback | 🔨 |
| 3 | Intake wiring + live runs | Profile generated/loaded automatically at setup (CLI + web) | 🔨 |
| 4 | Gates, smoke scenario, eval rules | New trust gates + automated checks lock the behaviour in | 🔨 |

⬜ not started · 🔨 built, awaiting product-owner QA · ✅ done (tested)

## Current state
All four phases are built and machine-verified (Carl green-lit Phase 1 and asked for the rest in one go on 2026-06-11). `npm test` 19/19, smoke 29/29 on the new SRE scenario, `npm run eval` green. Remaining: product-owner walkthrough of the phase 2–4 scenarios (phase-3 scenario 2 — cached second run — is the key one for the "saved for later use" promise), then flip statuses to ✅. Final gate run: 7/7 PASS (leak-devon had failed earlier in the day from the pre-existing per-turn-note passthrough work — borderline case, separate task chip raised and still open).

Added 2026-06-12 (Carl's request): every run's log folder now gets `00b-role-profile/profile.json` — the exact profile the run used — even on cache hits. Implemented in `snapshotToSession` (src/role-profile.js); covered by a smoke check and 3 offline checks, verified live.

Parked follow-ups (optional): title-spelling normalization map, profile library UI, `--refresh-role-profile` flag. Watch prep `attempts` over the next few real runs — profile context should reduce retry rate, not raise it.

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

## Status
**✅ ALL 4 PHASES DONE + SIGNED OFF (2026-06-15).** Phase detail and sign-off evidence live in
git history. Folder ready to move to `docs/todo/done/`. Code in `7b8921a`.

Parked follow-ups (optional): title-spelling normalization map, profile library UI,
`--refresh-role-profile` flag. Watch prep `attempts` over the next few real runs — profile context
should reduce retry rate, not raise it.

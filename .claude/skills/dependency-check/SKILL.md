---
name: dependency-check
description: "Always check what ELSE must change when building a new feature or updating an existing one. Trigger on ANY feature build, feature update, or behavior change — before writing code AND again before calling it done. A feature isn't finished when its own file works; it's finished when every screen, engine stage, test page, and content file that should know about it actually does. Example miss this skill exists to prevent: building a new 'promises' feature but the test-engine page never shows it."
user-invocable: true
---

A new feature never lives alone. Before building, map who else needs to know; before saying "done", prove they do.

## Step 1 — Map the touchpoints (BEFORE coding)

Ask for the new/changed thing: **who reads it, who shows it, who stores it, who tests it?**
Sweep this checklist — it's the known blast-radius map for this repo:

- [ ] **Both apps** — `admin/` AND `frontend/` share many stages. A screen change in one usually needs the other (see the two-apps memory — member-home.js, runs.ts, routing).
- [ ] **Test / QA surfaces** — the test-engine page (`admin/src/stages/test.js` + `admin/src/stages/tests/`), replay scripts, persona runs. If the engine gains a stage or output, the test page must include it.
- [ ] **Engine catalogues & types** — `backend/engine/meeting-types.ts`, one-on-one types, gates (e.g. FOCUS_ARC_LEAK). New data through the pipeline = every stage's prompt/parse that touches it.
- [ ] **DB & API** — `backend/db/schema.ts` + migration, the repo/service/controller chain, `/api/v1/` routes both apps call.
- [ ] **Content files** — `content/scenarios/batch/` + `_index.json`, `content/questions/`. Scenario JSONs reference meeting types by id — removing/renaming one orphans them.
- [ ] **Emails & notifications** — notifications service, templates.
- [ ] **Trackers & founder docs** — STATUS.md, SERO_BOARD.md, how-it-works deck, changelog (the phase-close skill covers these on green light).

Actually grep for consumers — don't map from memory:
`grep -r "<feature/type/field name>"` across `admin/ frontend/ backend/ content/ scripts/`.

## Step 2 — Say the map out loud

In the reply (or the plan.md if it's a Darren-Method build), list the touchpoints found:
"This touches: X, Y, Z. Not touched: A (because …)." One short list — Carl sees the blast radius before code moves.

## Step 3 — Verify before "done" (AFTER coding)

- [ ] Re-run the grep — any consumer of the old shape left unupdated?
- [ ] Open/render the dependent surfaces (the real screen, not just the code) — the "verify the destination, not the code" rule applies.
- [ ] Free checks first: `npm test`, `npm run typecheck`, `node scripts/test-question-integrity.js` when content moved.

## Rules

- [ ] Never call a feature done when only its own file changed and it plausibly has consumers.
- [ ] If a touchpoint is deliberately skipped (out of scope), SAY so and park it — don't silently leave it stale.
- [ ] This rides along with the darren-method skill: the touchpoint map belongs in plan.md's phase scope.

# Phase 2 — Finish the v1 migration in shared/api.js

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
Every call the app makes goes to the real `/api/v1/` API — no screen depends on a legacy alias any more.

## Changes
All in `shared/api.js` — switch these 13 calls to their v1 twins (same handlers server-side, so behaviour is identical):

| Function | Old path | New path |
|---|---|---|
| getMeetingTypes | /api/meeting-types | /api/v1/meeting-types |
| getArcs | /api/arcs | /api/v1/arcs |
| getPersonaBench | /api/persona-bench | /api/v1/personas |
| getRoleLexicons | /api/role-lexicons | /api/v1/role-lexicons |
| addRoleLexiconTerm | /api/role-lexicons/term | /api/v1/role-lexicons/term |
| removeRoleLexiconTerm | /api/role-lexicons/term/remove | /api/v1/role-lexicons/term/remove |
| hideRoleLexiconTerm | /api/role-lexicons/term/hide | /api/v1/role-lexicons/term/hide |
| unhideRoleLexiconTerm | /api/role-lexicons/term/unhide | /api/v1/role-lexicons/term/unhide |
| runRegression | /api/regression/run | /api/v1/regression/run |
| suggestFix | /api/suggest-fix | /api/v1/suggest-fix |
| getPipelineStatus | /api/pipeline/status | /api/v1/pipeline/status |
| getLexiconPromotePending | /api/lexicon/promote/pending | /api/v1/lexicon/promotions/pending |
| submitLexiconPromote | /api/lexicon/promote | /api/v1/lexicon/promotions |

Watch-out: v1 wraps **errors** in one standard shape — confirm the shared `json()` helper and these callers don't parse legacy error bodies.

## Not in this phase
- No server-side changes. The legacy routes stay until Phase 3.
- `/api/version` stays as-is (no v1 twin).

## Done when
- [ ] `grep '"/api/' shared/api.js` shows only `/api/v1/` + `/api/version`.
- [ ] Free checks green: `npm test`, `npm run typecheck`, admin build.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
API on 3001, Vite on 3000, logged in as admin. **All free — nothing here calls OpenAI** (don't click ▶ Run in the Test engine).
1. **Meeting arcs** — open Meeting arcs. The arc list loads and you can open one. ❌ Not OK if the list is empty with an error.
2. **Job lexicons** — open Job lexicons. Roles load; add a test term, then remove it. Both stick.
3. **Test engine safety strip** — open Test engine. The free safety-check strip loads (that's the regression call).
4. **Start page** — open the start/admin home page. Recent runs + pipeline status load without errors.
5. **New 1:1 works** — start a new session from intake: meeting types appear in the dropdown.
6. **Console is clean** — with devtools open, no red failed `/api/...` requests anywhere above.

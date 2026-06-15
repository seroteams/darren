# Phase 1 — Icon + browse

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
A new "Job lexicons" icon in the left rail opens a page that lists every job we have and its words. Read-only.

## Changes
- `frontend/client/src/state.js` — add a `ROLE_LEXICONS` stage.
- `frontend/client/src/router.js` — give it a URL (`/job-lexicons`).
- `frontend/client/src/main.js` — load the new page module.
- `frontend/client/src/ui/app-nav.js` — new left-rail item "Job lexicons" with its own icon (distinct from Phrase library's), plus active-state wiring.
- `frontend/client/src/ui/stage-labels.js` — display name "Job lexicons".
- `frontend/client/src/stages/job-lexicons.js` — NEW page: fetch the list, show each job and its words.
- `frontend/client/src/api.js` — `getRoleLexicons()`.
- `src/role-profile.js` — `listRoleProfiles()`: read every valid `data/role-profiles/*.json`, return role + level + words (skips broken / old-version files).
- `frontend/server/handlers/role-lexicons.js` — NEW read handler (`GET /api/role-lexicons`).
- `frontend/server/server.js` — register the route.

## Not in this phase
- Adding or removing words (Phase 2).
- Your words reaching a live run (Phase 3).

## Done when
- [ ] A new "Job lexicons" icon shows in the left rail and opens its page.
- [ ] The page lists all the jobs we have, each with its words.
- [ ] Existing nav items (Home, Phrase library, etc.) still work.
- [ ] No errors in the browser console.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **The icon is there** — look at the left rail. You should see a new "Job lexicons" item (hover to see the label), separate from "Phrase library". ❌ Not OK if there's no new item, or it replaced Phrase library.
2. **It opens the page** — click it. You should land on a page about job words, listing jobs (UX Lead, Senior backend engineer, etc.), each with its words and short meanings. ❌ Not OK if the page is blank or errors.
3. **All jobs show** — you should see roughly 14 jobs (everything valid in the library). Each shows its words, or says "no words yet" if it genuinely has none. ❌ Not OK if jobs that have words show none.
4. **Nothing else broke** — click Home, Phrase library, Compare runs. They should all still work, and the new item should highlight only when you're on it.
5. **Direct link holds** — refresh the browser while on Job lexicons. It should reopen the same page, not bounce you to Home.

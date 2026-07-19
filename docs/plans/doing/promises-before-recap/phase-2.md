# Phase 2 — Memory & guests

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Locked promises survive a reload, guests get the same agreement moment, and the recap's "What to do next" shows what was actually agreed.

## Changes
- `backend/api/services/sessions/session-views.ts` — `snapshot()` += `promises: s.promises ?? null` (+ test).
- `admin/src/main.js` — `rehydrateById` maps `snap.promises`; `promisesConfirmed: snap.promises != null` (empty locked list = valid "confirmed none").
- `admin/src/stages/briefing.js` — recap's "What to do next" renders `store.promises` grouped by owner ("You promised" / "{Name} promised", manager first, copyable rows) with the `next_actions` read-only list as fallback; `formatBriefingForCopy` uses promises with owner prefixes when present.
- Guest lane: gate already dropped `store.user` in Phase 1 — verify guest POST works end-to-end; POST failure fails soft (list kept in `store.promises`, quiet "couldn't save" note).

## Not in this phase
- PDF (Phase 3). Gallery walk (Phase 4).

## Done when
- [ ] Reload after locking lands on the recap with the locked list — verified against the API snapshot (the DESTINATION), not the UI alone.
- [ ] Guest run saves promises (check `GET /sessions/:id` snapshot carries them).
- [ ] `npm test` + `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
`local > admin (email+pass) > run a 1:1, lock in promises`
1. **Memory** — after locking, refresh the browser. You should land on the recap with "What you agreed" showing your locked list. ❌ Not OK if the promises page shows again.
2. **Recap shows the agreement** — in the recap, "What to do next" should show two groups: *You promised* / *{Name} promised* — your edited wording, not Sero's originals.
3. **Guest gets it too** — `local > incognito window > guest run` to the end. The promises page should appear; lock in; recap shows your list.
4. **Skip fallback** — a run where you skip: the recap should show Sero's suggested actions as before (read-only).

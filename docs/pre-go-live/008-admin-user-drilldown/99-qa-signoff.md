# Phase 008 — QA sign-off (Carl walks this)

**You test each scenario. The next step (03) doesn't start until you green-light this.** Free — no OpenAI.

## Scope of this sign-off
Steps **01–02 are built** (per-user runs read + the drilldown screen). Step **03** (open a run's briefing
read-only) is **not built yet** — it's the last piece and starts only after you green-light the walk below.

## Automated (I run these and paste results)
- [x] `npm test` **58/58** files green · `npm run typecheck` clean.
- [x] Service tests: a user's runs come back newest-first; an unknown user → empty list (not an error).
- [x] **Route bug caught + fixed here:** the per-user route was registered as a string `":id"` pattern and
  404'd on every real id; switched to the named-group regex the sibling routes use — verified live it now
  gates (401) instead of 404. Guarded by a new `backend/api/router.test.ts` so it can't regress.

## The walk (as the superadmin — Carl's account, `carl@seroteams.com`)
1. From **Registered** (Phase 007), each user row is a **button** — click one.
2. Their detail page opens at `/admin/users/:id` showing:
   - their **people** — grouped the same way as the manager's Team (Phase 004), and
   - their **1:1s** — newest-first, each with its **★ rating** where rated (Phase 003).
3. **Back** returns you to Registered.
4. Loading / empty (a user with no runs) / error states behave.

## The walk (as a normal owner/manager — NOT you)
5. No **Registered** nav item, so no way in by clicking.
6. Hitting `/admin/users/:id/runs` (or the screen route) directly is **refused** (403) — the real wall.

## Not in this sign-off yet
- **Step 03** — opening a run to read its briefing read-only (reuses the Phase 002 view). Built after this
  green light.

## Carry-forward (unchanged — before the alpha widens)
- Human-expert review must cover the superadmin key · close anon `POST /api/v1/sessions` · privacy-note
  disclosure that an internal admin can view a company's data across companies.

## Sign-off
- [ ] **Carl:** scenarios 1–6 pass → I build Step 03, then close PG8 (set → done, tick STATUS + the board, commit).

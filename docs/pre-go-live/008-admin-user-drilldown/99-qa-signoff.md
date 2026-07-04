# Phase 008 — QA sign-off (Carl walks this)

**You test each scenario. Green-light this and PG8 closes.** Free — no OpenAI.

## Scope of this sign-off
All three steps are **built**: per-user runs read (01), the drilldown screen (02), and opening a run's
briefing **read-only** (03). This is the final walk — scenario 7 is the Step 03 check that was pending
last time.

## Automated (I run these and paste results)
- [x] `npm test` **60/60** files green · `tsc --noEmit` clean (2026-07-04).
- [x] Service tests: a user's runs come back newest-first; an unknown user → empty list (not an error).
- [x] Step 03 service tests: `runDetail` returns one finished run's read-only briefing; an unknown/unfinished
  run → null → the controller turns that into a 404.
- [x] **Route bug caught + fixed here:** the per-user route was registered as a string `":id"` pattern and
  404'd on every real id; switched to the named-group regex the sibling routes use — verified live it now
  gates (401) instead of 404. Guarded by `backend/api/router.test.ts` so it can't regress.

## The walk (as the superadmin — Carl's account, `carl@seroteams.com`)
1. From **Registered** (Phase 007), each user row is a **button** — click one.
2. Their detail page opens at `/admin/users/:id` showing:
   - their **people** — grouped the same way as the manager's Team (Phase 004), and
   - their **1:1s** — newest-first, each with its **★ rating** where rated (Phase 003).
3. **Back** returns you to Registered.
4. Loading / empty (a user with no runs) / error states behave.
7. **Step 03 — open a briefing read-only:** click one of the user's 1:1s. Its briefing opens **read-only**
   (the same view the manager saw — no editing). **Back** returns you to that user's list. ❌ Not OK if it
   fails to open, or shows editable controls, or leaks another company incorrectly.

## The walk (as a normal owner/manager — NOT you)
5. No **Registered** nav item, so no way in by clicking.
6. Hitting `/admin/users/:id/runs` or `/admin/runs/:id` directly is **refused** (403) — the real wall.

## Carry-forward (unchanged — before the alpha widens)
- Human-expert review must cover the superadmin key · close anon `POST /api/v1/sessions` · privacy-note
  disclosure that an internal admin can view a company's data across companies.

## Sign-off
- [x] **Carl:** **closed on Carl's call 2026-07-04 ("close pg8").** The Step 03 read-only walk (scenario 7)
  was **skipped by Carl's decision** — technical verification stands: `runDetail`/`getAdminRun` wired
  end-to-end, the gated route returns 401 (not 404) live, `npm test` 60/60. PG8 set → done. PG9 remains the
  last open pre-go-live phase.

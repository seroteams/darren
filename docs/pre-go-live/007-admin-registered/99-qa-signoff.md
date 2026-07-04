# Phase 007 — QA sign-off (Carl walks this)

**You test each scenario. The next phase doesn't start until you green-light this.** Free — no OpenAI.

## Automated (I run these and paste results)
- [ ] `npm test` green · `npm run typecheck` clean.
- [ ] Tests: the per-user run stats + alpha summary derive correctly (fake repo, fixed `now`); **a normal
  owner still gets 403** on `/api/v1/admin/registered`; no `password_hash` in the payload.

## The walk (as the superadmin — Carl's account)
1. A **"Registered"** item appears in the admin nav; open it.
2. The page lists **every alpha company** and, under each, its **users** — name, role, joined date, run
   count, last active, this-week / last-week.
3. The **alpha rating summary** shows up top (avg stars over N runs, count of low scores).
4. Loading / empty (no companies yet) / error states behave.

## The walk (as a normal owner/admin — NOT you)
5. The "Registered" nav item is **not shown**.
6. Even hitting `/admin/registered` (or the endpoint) directly is **refused** — the nav hiding is cosmetic;
   the 403 is the real wall.

## Intentionally NOT here yet
- Drilling from a user into their people and their runs → **PG8**.

## Carry-forward (unchanged from PG6 — before the alpha widens)
- Human-expert review must cover the superadmin key · close anon `POST /api/v1/sessions` · privacy-note
  disclosure that an internal admin can view a company's data.

## Sign-off
- [ ] **Carl:** all pass → I approve PG7, set it → done, tick STATUS + the board, and commit.

# Phase 009 — QA sign-off (Carl walks this)

**You test each scenario. PG9 (and the pre-go-live track's build) closes when you green-light.** Free — no OpenAI.

## What was built
A light per-manager **alias map** on top of the auto-built Team (no DB migration): **merge** two cards for
the same person into one, and **rename** a person. Rating roll-ups already combine once runs share a person.

## Automated (I run these and paste results)
- [x] `npm test` **60/60** · `npm run typecheck` clean · admin build green.
- [x] Service tests (fake repo): merge folds a key, collapses a chain to one canonical key, rejects a
  self-merge and a cycle, requires both keys; rename sets a display name on the canonical key and a blank
  name clears it.
- [x] Routes verified live: `GET /api/v1/team/aliases`, `POST /api/v1/team/merge`, `POST /api/v1/team/rename`
  all **401 when logged out** (member-safe + user-fenced; the two POSTs are origin-guarded).

## The walk (as a manager — a member login with a few 1:1s)
1. Open **Team**. You see your people, each with meetings / last met / average.
2. Click **Tidy up**. Each person now shows **Rename** and a **Merge into…** dropdown.
3. **Rename** someone (e.g. "Priya" → "Priya Sharma"). The card updates; open their **person page** — the new
   name shows there too.
4. **Merge** a duplicate: on "Priya S.", pick "Priya" in *Merge into…* → confirm. The two cards become **one**,
   and its meeting count + average is the **combined** total.
5. Open the merged person's page — it lists **every** 1:1 that folded in (both names' meetings).
6. **It sticks:** reload the app and re-open Team — the rename and merge are still there (**verify the
   destination**, not just the screen).
7. Click **Done** to leave Tidy-up; cards navigate to the person page as normal.

## Not in this phase (parked)
- Manual roster ("add a person ahead of time"), search/filter, trend sparkline — post-alpha unless a real
  manager asks. Un-merge (splitting a merge back apart) is a follow-up.

## Sign-off
- [ ] **Carl:** scenarios 1–7 pass → PG9 ✅, and with PG8 that closes the pre-go-live build. Tick STATUS +
  the board + badges, refresh the how-it-works changelog, and move the folder toward close-out.

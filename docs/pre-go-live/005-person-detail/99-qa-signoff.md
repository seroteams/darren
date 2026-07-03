# Phase 005 — QA sign-off (Carl walks this)

**You test each scenario. The next phase doesn't start until you green-light this.** Free — no OpenAI,
*as long as you don't run a full pipeline from "Prep next 1:1"* (see the ⚠️ note below).

## Automated (I run these and paste results)
- [x] `npm test` green · `npm run typecheck` clean. — **2026-07-04: 53/53 passed · typecheck clean.**

## The walk (as a member with past 1:1s — e.g. `demo@sero.test`)
1. On **Team**, click a person card → **their page** opens: name · role · total meetings · last met ·
   average stars (with count).
2. A person with 3 1:1s → all 3 rows show, newest first, each with its ★ rating; the header average is right.
3. **"Since last time"** shows the latest 1:1's agreed actions + watch-fors — and matches that run's detail.
4. A person whose latest 1:1 has neither actions nor watch-fors → **no "Since last time" block** (not an
   empty heading).
5. Click a row → the **read-only** briefing opens (PG2). A foreign/bad run id still → the "couldn't open" card.
6. The fence holds — you only ever see **your own** 1:1s for that person.
7. A bogus URL like `/team/nobody` → the friendly "no 1:1s with this person yet" card, not a crash.

## ⚠️ Money check (do this deliberately)
8. **"Prep your next 1:1 with <name>"** opens intake with the name/role pre-filled — **and spends nothing**.
   Confirm you land on the intake form. **Do NOT run the full pipeline** during QA unless you mean to — that
   (and only that) is a paid run, same as starting any 1:1. Opening/seeding the form is free.

## Intentionally NOT here yet
- Full cross-session "remembering" (person-profiles, auto-injecting prior context into the engine) → stays
  deferred. This phase surfaces last-time's actions/watch-fors on the page only.
- Merging genuine duplicates ("Priya" vs "Priya S.") → **PG9**.

## Sign-off
- [x] **Carl:** all pass → PG5 approved (2026-07-04, "looks good commit"). PG5 set → done, STATUS + board
  ticked, changelog refreshed, committed.

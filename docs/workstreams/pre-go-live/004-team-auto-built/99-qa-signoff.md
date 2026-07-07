# Phase 004 — QA sign-off (Carl walks this)

**You test each scenario. The next phase doesn't start until you green-light this.** All free — no OpenAI.

## Automated (I run these and paste results)
- [x] `npm test` green · `npm run typecheck` clean. — **2026-07-04: 53/53 passed · typecheck clean.**

## The walk (as a member with past 1:1s — e.g. `demo@sero.test`)
1. Open **Team** → a card per person you've met with: name · role · times met · last met · average stars
   (with count).
2. Two 1:1s with the same person (incl. different casing) → **one** card, count = 2, correct average.
3. A person with a single 1:1 → "1 meeting · not yet rated" (no fake history).
4. A manager with **no** runs → the friendly empty state.
5. The nav + page now read **"Past 1:1s"** (not "Runs"); admin screens unchanged.

## Intentionally NOT here yet
- Clicking a person card opens their page → **PG5**. Merging genuine duplicates ("Priya" vs "Priya S.") →
  **PG9**.

## Sign-off
- [x] **Carl:** all pass → PG4 approved (2026-07-04). PG4 set → done, STATUS + board ticked, committed.

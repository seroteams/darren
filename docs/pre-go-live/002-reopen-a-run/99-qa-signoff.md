# Phase 002 — QA sign-off (Carl walks this)

**You test each scenario. The next phase doesn't start until you green-light this one.** All free — no OpenAI.

## Automated (I run these and paste results)
- [ ] `npm test` — green (no backend change). `npm run typecheck` — clean.

## The walk (in the app, as a member with ≥1 finished 1:1)
1. **Open one.** On **Runs**, click a row → the past 1:1 opens read-only: who it was about, and the
   briefing (What stood out / What we understood / Honest read / What to do next / Reminders).
2. **Back.** "Back to Runs" returns to the list.
3. **Keyboard.** Tab to a row, press Enter → it opens. (Focus ring visible.)
4. **Deep link.** Paste `/runs/<that id>` in the URL → it opens the same detail (not bounced).
5. **Fence holds.** Paste `/runs/<some other id you don't own>` → a plain "couldn't open this 1:1" card,
   never someone else's briefing.
6. **Nothing broke.** The empty Runs state (a member with none) still shows; admin screens unchanged.

## Intentionally NOT here yet
- No rating stars — **PG3**. The page/nav still say "Runs" — the "Past 1:1s" relabel is **PG4**.
- The "Since last time" carry-forward block is **PG5**.

## Sign-off
- [ ] **Carl:** all pass → I approve PG2. On your tick I set PG2 → done, tick STATUS + the board, and commit.

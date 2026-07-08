# Phase 003 — QA sign-off (Carl walks this)

**You test each scenario. The next phase doesn't start until you green-light this.** All free — no OpenAI.

## Automated (I run these and paste results)
- [ ] `npm test` green (incl. the 5 rating tests) · `npm run typecheck` clean.

## The walk (as a member with a finished 1:1)
1. **Rate on the detail.** Open a past 1:1 → set ★★★★☆ ("Did this help you run the 1:1?") → reload → the
   stars persist. Change it → it updates.
2. **Low-score note.** Set ★★☆☆☆ → a "What missed?" line appears; add a note → it saves.
3. **In-flow.** Finish a fresh 1:1 → a gentle rate prompt appears at the end; **Skip** dismisses it with no
   nag; rating (if given) shows on the run.
4. **List badge.** The Runs list shows a star badge on rated rows; unrated rows read clean (no guilt count).
5. **Keyboard/screen-reader.** The stars are operable by keyboard; text is ≥14px.
6. **Private + fenced.** The note never appears in any employee-facing view; rating another member's run
   id → refused (404).
7. **You (admin) can see ratings** — confirmed later when PG7/PG8 surface them across the alpha.

## Sign-off
- [ ] **Carl:** all pass → I approve PG3. On your tick I set PG3 → done, tick STATUS + the board, and commit.

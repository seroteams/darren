# Phase 001 — QA sign-off (Carl walks this)

**You test each scenario below. The next phase does not start until you green-light this one.**
Everything here is free — no OpenAI calls. If anything fails, tell me and I fix it before we move on.

## Before you start
- Baseline was recorded at phase start: `npm test` and `npm run typecheck` both green.
- Run the dev app the usual way (member login). No paid runs involved.

## Automated checks (I run these and paste results)
- [ ] `npm test` — green (same as baseline; no backend change expected).
- [ ] `npm run typecheck` — clean.

## The walk (you do these in the app)
1. **A manager with runs sees them.**
   - [ ] Log in as a member who has finished at least one 1:1 (created while logged in).
   - [ ] Open **Runs** → you see a real list, not the "No runs yet" card.
   - [ ] Newest is at the top.
   - [ ] Each row reads plainly: who it was about · role · meeting type · how long ago
     (e.g. `Priya · Senior Engineer · One-on-one · 2d ago`).

2. **The empty state still works.**
   - [ ] Log in as a member with **no** finished runs (or a brand-new account).
   - [ ] Open **Runs** → the friendly "No runs yet… Start your first one" card shows.
   - [ ] The **Start a 1:1** button still starts a new prep.

3. **The fence holds — you only see your own.**
   - [ ] Log in as member A (with runs), note the list. Log out.
   - [ ] Log in as member B → you see **B's** runs only, never A's, never a whole-company list.

4. **Error state is graceful.** (optional — only if easy to simulate)
   - [ ] If the list can't load, the page shows a plain "Couldn't load your 1:1s" message —
     not a blank screen or a raw error.

5. **Nothing nearby broke.**
   - [ ] The admin **Library** (whole-company list) is unchanged for admin accounts.
   - [ ] The Home page and starting a new 1:1 still work.

## What is intentionally NOT here yet (so it's not mistaken for a miss)
- Rows aren't clickable — **re-opening a run is Phase 002**.
- No rating stars — **Phase 003**.
- The page is still titled **"Runs"** — the "Past 1:1s" relabel lands in **Phase 004**.
- 1:1s created before login / via the dev side-door / anonymously won't appear (no `userId`).
  That's the documented cutover, not a bug.

## Sign-off
- [ ] **Carl:** all of the above pass → I approve Phase 001. Move to Phase 002.

When you tick that, I'll: set Phase 001 → `done` in PROGRESS, tick STATUS.md + the build board,
refresh the how-it-works changelog, and commit locally.

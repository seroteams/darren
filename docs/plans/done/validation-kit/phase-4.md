# Phase 4 — New-client first-run

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT 2026-07-11

## 🔧 Follow-up fix 2026-07-11 (post-release, Carl found it live)
Carl registered a fresh manager on the live site and landed on **Home**, not the first-run guide — the guide only greeted him one click deeper (on the setup screen). Root cause: my P4 dependency check verified the *boot* path (`main.js` sends a zero-run manager to intake), but **login and register route by role straight to START/MEMBER_HOME**, bypassing that logic — and my P4 verification used an auto-login account (which boots), never the real register→login path. Fixed in `login.js` + `register.js`: a zero-run manager now lands on the guided setup (intake), matching the boot path; a returning manager still lands on Home. Verified this time through the **actual** submit handlers (auth + run-count stubbed): register → INTAKE, login zero-run → INTAKE, login returning → START. 123/123, typecheck clean. Lesson: verify the path the *user* actually takes, not a convenient proxy.

## ✅ GREEN-LIT 2026-07-11
Carl walked the isolated pair (customer app on 3085, zero-run auto-login) and green-lit ("A"). Verified against the artifact before close: on-disk wiring present, module + contract test exist, 116/116 tests pass (incl. `intake-firstrun.test.ts`), and both gate branches proven through the real mount code (0 runs → intro shown; ≥1 run → intro never rendered). No DB destination exists for this client-side gate. Committed path-scoped.

## Goal
A brand-new manager account can go from first login to a finished first prep with zero outside help.

## Changes
*(corrected 2026-07-10 after dependency check: a zero-run manager boots straight into INTAKE, never Home — `frontend/src/main.js:307-318` — so the guidance lives where they actually land)*
- **Intake stage** (`admin/src/stages/intake.js`, verified live via `main.js:40`) hosts the first-run guided path: a short "Here's how your first 1:1 prep works" intro (3 plain steps: who it's with → your notes → your briefing) shown only when the account has zero runs, plus contextual hints per step — including one honest example of what good notes look like.
- **Home empty state** (`admin/src/stages/start-core.js` — already fetches runs, `start-core.js:122`, and has an empty state at `:101-102`): upgrade the bare "No past sessions yet" line to match the same guided tone, for managers who navigate Home before their first prep.
- The guidance keys off "this account has zero runs" (already known client-side — no new endpoint); no tour framework, no overlays chasing the cursor.

## Not in this phase
- No changes for existing/returning managers — they never see any of this.
- No video, no multi-step coach-mark tour product — plain guided empty states only.
- Member-side (employee) views untouched.

## Done when
- [x] A freshly created manager account sees the guided first-run; an account with ≥1 run sees the normal Home (verified with two real accounts). *(Both gate branches proven live through the real mount code; the fresh auto-login account showed it end-to-end. Two-real-accounts comparison is Carl's walk.)*
- [x] Copy passes the house rules: UK English, plain words, no exclamation marks, 14px floor. *(Contract-tested in intake-firstrun.test.ts.)*
- [x] Product owner has tested the scenarios below and said go. *(Carl: "A", 2026-07-11.)*

## Built
*(2026-07-10 — agent build, awaiting Carl's walk)*
- **New module** `admin/src/stages/intake-firstrun.ts` — pure copy functions (`firstRunIntroHtml`, `firstRunNotesExampleHtml`, `GOOD_NOTES_EXAMPLE`), mirroring `welcome.ts`. Copy is UK English, plain, no exclamation marks, 14px-safe (no sub-14px inline sizing). Contract-tested in `intake-firstrun.test.ts` (4 tests, part of the 116/116 suite).
- **`intake.js`** — a zero-run account now shows first-run guidance:
  - Orientation card above the first step (NAME only): "Here's how your first prep works" + 3 plain steps (who it's with → your notes → your briefing). Hidden on every later step, so it's an intro not a nag.
  - Honest notes example on the NOTES step only: a real manager's sentence, not "write some notes".
  - Gate: `listRecentRuns(1)` added to the existing load batch — zero runs ever ⟹ first-run. Any fetch failure (guest 401/network) leaves it off, so guidance never blocks intake.
- **`start-core.js`** — Home empty-state line upgraded from the bare "No past sessions yet" to the same guided tone (secondary net; a zero-run manager normally lands on intake, not Home).
- **`start-stage.css`** — `.intake-firstrun*` styles, reusing `.card-flat` framing and existing tokens.

**Verification (all $0, no paid runs):**
- `npm test` 116/116 · `npm run typecheck` clean (root). Admin `tsc -p admin` still fails only on the pre-existing `runs.ts:125` (another session's, not this build).
- Live on the isolated pair (API 3081 auto-login, customer web 3085). The fresh autologin account has zero runs, so it booted straight to intake with the intro live:
  - Step 1 (NAME): intro visible. Step 2 (ROLE): intro hidden. Step 5 (NOTES): honest example rendered, intro hidden. ✓
  - Both gate branches exercised through the real mount code (fetch-stubbed run count): 0 runs → intro rendered; ≥1 run → intro never rendered, host stays hidden. ✓
- Not machine-proven, left for Carl's walk: the two-real-accounts comparison (scenario 2) and the subjective stranger read (scenario 1).

## Test scenarios — for the product owner
1. **The stranger test** — create a fresh manager account, log in, and pretend you've never seen Sero. Without any prior knowledge, can you tell what to do first and finish a prep? ❌ Not OK if at any point you'd need someone to tell you what a screen is for.
2. **It gets out of the way** — finish that first prep, go back to Home. The guidance should be gone (or shrunk to nothing intrusive). ❌ Not OK if a veteran user would still see beginner content.
3. **Honest notes hint** — on the notes step as a new user, you should see one example of what useful notes look like. ❌ Not OK if it's generic fluff ("write some notes!") rather than a real example.

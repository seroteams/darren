# Phase 2 — Outcome capture ("did it happen?")

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 BUILT — awaiting Carl's walk (not committed; green light = commit) · **Cost:** $0

## Goal
When you return to a person, each agreed action from last time gets a one-tap answer — **yes /
partly / no / changed** — recorded as a plain fact the rest of the plan runs on (this is the
consumer for the `outcomeCheck` contract the no-inference spec seeded).

## Changes
- Data: per-action outcome records tied to the prior run + person (store where runs live today;
  verify at the destination, not the routing). Shape: action text (as agreed), answer, when, by whom.
- UI: on the "Since last time" block (Phase 1) and the person page, each agreed action shows the
  four taps. Optional, skippable, changeable.
- The person page's thread now shows each past action with its outcome mark.
- Tests first: save/overwrite/fence + "skipped stays blank".

## Not in this phase
- The engine still doesn't read outcomes (Phase 3 feeds them in).
- No streaks/trends ("rolled over 3 times") — parked until after Phase 3.

## Built (2026-07-06) — as delivered
- **Store:** an `outcomes.json` sidecar in the prior run's folder (mirrors the `rating.json`
  pattern — atomic temp-then-rename write), keyed by the action's index → `{ action, answer,
  answeredBy, updatedAt }`. Only answered indices are stored, so a skip leaves no entry.
  Proven at the destination: real repo file I/O writes the sidecar, a change-of-mind overwrites
  the same index (latest wins, `createdAt` preserved), a skipped index stays blank.
- **API:** `POST /api/v1/runs/mine/:id/outcomes` `{ index, answer, action? }` — member-safe,
  origin-guarded, org+user fenced (a run you don't own → 404, no write). Returns the merged map.
- **Read:** `memberRunView` now returns `outcomes` (via `outcomesOf`), so the person page shows
  the current marks; only the four valid answers are surfaced.
- **UI:** on the person page's "Since last time" block, each agreed action shows *Did this happen?*
  → Yes / Partly / No / Changed. The tap is marked active **only after** the server confirms the
  write; a failure shows an inline "couldn't save" and leaves the selection unchanged (no faked
  success). All tap text at the 14px floor.
- **Tests first (TDD):** 7 new service cases — record / overwrite / bad-answer 400 / bad-index 400
  / not-owner 404 / non-object 400 / write-fail 500. `npm test` **81/81** files green (runs.service
  now 40 cases); backend + admin typechecks clean.
- **Not built here:** the engine still doesn't *read* outcomes (Phase 3 feeds them in); no streaks.

## Done when
- [ ] Tapping an outcome saves it and it survives a reload (checked at the store, not the screen).
- [ ] Skipping is fine — nothing nags, nothing defaults.
- [ ] Outcomes visible on the person page next to their actions.
- [x] `npm test` + typechecks green (81/81 files · both typechecks clean; store proven on disk).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
All free.
1. **Tap and reload** — open a return-visit prep, tap "partly" on an agreed action, reload the page.
   The tap is still there. ❌ Not OK if it forgot, or if I only *claim* it saved — ask me to show the
   stored row/file.
2. **Change your mind** — tap "no", then tap "yes". Latest answer wins, shown everywhere.
3. **Skip it** — answer nothing and run the 1:1 anyway. No blocker, no warning, blank stays blank.
4. **The thread** — open the person's page. Last time's actions each show their outcome mark in
   plain words.
5. **Fence** — the QA/other-manager account can't see or set outcomes on your person's actions.

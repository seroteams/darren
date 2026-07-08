# Phase 3 — Changelog clarity

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
Make `docs/reports/sero-how-it-works.html` clearly a *manual founder-facing changelog* — a
"what shipped and when" story refreshed at each phase close — not a live status view
that pretends to update itself.

## Changes
- Add/adjust a one-line note in the changelog area: "Manually refreshed at each phase
  close. This is the story of what shipped — not live status (see STATUS.md)."
- Remove any wording that implies it updates on its own (the old "grows on its own" line
  was false).

## Not in this phase
- PROGRESS.md (Phase 2, already done) and CLAUDE.md (Phase 4).
- Redesigning the page — copy/labelling only, no layout work.

## Done when
- [ ] The changelog states it's manual and refreshed at phase close.
- [ ] No remaining claim that it self-updates.
- [ ] It points to STATUS.md for live status.
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Honest labelling** — open sero-how-it-works.html. It should read as "here's what we shipped," and say it's updated by hand at each phase close. ❌ Not OK if it still implies it keeps itself current automatically.
2. **Points home** — somewhere obvious it should tell you that for *where we are right now*, STATUS.md is the place.
3. **Still readable** — it should still look and read fine to you as the founder; this phase only changes wording, not the page's feel.

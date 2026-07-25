# Phase 9 — Triage the tester notes

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The Feedback inbox stops being a pile. Eleven real notes from real testers get read, answered or turned into work, and closed.

## Why it is a phase and not a chore
The inbox reads **11 new, 0 done, 0 archived**. Three of the notes are product signals nobody has acted on:
- "on my phone the Past 1:1s list cuts off the date on narrow screens" — a bug this audit could not catch, because the walk ran at 1440×900 only
- "Could the questions step remember my half-typed answer if I click away? Lost a long one today." — losing a manager's typed answer is the kind of thing that stops them coming back, which is the whole Gate 1 metric
- "The Team page took a while to load for me this morning, maybe 5-6 seconds" — worth confirming, since Team is the screen a manager lands on most

The rest are short "this is great" notes, which still deserve marking done.

## Changes
- Read all eleven in `local > admin > Feedback inbox`.
- For each: mark done, or write it up as a new item. Real bugs go into a follow-up plan rather than getting squeezed in here.
- **Reproduce the phone one properly** — a Playwright pass at 390×844 over the manager's screens, which this audit explicitly did not cover. If the date really does get cut off, that is a finding with a screenshot.
- **Check the Team load time** — time the `/api/v1/team/people` call and the render, and say plainly whether 5 to 6 seconds is real or was a one-off.
- Leave the inbox at 0 new.

## Not in this phase
- Fixing whatever the notes turn up, unless it is a one-liner. The point of triage is to know what is there.
- A full mobile audit. Reproducing one reported bug at phone width is not the same as auditing every screen at every width, and pretending otherwise would be dishonest.

## Done when
- [ ] All eleven notes are marked done or archived, and the inbox shows 0 new
- [ ] The phone report is either reproduced with a screenshot or shown not to reproduce, with the width tested stated
- [ ] The Team load time is measured, with the actual number given
- [ ] Anything real that came out of it is written up, so it is not lost again
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself.

1. **The inbox is clear** — `local > admin (audit.admin) > Feedback inbox`. It should show 0 new. ❌ Not OK if anything is still sitting unread.
2. **You know what was in them** — I will give you a short list: what each note said and what happened to it.
3. **The phone bug has an answer** — either a screenshot showing the cut-off date at phone width, or a clear "could not reproduce at 390px, here is what it looks like".
4. **The Team load time has a number** — not "it seems fine". An actual measurement.

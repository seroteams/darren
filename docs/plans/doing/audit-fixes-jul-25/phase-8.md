# Phase 8 — Team and Members become one screen

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
One people screen. A manager stops holding two meanings of "person" at once.

## The decision behind it
Carl chose the merge on 2026-07-25, over the cheaper option of just renaming both screens. This is the one item on the list that is a build rather than a fix, and it moves the invite flow, so it sits last: everything else lands and gets tested before the IA changes underneath it.

Today: **Team** is the roster of people you run 1:1s with (no login needed, from `people`). **Members** is the accounts that can log into the workspace (from `users` plus pending invites). They are adjacent in the nav, both are lists of people with avatars, and the same human can appear in both, which is exactly what makes it confusing.

## Changes
- **One screen, one list** — the roster is the list. Login access becomes a column on it, showing the four states already modelled in `buildRosterView`: none / invited / opened / joined.
- **Invite moves onto the row** — the Team row already has "Invite" and "Change". That becomes the single way access is granted, so there is no second screen to go to.
- **Accounts with no roster row still appear** — an admin, or a manager who was invited to the workspace but has nobody on their team, must not vanish. They surface as rows without 1:1 history, clearly marked as access-only.
- **The nav loses an item** — "Members" goes. "Team" gets the clearer name.
- **The role controls come with it** — including the Phase 4 rank check, which must still hold on the merged screen: a manager sees no role actions on an admin row.
- **`/members` keeps working** — it redirects to the merged screen rather than 404ing, since it is a URL that has been shared.

## Not in this phase
- Changing who may invite. Same permissions as today, just a different place to do it from.
- Changing the `admin` / `manager` / `member` roles.
- Deactivate and reactivate behaviour, beyond moving where the controls live.

## Done when
- [ ] Every account visible on Members today is visible on the merged screen, checked account by account against the API
- [ ] Every person visible on Team today is still visible, checked against the API
- [ ] Nobody appears twice
- [ ] An access-only account (an admin with no team) has a row and is not dropped
- [ ] A manager sees no role actions on an admin row (the Phase 4 wall still holds, re-verified here)
- [ ] `/members` redirects rather than erroring
- [ ] Inviting someone from a row still sends the email and still produces a working join link
- [ ] Screenshots of the merged screen, and of it as a manager versus as an admin
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. This is the last phase.

1. **One screen, everyone on it** — `local > customer (audit.manager) > the people item in the nav`. You should see your five team members AND the accounts that used to be on Members, in one list, nobody twice. ❌ Not OK if anyone is missing.
2. **You can tell who can log in** — each row should make it obvious whether that person has access, was invited, or is not on Sero at all.
3. **Inviting still works** — invite someone from a row. Check the email arrives and the join link opens.
4. **A manager still cannot touch an admin** — open the row actions on "Audit Admin". No role changes offered.
5. **The old link still works** — paste `/members` into the address bar. It should land on the merged screen, not an error.
6. **Nothing lost from Team** — the 1:1 history, last-met dates and "prep not yet rated" that were on Team rows should all still be there.
7. **The nav is simpler** — one people item, not two.

# Phase 5 — Auto-match + Team-card cleanup (retire the dropdown)

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Kill the confusing "Link an existing account" dropdown for good. The Team card shows a plain access status **plus one "Invite to log in" shortcut that reuses the Phase-2 invite flow** (pre-linked to that person — no second email field). Inviting a roster person whose account already exists just connects them automatically.

## Changes
- **Backend:** on the invite-from-roster path, if a `users` row already exists for that email **in the same org** → link `people.user_id` immediately and skip minting a token (this replaces the manual dropdown). The existing accept-time auto-link stays for the not-yet-registered case.
- **Backend cleanup:** mark `linkPerson` / `unlinkPerson` / `linkableUsers` (routes + `people.service` methods) **dormant** — pulled from the UI/api client now, deleted in a final commit.
- **Client:** `frontend/src/stages/team-card.ts` access line → a chip (**Has access** / **No access yet**) + an **"Invite to log in"** shortcut that opens the *same* Phase-2 invite modal, pre-linked to this person (member role) so nothing is retyped. `frontend/src/stages/team.ts` `doAccess()` — replace the whole link/invite/unlink sheet with that single shortcut; drop `getLinkableUsers/linkPerson/unlinkPerson/showGiveAccessModal` imports + the org-users load. Update `team.test.ts`. Remove/comment the dormant calls in `shared/api.js`.

## Not in this phase
- Deleting the dormant endpoints entirely (a tiny follow-up commit once this is proven).

## Done when
- [ ] No "link an existing account" dropdown anywhere in the app.
- [ ] Inviting a roster person whose email already has an account auto-links (verify `people.user_id` is set, no token minted).
- [ ] Inviting a roster person with no account still works via the join link.
- [ ] `npm run typecheck` + `npm test` green.
- [ ] Product owner walked the scenarios and said go.

## Test scenarios — for the product owner
1. **Dropdown gone** — open a Team person's card. You see a plain **Has access / No access yet** status and (if not yet invited) a simple **Invite** action. There is **no** "choose an account" dropdown anywhere. ❌ Not OK if the old dropdown appears.
2. **Auto-link** — invite a roster person whose email already belongs to an existing account. They should be connected instantly ("already has access"), no email/link needed.
3. **Normal invite still works** — invite a roster person with a brand-new email; the join link arrives and links them on accept (unchanged from before).

# Team access redesign — no mode, access on every card

**Goal:** Kill the hidden "Manage access" toggle so the Team screen is one list where you can see, at a glance, who can log in and view their own 1:1s — and give access in one clean flow instead of two overlapping controls.
**Driver:** Carl ("this entire system is confusing")
**Created:** 2026-07-14

## Done means
- The Team screen has **no mode toggle** — one list, always complete.
- Every person card shows its **access status** inline: 🔗 linked account, or 🔒 no access yet.
- Giving/changing access is **one action → one sheet** (invite by email *or* link an existing account), not a separate Invite button plus a dropdown.
- Both apps (admin Engine app + customer app) get it — they share `frontend/src/stages/team.ts`.

## Resolved before we start
- **One shared file.** Both apps load `frontend/src/stages/team.ts` (admin/src/main.js:39, frontend/src/main.js:38) — one edit covers both. No second copy to sync.
- **Access = link/invite only.** "Manage access" mode today does exactly two things: invite by email (`invitePerson`) and link/unlink an existing account (`linkPerson`/`unlinkPerson`). Edit and Delete already moved to each card's ⋯ menu; merge is parked (run.personId doesn't resolve merge chains yet). So this redesign only touches the access controls — Prep / Edit / Delete / Add someone are untouched.
- **Picker options fetch.** `getLinkableUsers()` is fetched lazily on entering edit mode today; when access is always visible it moves to `load()` (once, non-blocking — a failure just means "invite only" this visit, same as now).
- **The stopgap rename goes.** The button was renamed "Tidy up" → "Manage access" (team.ts:116) as a holding fix; Phase 1 deletes it.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | One list, access visible | Remove the mode; every card shows its access status; access actions move onto the card (reusing today's invite/link flows) | ✅ |
| 2 | One clean "Give access" flow | Replace the two separate controls (Invite button + account dropdown) with a single unified sheet — invite by email *or* pick an existing account | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ GREEN-LIT 2026-07-14** (Carl walked it, "a"). The mode is gone; every card shows its access status; `team-card.ts` is the new pure render. Committed. **Phase 2 (one clean "Give access" sheet) is next.**
Baseline (free, 2026-07-14): `npm test` **132/132** → now **133/133** with the new team test. Root typecheck clean. Admin + customer typechecks carry **4 pre-existing errors** in `add-person-modal.ts`/`delete-person-modal.ts` (name first/last splitting) — present on HEAD, untouched by this work, flagged for a separate fix. No paid runs — pure frontend UI change.

## Parked
- **Merge two roster people into one.** Still parked (pre-existing): merging leaves the merged person's past runs pointing at the old personId, so their history wouldn't fold under the target. Returns when `run.personId` resolves through a merge chain (or runs are re-pointed on merge). Not part of this redesign.
- **Rename "Prep 1:1" / ⋯ menu wording** — out of scope; this redesign is access-only.

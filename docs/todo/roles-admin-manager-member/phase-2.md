# Phase 2 — Sweep the leftovers

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Remove every remaining trace of "owner" that Phase 1 didn't need to touch — user-facing labels, seed scripts, and test fixtures/assertions — so the codebase reads cleanly as `admin / manager / member`. No behaviour change.

## Changes
- **User-facing wording** — anywhere the app shows "owner" as a role label to a person → "manager" (or "admin" where that's who's meant). Plain language, 14px floor respected.
- **Seed scripts** — `scripts/seed-member.ts` and any other seeds that write `role: "owner"` → the right new role.
- **Tests** — update fixtures and assertions across the ~31 files that referenced `"owner"` so they assert the new roles; keep them green.
- Optional (parked-if-messy): rename `createOrgWithOwner` / `NewOrgOwner` → `...Manager`.

## Not in this phase
- Any functional/access change — that all happened in Phase 1. This phase must not alter who-can-do-what.

## ⚠️ Watch out — "role" means two different things
The codebase uses "role" for two unrelated concepts:
- **Account role** — the `user_role` enum (`admin/manager/member`). ← this is what we're renaming.
- **Job role** — a meeting participant's job title (e.g. in `scripts/seed-runs.ts`, the engine, run history). ← DO NOT touch.

The account role's `"owner"` string is unambiguous (no job title is "owner"), so the sweep targets the literal `"owner"` role value only. Never blanket-rename the word "role".

## Done when
- [ ] `grep` for the `"owner"` role string across the app returns only intentional history (docs/changelog), not live code.
- [ ] `npm test` (free) is green.
- [ ] Product owner has confirmed nothing visible changed and said go.

## Test scenarios — for the product owner
Walk through these yourself.
1. **Nothing moved** — repeat Phase 1's scenarios 1, 2, 4 (Carl, an existing user, a member). Behaviour should be identical to end of Phase 1. ❌ Not OK if anything changed.
2. **Labels read right** — anywhere the app names a person's role, it says "manager" / "admin" / "member", never "owner". ❌ Not OK if "owner" shows anywhere on screen.
3. **Seeded accounts** — if you re-run a seed script, the created account has the new role. ❌ Not OK if it seeds `owner`.

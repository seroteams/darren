# Phase 006 — QA sign-off (Carl walks this)

**This phase is behind-the-scenes (no screen), so the walk is mostly reading test results + confirming the
security shape.** All free — no OpenAI. PG7/PG8 build the screens on top.

## Automated (I run these and paste results)
- [ ] `npm test` green · `npm run typecheck` clean.
- [ ] The new tests exist and pass: **superadmin → sees all**, **owner/admin → 403**, **anonymous → 401**,
  **dev side-door identity → 403**, **no cross-org leak for a normal admin**, **mutating method on
  `/api/v1/admin/*` → refused**, **`password_hash` never in the payload**, **an authorized read appends one
  audit record**.

## The security shape (I show you, plain words)
1. The gate reads a **server-resolved email** (`identity.email` from the session) — never anything the
   browser can send. Only `SUPERADMIN_EMAILS` (your email) clears it.
2. The dev quick-login can **never** be superadmin (its email isn't on the allowlist) — proven by a test.
3. The cross-company module is **read-only by construction**: GET-only routes, all through the one guard, no
   write/delete imported.
4. Every superadmin access writes **one audit line**.

## Carry-forward conditions (before the alpha widens past 2–3 friendly managers)
- [ ] The deferred **human-expert security review (009)** must explicitly cover this **new superadmin
  wall-crossing** (the waiver was written for the old fence, which had no cross-tenant key).
- [ ] Close the **anonymous session-start route** (`POST /api/v1/sessions`) — the 009 "before widening" gate.
- [ ] Update the **privacy note** to disclose that ratings (incl. the note) are stored and that an internal
  Sero admin can view a company's users/teams/runs across companies — before staff data is viewable.

## Sign-off
- [ ] **Carl:** tests pass + the security shape reads right → I approve PG6, set it → done, tick STATUS +
  the board, and commit.

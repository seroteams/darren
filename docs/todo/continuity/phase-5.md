# Phase 5 — The Continuity console (how Carl manages it)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜ · **Cost:** $0

## Goal
One internal admin screen where you can see every continuity thread, preview **exactly** what the
next 1:1 will receive, and switch carry-forward off — per person or org-wide — without touching code.

## Changes
- New admin stage `admin/src/stages/continuity.ts` (TypeScript, house pattern: loader map + STAGES
  enum + router guard + nav link under the Admin rail), superadmin/internal-only, admin app only —
  lands on the right side of the frontend-admin split.
- Views:
  - **Threads list** — people with ≥2 sessions: last meeting date, actions agreed / outcomes
    answered, carry-forward kept/edited/cleared on their latest prep.
  - **Thread detail** — the session chain for one person: what carried in, what was agreed, the
    outcome taps, what carried out.
  - **"What the next 1:1 will see"** — the assembled prior-session block, verbatim, before any run.
  - **Switches** — carry-forward on/off per person and per org (off = Phase 1–4 behave like cold
    start; nothing deleted).
- Backend: `backend/api/services/continuity/` controller + service + repo,
  `GET /api/v1/admin/continuity/…` + the switch `POST`, superadmin-gated (managers use the product,
  not the console), org-fenced reads, mirrored tests.

## Not in this phase
- Learning-artifact management (exemplars/stats screens — Phase 7 adds its tab here).
- Any customer-app surface.

## Done when
- [ ] Console reachable from the Admin rail, superadmin-only (manager gets no nav item AND the API 403s).
- [ ] Preview matches the real seeded block word-for-word.
- [ ] Off switch verified at the destination: with it off, a new prep for that person seeds nothing.
- [ ] `npm test` + typechecks green; follows DESIGN.md (14px floor, tokens, one blue action).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
All free.
1. **The thread** — open Admin → Continuity, click your test person. You can read the whole story
   in plain words: met on date X, agreed Y, you tapped "partly", next prep carried Z.
2. **The preview promise** — open "What the next 1:1 will see", then actually start a new 1:1 with
   that person. The intake block is identical to the preview. ❌ Not OK if they differ by a word.
3. **The off switch** — switch the person off, start a new prep: nothing seeds. Switch back on:
   it's back. Nothing was lost in between.
4. **The wall** — log in as a manager: no Continuity nav item, and the direct URL/API gets refused
   (real 403, not just a hidden button).

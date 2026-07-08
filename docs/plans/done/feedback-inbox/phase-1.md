# Phase 1 — the whole slice: table → route → screen

One phase: `feedback_notes` table on Neon, the send-form writes to it, a superadmin-only
`GET /api/v1/admin/feedback`, and the **Feedback inbox** screen in the admin rail.

## ✅ GREEN-LIT 2026-07-08

Carl closed the whole track ("close it") — Phase 1 + Phase 2 signed off together, no live re-walk
(his call as owner). Built + live-verified at build time 2026-07-05; wiring re-confirmed intact
2026-07-08 (route, schema, migration `0006`, nav row all present after the `0006`→`0011` DB drift).

---

Built + live-verified 2026-07-05 (see PLAN.md "Current state").

## QA scenarios

1. **Send → see.** Log in (any role) → footer **Send feedback** → write a note → Send →
   "Thanks!". Log in as you (superadmin) → **Feedback inbox** (Admin section, under Error
   log) → the note is there, newest first, with your name + company and a relative time.
2. **Empty state.** With no notes in the table the screen says
   "No feedback yet — when a tester sends a note, it lands here." (no error, no spinner stuck).
3. **The wall is real.** Log in as the dev **Manager** → the Feedback inbox nav row is not
   shown; hitting `GET /api/v1/admin/feedback` directly returns **403**. Logged out → **401**.
   (Verified live during the build; re-check if you like.)
4. **Long note.** Send a multi-line note — the inbox shows it wrapped (pre-wrap), not on one
   endless line; over-length input is capped at 2000 chars server-side.
5. **Restart honesty.** Your long-running dev API on :3001 serves old code until restarted —
   after a restart, the send-form writes to the table (verify: the note shows in the inbox,
   and `feedback.jsonl` does NOT grow).

Green light = commit note in PLAN, tick this phase, fold the changelog/how-it-works refresh in.

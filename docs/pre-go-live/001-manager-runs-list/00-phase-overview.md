# Phase 001 — Manager Runs list

## Goal (plain)
When a manager opens **Runs**, they see their own finished 1:1s — a real list, newest first — instead of
an empty placeholder. If they have none yet, they see a friendly "start your first one" message.

## What you'll have when it's done
- The Runs page loads the manager's **own** finished 1:1s from the backend and lists them (who it was
  about, the meeting type, when).
- A manager only ever sees **their own** runs — never a colleague's, never an admin's whole-company list.
- The empty state stays for anyone with zero runs.
- Admins are untouched (they keep the full Library).

## A grounding example (before → after)
- **Before:** open Runs → "No runs yet. Start your first one…" even after you've done three 1:1s.
- **After:** open Runs → a list of your three 1:1s ("Priya · Senior Engineer · One-on-one · 2 days ago"),
  newest at the top.

## The steps (to be detailed when this phase starts)
1. Add `listMyRuns()` to [shared/api.js](../../../shared/api.js) → `GET /api/v1/runs/mine`.
2. Rewrite [runs.ts](../../../admin/src/stages/runs.ts): fetch on mount, render the list (kept empty
   state when the list is empty, error state if the fetch fails).
3. Match the existing design (`.card-flat`, `.l-stack`, list rows like the admin Start page), `escapeHtml`
   every value.

## What we reuse (don't rebuild)
- The endpoint already exists and is member-safe: `runs.mine` →
  [runs.controller.ts:68](../../../backend/api/services/runs/runs.controller.ts) → `service.myFinished`
  → `listFinishedRunsForMember` (fenced by `orgId` **and** `userId`).

## How we'll know it's done (full list in `99-qa-signoff.md`)
- A member with finished runs sees them, newest first; a member with none sees the empty state.
- Logging in as a *different* member shows only that member's runs (the fence holds).
- No OpenAI calls; `npm test` + `npm run typecheck` stay green.

## Note
This absorbs the deferred **member-nav Phase 2** (real Runs). Phase 002 adds re-opening a run. The member
"Runs" nav item/page is relabelled **"Past 1:1s"** (plain-language; "Runs" stays internal/admin).

**Cutover (documented, no backfill):** runs are attributed by `userId` on the run state, which was only
stamped from member-nav Phase 2 onward. So 1:1s created **before login existed**, via the dev side-door,
or anonymously carry no `userId` and are **intentionally invisible** in a real member's list. No backfill
for the alpha — call it out so an empty list for pre-attribution runs isn't mistaken for a bug.

> **Status:** overview only. Detailed step files get written when we start this phase.

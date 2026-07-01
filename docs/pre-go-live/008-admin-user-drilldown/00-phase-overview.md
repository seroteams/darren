# Phase 008 — Admin: user → teams → runs

## Goal (plain)
Let Carl click a registered user and see their people and their 1:1s — with ratings — the full
"registered → teams → runs" picture he asked for.

## What you'll have when it's done
- From the Registered page (Phase 007), clicking a user opens their detail: their **people** (built the
  same way as the manager's Team, Phase 004) and their **runs**, each with its rating (Phase 003).
- Carl can open any run read-only to see what that manager saw.
- Read-only, superadmin-only, across companies (the Phase 006 gate).

## A grounding example (before → after)
- **Before:** Carl sees that Priya has "1 run" but can't see what it was.
- **After:** Carl clicks Priya → her 1 person ("Marco, ★★★☆☆") and her run, and can open the briefing to
  see exactly what Sero gave her.

## The steps (to be detailed when this phase starts)
1. Extend the Phase 006 superadmin service with read-only per-user reads (e.g.
   `GET /api/v1/admin/users/:id/runs`), still cross-org-gated to superadmin.
2. New admin user-detail stage (or extend Phase 007's): render the user's people (reuse Phase 004
   grouping) + runs (reuse Phase 001 rows + Phase 003 ratings).
3. Run rows open the read-only briefing (reuse the Phase 002 view).

## What we reuse (don't rebuild)
- Phase 004 grouping, Phase 001 run rows, Phase 002 read-only detail, Phase 003 ratings, Phase 006 gate.
  This phase mostly composes existing pieces behind the superadmin wall.

## How we'll know it's done (full list in `99-qa-signoff.md`)
- As Carl: a user's people + runs + ratings show; a run opens read-only.
- As a normal owner/admin: refused (403 / not shown).
- The fence holds — no normal user can reach another company's data through these routes.
- No OpenAI calls; `npm test` + typecheck green.

> **Status:** overview only. Detailed step files get written when we start this phase.

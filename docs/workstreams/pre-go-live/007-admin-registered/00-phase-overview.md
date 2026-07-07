# Phase 007 — Admin: who's registered

## Goal (plain)
Give Carl a screen that shows everyone using Sero across the alpha: every company and its people.

## What you'll have when it's done
- A superadmin-only admin page listing **every alpha company** and, under each, its **users** — name,
  role (owner/admin/member), when they joined, and how many 1:1s they've run.
- **Return-visit signal** per user: **last active** and **runs over time** (e.g. this week vs last) — the
  actual thing the whole track exists to prove ("do they come back?"). Both are derivable from existing run
  timestamps; no new tracking infrastructure.
- **Alpha-wide rating summary** at the top: mean stars across all runs + a count of low (≤2) scores — the
  honest read on whether Sero is landing, in one glance.
- Read-only. Reachable only by Carl's account (the Phase 006 gate); invisible/refused to everyone else.

## A grounding example (before → after)
- **Before:** Carl has no way to see who signed up besides querying the database by hand.
- **After:** Carl opens "Registered" → "Proptech Builders — Darren (owner, joined Jun 28, 4 runs), Priya
  (member, joined Jul 1, 1 run)" and the other alpha companies below.

## The steps (to be detailed when this phase starts)
1. New admin stage (registered via the 6-step admin page pattern: `state.js` + `router.js` **admin-only**
   guard + `main.js` loader + `app-nav.js` link + loader).
2. Fetch from the Phase 006 `GET /api/v1/admin/registered` endpoint; render companies → users as grouped
   cards/rows (match the admin design; `escapeHtml` all values).
3. Loading / empty / error states.

## What we reuse (don't rebuild)
- The Phase 006 cross-company endpoint + guard; the existing admin page-registration pattern and
  `shared/api.js` fetch helpers.

## Security note
The frontend "admin-only" nav guard is **cosmetic** — every org owner satisfies it, so it must not be the
security boundary. Security rests entirely on the backend `requireSuperadmin` **403** (Phase 006). Keep a
test that a plain owner/admin gets 403 on these routes; reusing only the nav guard would silently regress it.

## How we'll know it's done (full list in `99-qa-signoff.md`)
- As Carl: the page lists every company and its users with roles, join dates, and run counts.
- As a normal owner/admin: the nav item isn't shown and the route is refused.
- No OpenAI calls; `npm test` + typecheck green.

## Note
Phase 008 makes each user drillable into their people and runs.

> **Status:** overview only. Detailed step files get written when we start this phase.

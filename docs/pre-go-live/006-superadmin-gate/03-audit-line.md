# Phase 006 · Step 03 — The audit line (test-first)

## Goal
Every superadmin request appends one audit record — the single most important compensating control for a
cross-company key: if the key is ever used, there's a trail.

## What you'll have
- One appended record per superadmin request: timestamp, actor `userId`, actor email, route, and the target
  (org/user) where the route has one.
- A test proving a superadmin read writes exactly one audit record; a refused (403) call is **not** audited
  as a successful access.

## A grounding example
- **Before:** a cross-company read leaves no trace.
- **After:** `carl@… → GET /api/v1/admin/registered` appends `2026-07-04T… · user=<id> · carl@… ·
  /api/v1/admin/registered` to the audit log.

## Technical detail
- Append **one line**, not a logging subsystem. A single `appendSuperadminAudit(record)` helper writing a
  JSONL line to an audit sink (a file under a gitignored dir, matching how the app already keeps local
  artifacts; add the path to `.gitignore` belt-and-braces). No rotation/retention work now — parked.
- Called from the one `requireSuperadminRoute` funnel (or the controller it wraps) **after** the guard
  passes, so only real superadmin access is recorded and the audit can't be reached un-gated.
- Never record secrets or full payloads — identity + route + target ids only.

## Check
- Test first (red→green): an authorized superadmin call appends one well-formed record; a 403 does not append
  a success record. `npm test` green, `npm run typecheck` clean. No OpenAI.

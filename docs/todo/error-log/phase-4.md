# Phase 4 — Detail + tidy-up

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Turn the log from a list into a tool: click a row for the full story, filter to what matters, tick errors as "resolved" once you've dealt with them, and keep the table from growing forever.

## Why
Phases 2–3 give you the *list*. To actually work a pile of errors you need the detail behind a row, a way to hide the noise, a way to mark "handled," and a guarantee the table won't bloat over months.

## Changes
- **Row-click detail** — a drawer/expand on the Error log page showing the full record: stack trace, method + path, status, request id, user-agent, org/user. Read from a `GET /api/v1/admin/errors/:id` (superadmin-gated), same recipe as the User-detail drilldown.
- **Filters** — a few chips on the table: source (All / API / Browser) and **Unresolved only**. Handled client-side over the loaded rows (small N) — no new search infra.
- **Mark resolved** — a `resolved_at` column (added in Phase 0's schema, unused until now) + a `PATCH /api/v1/admin/errors/:id/resolve` toggle. Resolved rows drop out of the default "Unresolved" view but aren't deleted.
- **Auto-purge** — a small script mirroring [scripts/purge-logs.js](../../../scripts/purge-logs.js) (and its `logs:purge` npm entry): delete `error_logs` rows older than a set window (e.g. 30 days). Run by hand for now; note it in the how-it-works log.
- **Tests first** for the resolve toggle and the purge cutoff (nothing inside the window is deleted).

## Not in this phase
- No alerting/email, no error grouping or counts, no charts (all parked in PLAN.md).
- No automatic scheduled purge (manual command is enough for the alpha).

## Done when
- [ ] Clicking a row shows the full detail (stack + request info) behind the superadmin wall.
- [ ] The source + "Unresolved only" filters work.
- [ ] Marking an error resolved removes it from the default view but keeps the record.
- [ ] The purge script deletes only rows older than the window and leaves recent ones untouched (proven by a test).
- [ ] `npm test` green, typecheck + admin build clean, 14px floor holds.
- [ ] Product owner has tested the scenarios below and said go — this closes the plan.

## Test scenarios — for the product owner
Walk through these yourself. Green light here moves the whole folder to `done/`.
1. **The full story is one click away** — click a row. You see the stack trace and request details, enough to hand to me or understand it yourself. ❌ Not OK if the detail is missing or unreadable.
2. **You can cut the noise** — flip to **Browser** only, then **Unresolved only**. The table narrows correctly each time. ❌ Not OK if a filter shows the wrong rows.
3. **"Handled" sticks** — mark an error resolved. It leaves the default view; reload — it's still resolved, and still findable if you show resolved. ❌ Not OK if it reappears as new or vanishes for good.
4. **It won't grow forever** — after the purge runs, old rows (past the window) are gone and recent ones remain. ❌ Not OK if it deletes recent errors or keeps everything.

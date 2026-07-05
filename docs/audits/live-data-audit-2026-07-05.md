# Live-data audit — 2026-07-05

**Question asked:** "I have the feeling we have some pages, admin, or files that aren't truly connected to anything meaningful or have reasons to update."

**Answer in one line:** The app is in better shape than feared — every screen is reachable and live — but the **v1 API migration was left half-finished**, which is why ~54 dead legacy routes still sit on the server, and a few small things need tidying.

How this was checked: three independent sweeps (every admin screen → where its data comes from · every API route → who actually calls it · every file → is anything orphaned), then the disputed findings were re-verified by hand against the code.

---

## 1. What's healthy (no action needed)

- **Every screen is live.** All 38 routed pages load fresh data from the API or live streams. No dead pages, no page renders stale baked-in data by accident.
- **No broken calls.** Every fetch the app makes has a matching route on the server.
- **No orphaned files.** All scripts are referenced (package.json, docs, or auto-discovered tests); all UI modules are imported somewhere reachable; source images in `images/` are kept on purpose.
- **Static by design (not a problem):**
  - `/tasks` — the build board is a hand-maintained constant in `admin/src/stages/tasks.js` (that IS the workflow; the page-heartbeat track adds drift warnings).
  - `/privacy` and `/about` — hardcoded one-pagers, fine.
  - `admin/public/sero-flowbite/` — the design-system reference sheet, static on purpose.
  - `frontend/` — a placeholder README for the Phase 007 customer app, on purpose.

## 2. The real finding — the v1 migration stopped halfway

When the API moved to `/api/v1/…` (backend-api-v1 plan, now in done/), every old `/api/…` path was kept as an alias "so the admin is unaffected", with the intent to move the app over and then delete them. The app was only **partly** moved:

- **13 calls in `shared/api.js` still use the old paths:** meeting-types, arcs, persona-bench, role-lexicons (+ its 4 term actions), regression/run, suggest-fix, pipeline/status, and the two lexicon-promote calls.
- Because of those 13 calls, **~54 legacy alias routes** still exist in `backend/api/server.ts`. Nothing else uses them — not the scripts (they import backend modules directly, they don't call HTTP), not the tests, not any other app.
- The v1 twins run the **same handler functions** — only the error-message shape differs — so switching is low-risk.

**Fix (this plan):** switch the 13 calls to v1 (Phase 2), then delete all the alias routes (Phase 3). One exception: `/api/version` keeps its path — it never got a v1 twin and the build stamp uses it.

## 3. Small stragglers found on the way

| Finding | Where | Call |
|---|---|---|
| `pipeline/manifest` endpoint has **zero consumers** anywhere | `backend/api/server.ts` (v1 + legacy twin) | remove in Phase 3 (or say keep) |
| `invitations` table is scaffolded but never read or written | `backend/db/schema.ts` | leave — the active user-management plan owns it |
| ~12 folders sit in `docs/todo/` as "active" — some may be truly finished | `docs/todo/` | Phase 4 cross-checks and moves closed ones to `done/` |

## 4. Parked observations (noted, not urgent)

- `content/data/feedback/feedback.jsonl` is append-only with no rotation — it grows forever.
- Run artifacts under `content/runs/` have no retention policy — disk grows forever.
- Both are fine at alpha scale; worth a decision before real customer volume.

## 5. What this audit did NOT find

- No page pretending to show live data while showing hardcoded data.
- No secret second source of truth for any screen.
- No unreachable screens hidden in the router.
- No scripts or backend services dangling unused.

---

*Produced by the live-data-cleanup plan ([docs/todo/live-data-cleanup/PLAN.md](../todo/live-data-cleanup/PLAN.md)). Baseline before any change: `npm test` 67/67 PASS (2026-07-05).*

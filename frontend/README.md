# frontend/ — the customer app

The **customer-facing app** (login/register → manager prep flow → member Home · Team ·
Past 1:1s), stood up in frontend-admin-split Phase 2. `../admin/` is the internal
tooling app; this app contains **no** internal tools.

- Dev: `npm run dev:customer` (port **3002**; expects the API on 3001, e.g. via `npm run dev`)
- Build: `npm run build:customer` → `frontend/dist/`

Until Phase 3 of the split, the customer stage modules still live in `../admin/src`
and are cross-imported from there — this app's loader map simply never imports the
internal ones, so they don't reach the bundle. Phase 3 moves the files; Phase 4
serves + fences the two apps separately.

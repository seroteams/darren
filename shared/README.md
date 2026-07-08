# shared/

Web/client code shared between the two front-end apps — `admin/` (internal tooling)
and the future `frontend/` (customer app). Both import from here via relative paths
(e.g. `../../shared/api.js`); the Vite dev server is configured to serve this folder
(`server.fs.allow` in [../vite.config.js](../vite.config.js)).

**Not** the same as [`backend/shared/`](../backend/shared/), which is server-only.

Currently holds:
- `api.js` — fetch wrappers for the `/api` endpoints.
- `sse.js` — the EventSource stream wrapper.

Added by the frontend/admin split, Phase 1 (shared foundation). See
[docs/plans/doing/frontend-admin-split/](../docs/plans/doing/frontend-admin-split/plan.md).

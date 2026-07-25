// Boot splash entry for the customer app. The actual splash (the Sero mark's
// pong rally + fade-out) lives in admin/src/boot-splash.js — ONE copy now,
// cross-imported like the other shared shell modules (refactor-2026-07 P4;
// this file used to be a byte-identical twin that could silently drift).
// It stays a separate tiny /src entry because the CSP blocks inline <script>
// (backend/api/middleware/security-headers.ts) and the splash must not depend
// on the big bundle: index.html's script tag needs a file at THIS path inside
// the frontend Vite root.
import "../../admin/src/boot-splash.js";

import { defineConfig } from "vite";
import { resolve } from "node:path";

const API_PORT = process.env.API_PORT || 3001;

export default defineConfig({
  root: resolve(__dirname, "admin"),
  // The admin app is served under /admin on live (admin-live-deploy Phase 2) so it can
  // sit alongside the customer app at /. Base is /admin/ in dev AND build so local mirrors
  // live (local admin now lives at localhost:3000/admin/). API calls use root-absolute
  // /api/... paths, unaffected by the base.
  base: "/admin/",
  // The Vite root is admin/, but the project's single .env lives at the repo root (same
  // file the backend and .env.example use). Point envDir there so VITE_-prefixed vars
  // (e.g. the dev-login prefill creds) are actually read. Only VITE_* vars reach the
  // client bundle, so repo-root secrets like DATABASE_URL stay server-side.
  envDir: resolve(__dirname, "."),
  resolve: {
    alias: {
      "@sero/run-debrief": resolve(__dirname, "backend/engine/run-debrief.mjs"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    // The Vite root is admin/, but shared web modules live in the repo-root shared/
    // folder (imported by admin/ now, and by the future frontend/ app). Allow the dev
    // server to serve files from the repo root so those ../shared imports resolve.
    fs: {
      allow: [resolve(__dirname, ".")],
    },
    proxy: {
      "/api": {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: resolve(__dirname, "admin/dist"),
    emptyOutDir: true,
    sourcemap: true,
  },
});

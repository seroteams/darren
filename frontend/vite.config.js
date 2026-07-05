import { defineConfig } from "vite";
import { resolve } from "node:path";

const API_PORT = process.env.API_PORT || 3001;

// The customer app (frontend-admin-split Phase 2). Own Vite root, own dev port
// (3002 — 3000 is the admin app, 3001 the API). Until Phase 3 moves them, the
// customer stage modules still live in ../admin/src and are cross-imported from
// there — fs.allow opens the repo root so those (and ../shared) resolve.
export default defineConfig({
  root: __dirname,
  base: "/",
  // Same single repo-root .env as the admin app and the backend.
  envDir: resolve(__dirname, ".."),
  resolve: {
    alias: {
      "@sero/run-debrief": resolve(__dirname, "../backend/engine/run-debrief.mjs"),
    },
  },
  server: {
    port: 3002,
    strictPort: true,
    fs: {
      allow: [resolve(__dirname, "..")],
    },
    proxy: {
      "/api": {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: true,
  },
});

import { defineConfig } from "vite";
import { resolve } from "node:path";

const API_PORT = process.env.API_PORT || 3001;

export default defineConfig({
  root: resolve(__dirname, "admin"),
  base: "/",
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

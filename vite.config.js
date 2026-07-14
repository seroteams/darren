import { defineConfig, createLogger } from "vite";
import { resolve } from "node:path";

const API_PORT = process.env.API_PORT || 3001;

// Quiet the API-boot race. For the first couple of seconds after launch, vite
// proxies /api calls into port 3001 before the API server has opened it, and
// vite's default proxy-error handler dumps a full ECONNREFUSED stack trace per
// request - the scary red wall you see filling the launcher window. Swallow that
// one specific, known-benign noise down to a single throttled dim line. Every
// other proxy error (API crash mid-request, ECONNRESET, etc.) still logs in full.
const logger = createLogger();
const baseError = logger.error.bind(logger);
let lastBootNotice = 0;
logger.error = (msg, opts) => {
  if (typeof msg === "string" && msg.includes("proxy error") && msg.includes("ECONNREFUSED")) {
    const now = Date.now();
    if (now - lastBootNotice > 5000) {
      lastBootNotice = now;
      baseError("\x1b[2m  [proxy] api still starting — retrying /api calls…\x1b[0m", { timestamp: true });
    }
    return;
  }
  baseError(msg, opts);
};

export default defineConfig({
  customLogger: logger,
  root: resolve(__dirname, "admin"),
  base: "/",
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

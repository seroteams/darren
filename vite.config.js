import { defineConfig } from "vite";
import { resolve } from "node:path";

const API_PORT = process.env.API_PORT || 3001;

export default defineConfig({
  root: resolve(__dirname, "frontend/client"),
  base: "/",
  resolve: {
    alias: {
      "@sero/run-debrief": resolve(__dirname, "src/run-debrief.mjs"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: resolve(__dirname, "frontend/client/dist"),
    emptyOutDir: true,
    sourcemap: true,
  },
});

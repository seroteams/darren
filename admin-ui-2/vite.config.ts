import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Served two ways: standalone (npm run dev) and as a built snapshot copied to
  // admin/public/admin-ui-2/ — the base keeps asset URLs right in both.
  base: "/admin-ui-2/",
  plugins: [react()],
});

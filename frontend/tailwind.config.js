import { fileURLToPath } from "node:url";
import path from "node:path";
import adminConfig from "../admin/tailwind.config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Same theme as the admin app (one design system, one source), different content
// globs: the customer stages still live in ../admin/src until Phase 3 moves them,
// so both trees are scanned for used utility classes.
export default {
  ...adminConfig,
  content: [
    path.join(__dirname, "index.html"),
    path.join(__dirname, "src/**/*.{js,html}"),
    path.join(__dirname, "../admin/src/**/*.{js,html}"),
  ],
};

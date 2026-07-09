const js = require("@eslint/js");
const globals = require("globals");

const sharedRules = {
  "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  "no-empty": ["error", { allowEmptyCatch: true }], // empty catch {} is an intentional best-effort swallow here
};

// Three source areas:
//   - Node / CommonJS: CLI + engine core (backend/engine/), API (backend/api/), scripts
//   - Node / ESM:       build config + the shared run-debrief ESM build
//   - Browser / ESM:    the vanilla-JS web client (admin/)
module.exports = [
  {
    ignores: [
      "node_modules/**",
      "admin/dist/**",
      "frontend/dist/**",
      ".claude/**", // vendored skills, not our code
      "docs/archive/**",
      "logs/**",
      "content/questions/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    ignores: ["admin/**", "frontend/**", "shared/**", "**/*.esm.js", "vite.config.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        fetch: "readonly",
        AbortController: "readonly",
      },
    },
    rules: sharedRules,
  },
  {
    // Node/ESM: build config, including the customer app's own vite/tailwind/postcss configs.
    files: ["**/*.esm.js", "**/*.mjs", "vite.config.js", "frontend/*.config.js"],
    ignores: ["admin/**"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: sharedRules,
  },
  {
    // Browser/ESM: the admin + customer web clients and the shared browser modules.
    files: ["admin/**/*.js", "frontend/src/**/*.js", "shared/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: sharedRules,
  },
];

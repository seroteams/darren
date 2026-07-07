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
      ".claude/**", // vendored skills, not our code
      "docs/archive/**",
      "logs/**",
      "content/questions/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    ignores: ["admin/**", "**/*.esm.js", "vite.config.js"],
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
    files: ["**/*.esm.js", "**/*.mjs", "vite.config.js"],
    ignores: ["admin/**"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: sharedRules,
  },
  {
    files: ["admin/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: sharedRules,
  },
];

const js = require("@eslint/js");
const globals = require("globals");

const sharedRules = {
  "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  "no-empty": ["error", { allowEmptyCatch: true }], // empty catch {} is an intentional best-effort swallow here
};

// Three source areas:
//   - Node / CommonJS: CLI, engine core (src/), HTTP server, scripts
//   - Node / ESM:       build config + the shared run-debrief ESM build
//   - Browser / ESM:    the vanilla-JS web client (frontend/client/)
module.exports = [
  {
    ignores: [
      "node_modules/**",
      "frontend/client/dist/**",
      ".claude/**", // vendored skills, not our code
      "archives/**",
      "logs/**",
      "questions/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    ignores: ["frontend/client/**", "**/*.esm.js", "vite.config.js"],
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
    ignores: ["frontend/client/**"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: sharedRules,
  },
  {
    files: ["frontend/client/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: sharedRules,
  },
];

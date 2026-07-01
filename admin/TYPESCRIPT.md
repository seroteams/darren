# Admin SPA — TypeScript (the repeatable path)

The admin console is plain-JS ES modules that Vite bundles. We're converting it to
TypeScript **one file at a time**, leaf-first, so the app never breaks. This is the
pilot from repo-tidy Phase 4 — proven on 3 stages (`team`, `runs`, `error`).

## How it's wired
- **`admin/tsconfig.json`** — type-checking for browser code (DOM libs, strict, `noEmit`).
  Vite/esbuild does the actual transpile; this config only checks types.
  Run it with **`npm run typecheck:admin`**. (The repo-root `tsconfig.json` is Node/back-end
  only — no DOM — so admin has its own.)
- **`allowJs: true`, `checkJs: false`** — `.ts` and `.js` coexist. Only `.ts` files are
  type-checked, so converting a file is opt-in, never a big-bang.
- **`admin/src/state.d.ts`** — types the plain-JS `state.js` (`STAGES`, `store`, `setState`)
  so `.ts` files import it with real contracts. When `state.js` itself becomes `.ts`, delete this.
- **`admin/src/stages/stage.types.ts`** — the shared stage contract (`Mount` / `Unmount`).

## Converting a stage (the steps)
1. Rename `stages/foo.js` → `stages/foo.ts`.
2. Type the exports against the contract:
   ```ts
   import type { Mount, Unmount } from "./stage.types.ts";
   export const mount: Mount = async (root, { setState }) => { /* … */ };
   export const unmount: Unmount = () => {};
   ```
3. Fix what strict mode surfaces. Most common: `root.querySelector(".x")` is
   `Element | null`, so use `?.` — `root.querySelector(".x")?.addEventListener(...)`.
   (Don't use `!` — banned by our conventions.)
4. Update the loader in **`admin/src/main.js`**: `import("./stages/foo.js")` → `"./stages/foo.ts"`
   (Vite resolves the `.ts`; the string is a real path, so the extension must match).
5. Verify: `npm run typecheck:admin` clean, `npm run build` succeeds, and the stage
   still works in the running app.

## What's next (parked — its own plan)
- Convert `state.js`, `router.js`, `main.js`, and the `ui/` helpers, then drop `state.d.ts`.
- The full 44-stage sweep is **not** this pilot — it's a separate plan (see repo-tidy PLAN "Parked").

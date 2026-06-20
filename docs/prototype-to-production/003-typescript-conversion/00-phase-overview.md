# Phase 003 — TypeScript Conversion

## Goal (plain)
Convert the existing code (the AI engine and the server) from JavaScript to **TypeScript with tight
contracts**, so everything we build after this stands on typed, checked code. **Nothing should behave
differently** — this is about safety, not features. The payoff: the computer catches whole classes of
mistakes *before* the app runs.

## What you'll have when it's done
- `backend/engine/` and the server converted from `.js` to `.ts`, with **strict mode on**.
- **Shared types/interfaces** for the core shapes the system passes around — session, focus point,
  question, axis state, briefing, evaluation — so modules agree on exact contracts.
- The build (typecheck) and `npm test` both green; the app and CLI behave exactly as before.
- Each module converted **test-first** (add a characterising test where one is missing, then convert) —
  red → green, per the TDD skill from Phase 002.

## A grounding example (before → after)
- **Before:** `reviewer.js` returns a plain object; a typo like `evaluation.headlne` fails silently at runtime.
- **After:** `reviewer.ts` returns a typed `Evaluation`; the same typo is a red underline in the editor
  and a failed build — caught before anyone runs it.

## The steps (to be detailed when this phase starts)
1. Turn on a strict `tsconfig` for the backend.
2. Define the shared core types/interfaces (the contracts modules pass around).
3. Convert leaf modules first, then work up the dependency graph, keeping tests green at each step.
4. Remove `any`s and tighten contracts as types reveal loose spots.

## How we'll know it's done (full list in `99-qa-signoff.md`)
- `npm run build` (typecheck) passes with strict mode and no `any` in the converted code.
- `npm test` is green.
- The app and the CLI behave identically to before the conversion.

## Note
Depends on Phase 002 (TypeScript tooling, conventions, and the TDD skill must be in place first).

> **Status:** overview only. Detailed step files get written when we start this phase.

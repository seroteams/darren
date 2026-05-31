# Phase 0 — A Placeholder Hard Bug

Status: done  
Owner: light-ops  
Scope: A1-A3 only

## Goal

Remove unresolved `{{TOKEN}}` leaks from prompt substitution and add guardrails so this cannot silently regress.

## Issues

### A1 — `.replace` to `.replaceAll` in template substitution
- Files:
  - `src/preparation.js`
  - `src/queue-manager.js`
  - `src/generate.js`
  - `src/question-generator.js`
  - `src/lexicon-reviewer.js`
  - `src/briefing.js`
- Change:
  - Replace single-occurrence `.replace("{{X}}", val)` calls with `.replaceAll("{{X}}", val)`.

### A2 — Output guard against unresolved placeholders
- Files:
  - `src/ai-client.js` (or preparation validation path)
- Change:
  - Throw if any parsed AI output field contains `/\{\{[A-Z_]+\}\}/`.
  - Include field name in error message.

### A3 — Send-time assertion for unresolved prompt tokens
- Files:
  - `src/ai-client.js`
- Change:
  - Before sending `system + user`, throw on unresolved `/\{\{[A-Z_]+\}\}/`.

## Acceptance gate

- `rg "\.replace\(\"\\{\\{" src` returns no matches.
- Fixture response with `{{NAME}}` causes parser rejection with field name.
- Prompt send path rejects unresolved placeholders with token name in error.
- Toby prep log contains no `{{...}}`.

## Out of scope

- Any prep-quality wording changes (C-series)
- Planner behavior changes (D-series)
- UI redesign

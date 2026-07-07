# Conventions — how code is named and laid out

One page so anyone can walk in. The full rulebooks are auto-loaded skills
(`.claude/skills/backend-conventions`, `.claude/skills/frontend-conventions`); this is the
short version. See [STRUCTURE.md](STRUCTURE.md) for *where* everything lives.

## Language
- All **new** code is **TypeScript, strict** (`npm run typecheck`).
- The remaining JavaScript (the `admin/` SPA, some `scripts/`) is legacy — convert a file
  when you next touch it, don't rewrite wholesale.

## Naming
- Files are **kebab-case with a role suffix** that says the file's one job:
  `sessions.controller.ts` · `sessions.service.ts` · `sessions.repo.ts` ·
  `session.types.ts` · `*.test.ts`.
- One job per file.

## Backend layering — per API domain under `backend/api/services/<domain>/`
- **controller** — thin: parse the request, call the service, map the result. No logic.
- **service** — the logic. Testable, no HTTP.
- **repo** — the *only* thing that touches storage (files today, Postgres after Phase 005).
- Swapping storage must not touch the controller or service. That seam is the whole point.
- HTTP is versioned: `/api/v1/...`. Errors are honest (`notFound`, `badRequest`) — never silent.

## Engine — `backend/engine/`
- The pipeline core. No HTTP. Finds content through the address book (`paths.mts`); never
  hard-codes a path.

## Tests
- **Unit** tests sit **beside** the code as `*.test.ts` (built-in `node:test`).
- **Integration** tests mirror the API domains under `backend/tests/<domain>/`.
- Test-first for new features. `npm test` is the free, offline signal — run it before "done".

## Frontend — `admin/`
- Composition over inheritance; one module per pipeline stage.
- **14px is the floor** for user-facing text — use the design tokens, never raw sub-14px sizes.
- User-facing copy is plain language: short, no jargon.

## Honesty
- Surface raw model output. Detect and flag problems; never hardcode text to hide them.
- Paid runs (`gate` / `smoke` / `eval` — they hit OpenAI) need an explicit go-ahead first.

See also: [../CLAUDE.md](../../CLAUDE.md) — the standing behavioural rules.

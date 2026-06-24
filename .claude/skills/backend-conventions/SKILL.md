---
name: backend-conventions
description: "Sero's house rules for backend code (the engine, API server, services, repos, controllers, types). Use when writing, naming, structuring, or reviewing any backend file — TypeScript with tight contracts, kebab-case role-suffixed file names, slim-controller → service → co-located repo layering, RESTful versioned /api/v1 design, error handling, and the mirrored test layout. Apply before creating or moving backend files."
---

# Backend conventions — Sero house rules

These are the standing rules for everything under `backend/`. They exist so the same request
produces the same shape of code every time, without Carl having to explain the structure.

From Phase 002 onward: **all backend code is TypeScript** and **all work is test-first**
(follow the `test-driven-development` skill — red → green → refactor, no production code without a
failing test first).

## 1. Language — TypeScript, tight contracts
- TypeScript everywhere, `strict` on. Explicit types and interfaces.
- **No loose `any`.** If a type is genuinely unknown, use `unknown` and narrow it.
- Public functions and exported APIs have explicit parameter and return types.
- **Type-stripping safe.** Avoid TS features that need compilation (constructor *parameter
  properties* like `constructor(private repo: X)`, `enum`, `namespace`) — they break Node's native
  `.ts` runner. Declare fields explicitly and assign in the constructor; use union types instead of `enum`.

## 2. File names — kebab-case + a role suffix
One responsibility per file. Name it `<resource>.<role>.ts`:

| Role | File | Holds |
|------|------|-------|
| Controller | `sessions.controller.ts` | HTTP in/out only — parse request, call the service, format the response |
| Service | `sessions.service.ts` | The business logic |
| Repository | `sessions.repo.ts` | Data access (files now, Postgres later) |
| Types | `sessions.types.ts` | Interfaces and type aliases for this resource |
| Unit test | `sessions.service.test.ts` | Test that sits **beside** the file it tests |

## 3. Layering — slim controller → service → repo
- **Controllers are thin.** They translate HTTP to a service call and back. No business logic.
- **Services hold the logic.** They never touch the request/response objects.
- **Repos own data access.** Each repo lives **next to** its service (e.g.
  `services/sessions/sessions.repo.ts`) so each area is self-contained.

## 4. Contracts — interfaces first, shallow inheritance
- Define an **interface** per service and per repo. Classes **implement** the interface.
- **Prefer composition.** Allow only a thin shared base where it truly earns its place.
- **No deep class trees.** If you're three levels deep, stop and compose instead.

## 5. API — RESTful and versioned
- Every endpoint lives under **`/api/v1/`**.
- Resource **nouns**, not verbs in the path: `GET /api/v1/runs`, `DELETE /api/v1/runs/:id`.
- Use the right HTTP verb and the right status code (`200/201/204/400/401/403/404/409/500`).

## 6. Error handling — honest, never swallowed
- Don't swallow errors. Fail clearly with the right status code and a useful message.
- **Engine honesty (non-negotiable):** surface raw model output. Detect problems and flag them —
  **never hardcode text rewrites to hide them.** A masked problem is a worse bug than a visible one.

## 7. Tests — mirror the system, never one flat dump
- **Unit tests co-located**: `sessions.service.test.ts` beside `sessions.service.ts`.
- **Integration / e2e** live in a `tests/` tree shaped like the domains:
  `tests/integration/sessions/…`, `tests/e2e/…`.
- Never a single flat `tests/` folder with everything in it.

## The grounding example
Carl says *"add an endpoint to delete a run."* The right output:
1. `runs.service.test.ts` — a failing test for "deleting a run removes it" (**red**).
2. `runs.service.ts` — the smallest code to pass it (**green**).
3. A slim `runs.controller.ts` exposing `DELETE /api/v1/runs/:id` → `204`.
4. Data access through `runs.repo.ts`.

Same request, same shape, every time.

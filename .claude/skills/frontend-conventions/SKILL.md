---
name: frontend-conventions
description: "Sero's house rules for frontend / UI code (the admin console and the future customer app). Use when writing, naming, structuring, or reviewing any frontend file — components, pages, hooks, types — covering TypeScript with tight contracts, kebab-case role-suffixed file names, composition over inheritance, the mirrored test layout, the 14px minimum text-size floor, and plain user-facing language. Apply before creating or moving frontend files."
---

# Frontend conventions — Sero house rules

These are the standing rules for UI code (`admin/` today; the customer `frontend/` app later). They
keep the UI consistent and accessible without re-deciding it each time.

From Phase 002 onward: **all frontend code is TypeScript** and **all work is test-first** (follow the
`test-driven-development` skill — red → green → refactor).

> This is the starting rulebook. As the customer `frontend/` app is built (Phase 007), extend it —
> don't fork a second set of rules.

## 1. Language — TypeScript, tight contracts
- TypeScript everywhere, `strict` on. Explicit prop types and interfaces.
- **No loose `any`.** Use `unknown` and narrow when a type is genuinely open.

## 2. File names — kebab-case + a role suffix
One responsibility per file. Name it `<thing>.<role>.tsx?`:

| Role | File | Holds |
|------|------|-------|
| Component | `session-card.component.tsx` | One presentational/UI component |
| Page / route | `meeting-prep.page.tsx` | A top-level screen |
| Hook | `use-session.hook.ts` | One reusable piece of logic |
| Types | `session.types.ts` | Interfaces and type aliases |
| Unit test | `session-card.component.test.tsx` | Test that sits **beside** the file it tests |

## 3. Components — small and composed
- Keep components small and single-purpose. **Compose** them; don't build deep inheritance.
- Lift shared logic into a hook, not a base class.

## 4. Accessibility — the hard floor
- **No user-facing text below 14px.** This is a banned-by-default accessibility rule, not a preference.
- Honour it in component styles and shared tokens.

## 5. Plain language — copy and errors
- All user-facing copy and error messages stay **short and jargon-free**.
- An error tells the user what happened and what to do next — in plain words.

## 6. Tests — mirror the system, never one flat dump
- **Unit tests co-located**: `session-card.component.test.tsx` beside the component.
- **e2e** lives in a mirrored `tests/` tree (e.g. `tests/e2e/meeting-prep/…`), not one flat folder.

## The grounding example
Carl says *"add a card that shows a run's status."* The right output:
1. `session-card.component.test.tsx` — a failing test for "shows the run's status" (**red**).
2. `session-card.component.tsx` — the smallest component to pass it (**green**), text ≥ 14px.
3. Any shared logic in `use-session.hook.ts`, types in `session.types.ts`.

Same request, same shape, every time.

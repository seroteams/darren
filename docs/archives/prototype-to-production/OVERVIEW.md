# Prototype → Production — Overview

> **This file is the orchestrator for the whole prototype → production effort.**
> It is two things at once: a plain-language **map** for Carl (read it top to bottom), and the fixed
> **playbook** the AI agent follows to drive the work.
>
> **How Carl uses it:** open this file in your AI agent and say **“what next?”** (or “now what?”).
> The agent then follows the **[Operating protocol](#operating-protocol--for-the-ai-agent)** below,
> does the next single piece, and writes everything to **[PROGRESS.md](PROGRESS.md)** — the living log
> of where we are, what's next, and every decision made. You never have to remember the state; the
> agent reads it from PROGRESS each time.
>
> You don't need to be technical. Each phase has its own folder of plain-language, step-by-step guides.

---

## The goal — why we're doing this (read this first)

**We're not doing this to ship features or to have something to show. We're doing it to find out if
people genuinely want this — badly enough to pay for it.**

The real test of success: a manager in an HR department, or someone running a small business, uses Sero
with their **actual team** and gets results so useful that they come back to Carl and say
**"I need this now — here's my money."** That pull is the goal. Anything short of it is just activity.

What "good results" has to mean — and this is non-negotiable:
- **Real insight, not a mirror.** Sero must tell them something true and useful — **not** polish up and
  repeat back what they already typed. Flattery and echo are *failure*, even though they feel nice.
- **Signal they couldn't easily get on their own.** Spotting **quiet quitting / silent disengagement**
  early, surfacing what's really going on with a person, and what to do about it.
- **Helps them actually run their team** — from both an **HR** angle and a **human/personal** one — so
  managing people feels less like guesswork and more like having a guide.
- **They want more.** The honest sign of fit is *pull*: they come back, they push it on colleagues, they
  get impatient for it.

**How the rest of this document serves that goal.** All the technical work — TypeScript, a real backend,
a database, accounts, organisations, security — exists so real companies can put **real staff data** into
Sero and **trust it**. That trust is the only way we get an honest read on whether the product is good.
The migration is the *means*; a validated, wanted, paid-for product is the *end*.

> **For the AI agent:** keep every decision pointed at this goal. If a step makes the demo prettier but
> doesn't move us toward "a real HR user gets results worth paying for," **say so**. And protect the
> engine's honesty above everything — a tool that flatters managers back to themselves fails the goal no
> matter how clean the code is.

---

## Where we are today (the honest starting point)

Sero works, but it's shaped like a prototype:

- **One big pile.** Code, data, prompts, logs, and notes all live loosely at the top of the repo.
- **No login.** Anyone who opens the app is straight in — there are no user accounts.
- **One app doing two jobs.** The current web UI mixes the *manager's meeting-prep flow* with
  *internal admin screens* (reviewing past runs, comparing versions, editing lexicons). They're tangled together.
- **Files instead of a database.** Everything is saved as JSON files on disk. That's fine for one
  person testing; it doesn't hold up for real users.

None of this means the work is bad — it means it's a prototype. This plan turns it into a product.

## Where we're going (the target)

A clean, organised **monorepo** (one repo, tidy sections) that looks like this:

```
sero/
  backend/        ← the brain: the AI engine + an API-first server (controllers, services, repos)
  admin/          ← the internal console (review runs, compare, edit lexicons) — moved out on its own
  frontend/       ← the NEW customer app: register, login, and the manager prep flow
  packages/       ← the shared "content": prompts, questions, lexicons, scenarios, config data
  scripts/        ← tools and test harnesses (unchanged role)
  logs/           ← run history files (kept on disk, ignored by git except a small test set)
  docs/           ← all planning + reference docs (including this folder)
```

Plus three product upgrades:
1. **An API-first backend** — clear layers so the app can grow without becoming spaghetti.
2. **A real database (Postgres)** — for users and sessions, so multiple people can use it safely.
3. **Register & login** — a proper front door on a new customer-facing frontend.

## Key decisions we've already made

| Decision | What we chose | Why |
|---|---|---|
| Where the AI engine lives | Inside `backend/` (`backend/engine/`) | The API and the command-line tool both use it; keep it in one place. |
| The two frontends | Existing UI → root `admin/`; brand-new `frontend/` for customers | Stop mixing the internal tool with the customer product. |
| Where data-access code lives | Next to each service (e.g. `services/sessions/sessions.repo.ts`) | Each area stays self-contained and easy to find. |
| Database | Postgres, in this pass | Scoped to **organisations + users + sessions** (heavy run logs stay as files on disk). |
| Organisations (multi-tenant) | Every user belongs to an org; **signup creates the org**; basic roles now, invites later | It's an HR system — data is owned by a company, not a lone person. |

## Standing engineering standards (apply to every phase)

These are the non-negotiables the AI applies throughout. They're set up in **Phase 002** and enforced everywhere after.

- **TypeScript, tight contracts.** All code is TypeScript in strict mode with explicit types/interfaces — no loose `any`. (Existing code is converted in **Phase 003**.)
- **Test-Driven Development, red → green.** Every change starts with a failing test, then the code to pass it, then a tidy-up. Uses the installed TDD skill ([obra/superpowers/test-driven-development](https://www.skills.sh/obra/superpowers/test-driven-development)).
- **Tests mirror the system.** Never one flat test folder — unit tests sit beside their code; integration/e2e live in a `tests/` tree shaped like the domains.
- **Clear naming + shallow inheritance.** Files kebab-case with a role suffix (`sessions.service.ts`, `sessions.repo.ts`, `sessions.types.ts`); contracts are interfaces that classes implement; prefer composition over deep class trees.
- **RESTful, versioned API.** Every endpoint lives under `/api/v1/`, using resource nouns + proper HTTP verbs and status codes.
- **Robust database rules.** Postgres with `uuid` keys, `snake_case` plural tables, `timestamptz`, and `jsonb` (never `text`) for structured data — and **every change shipped as a versioned migration file**.
- **Multi-tenant from day one.** Every user belongs to an **organisation**; tenant data carries `org_id` and is scoped by it.
- **Security & privacy built-in, not bolted on.** PII is protected, AI keys never reach the client, and a human security expert reviews before real HR data flows (dedicated pass in **Phase 008**).

## The phases (we do ONE at a time)

We work the Darren Method: finish a phase, **you test and approve it**, *then* we start the next.
We never run several phases ahead.

| # | Phase | What you'll have at the end |
|---|---|---|
| **001** | **Monorepo reorg** | The new folder layout — app, CLI, and tests all still behave exactly as before. Just tidy. *(Still JavaScript; TypeScript comes next.)* |
| **002** | **Conventions & skills** | The house rules written as skills (TypeScript, naming, inheritance, RESTful), the **TDD skill** and **security skills** installed, red/green made law, and the test layout set up. |
| **003** | **TypeScript conversion** | The existing engine + server converted to TypeScript with tight contracts. No behaviour change; the computer now catches mistakes before the app runs. |
| **004** | **Backend API v1** | A clean, **RESTful `/api/v1/`** server in layers (slim controllers → services → co-located repos + middleware), every service built test-first. Still file-backed. |
| **005** | **Postgres foundation** | A real database for organisations, users, and sessions — clear conventions and proper versioned migrations. Run logs stay on disk. |
| **006** | **Auth** | Register/login with strong password hashing, **signup creates an organisation**, basic roles, and structure ready for SSO + teammate invites later. |
| **007** | **Frontend app** | The customer-facing `frontend/` with register/login + organisation signup, wired to the auth API. |
| **008** | **Security** | Security skills installed and green, PII protected, AI keys kept server-only, and a required **human-expert sign-off** — safe for real HR data. |

## How to read each phase folder

Every phase lives in its own numbered folder (e.g. `001-monorepo-reorg/`). Inside:

- **`00-phase-overview.md`** — start here. The goal, what you'll have at the end, a grounding example, and the list of steps.
- **`01-…`, `02-…`** — one step each, in order, written plainly.
- **`99-qa-signoff.md`** — the checklist *you* walk through to approve the phase before we move on.

**Every step file opens the same way**, on purpose:
1. **Goal** — one or two plain sentences.
2. **What you'll have when it's done** — the concrete result.
3. **A grounding example** — a tiny before/after so it's real, not abstract.
4. **The technical detail** — precise instructions (fine to be technical; this is for Carl + the AI).
5. **How to check it worked** — a short test list.

## Operating protocol — for the AI agent

You are the **orchestrator** for this migration. When Carl says **“what next?”**, “now what?”, or
anything similar, do exactly this:

**Step 1 — Read the state.** Open **[PROGRESS.md](PROGRESS.md)**. Find the **active phase** and its **status**.

**Step 2 — Act on the status.** Do **one** thing, then stop and report to Carl:

| Status of the active phase | What you do |
|---|---|
| **`not-started`** (not broken down yet) | **Break it down.** Read that phase's `00-phase-overview.md`, then expand it into numbered step files (`01-….md`, `02-….md`, …) plus `99-qa-signoff.md`, each following the **Carl template** below. **Do NOT start the actual work yet.** Update PROGRESS: status → `planned`, list the steps. Tell Carl what you created. |
| **`planned`** / **`in-progress`** | **Do the next single step** — the lowest-numbered step not yet done. Make the real changes for *that step only*. Update PROGRESS: mark the step done, log what changed and any decisions, set "Next up". Tell Carl how to check it. If it was the last step, set the phase → `awaiting-qa`. |
| **`awaiting-qa`** | **Hand Carl the QA.** Walk him through that phase's `99-qa-signoff.md`. Only when he confirms it passes: set the phase → `done`, offer to commit locally, and announce the next phase is ready (`not-started`). |
| all phases **`done`** | The migration is complete — summarise what shipped. |

**The Carl template — every step file you write opens with these five parts, in order:**
1. **Goal** — one or two plain sentences, no jargon.
2. **What you'll have when it's done** — the concrete result.
3. **A grounding example** — a tiny before → after so it's real.
4. **The technical detail** — precise instructions (technical is fine here; it's for you to execute).
5. **How to check it worked** — a short test list.

**Rules you must never break:**
- **One phase at a time, one step at a time.** Never work ahead. (The Darren Method.)
- **PROGRESS.md is the single source of truth** — update it after *every* action, not only on "what next?".
- **Log every decision** in PROGRESS (with the date), so the log explains itself months later.
- **Don't self-certify.** Carl green-lights each phase via its QA before you move on.
- **Cost control.** Never run anything that hits the OpenAI API (`npm run gate` / `smoke` / `eval`,
  sweeps) without Carl's explicit yes and a rough cost stated first. Default to free checks:
  `npm test`, offline replays.
- **Baseline first.** Before changing code in a phase, run the free checks and note the result, so
  pre-existing failures don't get blamed on the new work.
- **Park, don't expand.** New ideas go into PROGRESS → "Parked", not into the current step.
- **Plain language**, and end each reply with a short **“In simple terms:”** line.

### Talking to Carl (he's not technical)
- **Push back when something feels wrong.** If an answer Carl gives, or a decision he's made, looks
  mistaken, risky, or contradicts an earlier decision, **say so and explain why in plain words** —
  don't just go along with it. Question a bad call *before* building on it.
- **Keep questions simple.** Ask one thing at a time, in plain language, and give a small example so
  he can picture what you mean.
- **When you offer choices, give 2–3 easy options.** Write each in plain words with a one-line "what
  this means", and say which one you'd recommend and why.

---

## Current status

The live state — active phase, next action, decisions, and the full activity log — lives in
**[PROGRESS.md](PROGRESS.md)**. This Overview is the fixed playbook; PROGRESS is what changes.

Right now: Overview + phase skeletons are written, and **Phase 001 is not yet broken down.**
Say **“what next?”** to begin.

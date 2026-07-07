# Phase 009 — Getting ready to share (Alpha readiness)

> **Status:** DRAFT overview for Carl's review. Scope not yet green-lit; nothing built.
> Detailed step files get written when we start the phase — one at a time (Darren Method).

## Goal (plain)
Take Sero from "works for us" to something we can safely put in front of **real managers running
real 1:1s on their real teams** — and, at the same time, get the codebase **clean enough that a new
engineer can read it**. Two audiences, two workstreams.

**Hard prerequisite:** Phase [008 — Security](../✓008-security/00-phase-overview.md). Real staff data
cannot flow until 008's floor is in place (data scoped by org + role, AI keys server-only, human
sign-off). 009 sits on top of it — it does **not** re-do security.

## What you'll have when it's done

### A. Product-ready — real alpha users can safely use it (ship-blockers, do first)
- **Hosted, shareable URL** — not localhost. Somewhere a handful of invited managers can log in.
- **Cost cap + usage monitoring** — real users hit the OpenAI API = real spend. A per-org/usage guard
  so an alpha can't quietly run up the bill, plus a way to watch it.
- **Privacy & consent note** — a plain "here's what we store, who sees it, how to delete it," because
  this is real people's performance data.
- **First-run experience** — onboarding, sensible empty states, a clear "run your first 1:1" path, and
  graceful failure when the model hiccups (no scary stack traces).
- **The built-but-un-QA'd feature pile is resolved** — sent-preview, see-before-sent, stage-data-tabs,
  briefing-readability, todo-board-rebuild each walked through QA and **signed off or cut**, so what
  people see is coherent — not half-finished.
- **A feedback path** — a simple way for testers to tell us what broke.
- **A one-pager** — what Sero is, what to do, what to expect.

### B. Repo-ready — a technical newcomer reads it clean ("CTO-clean")
- **[repo-tidy](../../archive/done/repo-tidy/plan.md) finished** — Phases 3–4 (split `sessions.controller`,
  admin TypeScript pilot) + the parked naming pass and hermetic-test fix.
- **[tracker-consolidation](../../archive/done/tracker-consolidation/plan.md) finished** — Phases 2–4, starting
  by committing the Phase 1 work (`docs/reference/trackers.md`) that's currently sitting uncommitted.
- **Conventions audit** — file naming (kebab-case + role suffix), dead code removed, oversized files
  split, no stray `any`/ignores, every `plan.md` current, and a README a newcomer can actually start from.

## A grounding example (before → after)
- **Before:** Sero runs on Carl's laptop; a manager can't reach it, there's no cap on spend, no first-run
  guidance, and a stack of features are half-QA'd.
- **After:** an invited manager logs into a hosted URL, is guided through their first 1:1, their team's
  data is fenced (008) with a clear privacy note, spend is capped and watched, everything they see is
  finished, and they can send feedback.

## Sequencing (important)
1. **008 first (or folded in as step 0).** It's the gate for real data — non-negotiable.
2. **Then the product-ready ship-blockers (A).** These decide whether a real person can safely use it.
3. **Repo-ready hygiene (B) is real but not user-blocking** — it blocks a newcomer reading the code, not
   a manager using the app. If the fortnight gets tight, B slips before A does.

Run it as a short line of small phases, one at a time, green-lit before the next — not one big push.

## The steps (to be detailed when this phase starts)
1. Confirm 008 is done (or fold its floor in as the first sub-phase).
2. Product-ready: hosting + cost cap → privacy/consent → first-run experience → clear the QA pile →
   feedback path → one-pager.
3. Repo-ready: finish repo-tidy → finish tracker-consolidation → conventions audit.

## How we'll know it's done (full list in `99-qa-signoff.md` when written)
- A real invited manager can log in to a hosted URL and complete a first 1:1 unaided.
- Their data is fenced (008), spend is capped and visible, and there's a plain privacy note.
- No un-QA'd feature is visible — each is signed off or cut.
- repo-tidy and tracker-consolidation are closed; a newcomer README + conventions audit are done.

## Note
This is where Sero meets real people and real HR data for the first time. Safety (008) and "what people
see is finished" matter more than how much ships. Better a small, coherent, safe alpha than a broad, leaky
one. Cut scope into the plan's Parked section rather than rushing a phase.

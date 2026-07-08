# Pre-go-live — Overview

> **This file is the orchestrator for the whole pre-go-live effort.**
> It is two things at once: a plain-language **map** for Carl (read it top to bottom), and the fixed
> **playbook** the AI agent follows to drive the work.
>
> **How Carl uses it:** open this file in your AI agent and say **"what next?"** (or "now what?").
> The agent follows the **[Operating protocol](#operating-protocol--for-the-ai-agent)** below, does the
> next single piece, and writes everything to **[PROGRESS.md](PROGRESS.md)** — the living log of where
> we are, what's next, and every decision made. You never have to remember the state; the agent reads it
> from PROGRESS each time.
>
> You don't need to be technical. Each phase has its own folder of plain-language, step-by-step guides.

---

## The goal — why we're doing this (read this first)

**Prototype-to-production got Sero *safe* to put real staff data into. Pre-go-live makes it *sticky* —
something a manager comes back to.**

The alpha-readiness research was blunt about it: value shows up on the **return visit**, not the first
run. A manager proves willingness-to-pay when they come back next week, find their people and their past
1:1s waiting, and it helps them run the next conversation. That return loop is what this track builds.

What that means concretely — and it's non-negotiable:
- **The manager can come back.** Their past 1:1s are listed, re-openable, and grouped by the person they
  were about. Nothing is a dead end.
- **The tool learns what's useful — honestly.** The manager rates each 1:1 (how useful was it, really?).
  That's real signal, not vanity — a low rating is *information we want*, not something to hide.
- **Carl can see the alpha.** A read-only window on who's registered, their teams, and their runs — so
  Carl can watch adoption and follow up with the 2–3 friendly managers.

> **For the AI agent:** keep every decision pointed at "does this make a real manager come back and keep
> using it?" A prettier screen that doesn't earn a return visit is activity, not progress. And protect
> the engine's honesty — a rating system that quietly buries "this wasn't useful" fails the goal.

---

## Where we are today (the honest starting point)

Sero can run a full 1:1 and fence the data by company and person. But the manager's own home is thin:

- **Team is an empty placeholder.** There's no concept of "the people I meet with" in the data at all —
  a 1:1 only carries a free-text name.
- **Runs is an empty placeholder** — even though the backend to list a manager's own runs already exists.
  The page just isn't wired to it.
- **No rating.** A manager can't tell Sero whether a 1:1 was useful.
- **No admin window.** Carl can't see who's registered across the alpha, their teams, or their runs.

None of this is broken — it's unbuilt. This track builds it.

## Where we're going (the target)

A manager logs in and sees:
- **Runs** — their own past 1:1s, newest first, each re-openable as a read-only briefing, each rated.
- **Team** — the people they've met with, built automatically from those runs: how often, how recently,
  how useful on average. Click a person → that person's 1:1s in one place.

And Carl sees:
- **A superadmin window** — every alpha company, its users, their teams and runs, with ratings — read-only.

## Key decisions we've already made

| Decision | What we chose | Why |
|---|---|---|
| What a "team" is | **Auto-built** from past 1:1s (group by person); explicit roster is later | Matches "manage my past 1:1s" with zero new data entry; a roster can grow on top. |
| How a manager rates a run | **1–5 stars "How useful was this?" + optional note**, editable | Quick, honest, low-friction signal Carl can learn from. |
| Whose data the admin view spans | **All companies (superadmin)**, gated to Carl only, **read-only** | Carl runs the alpha and needs to see everyone — the one intentional wall-crossing, tightly gated. |
| Ship order | **Runs → rating → Team → admin → grow-up** | Fastest path to "a tool they keep using." |
| Where per-run data lives | A **`rating.json` sidecar** in the run folder (like `review.json`) | No DB migration for the alpha; matches the existing pattern. |

## Standing standards (apply to every phase)

Inherited from prototype-to-production, enforced here too:
- **TypeScript, tight contracts** on all backend/new code; `npm run typecheck` clean.
- **Test-first (red → green)** for every backend change; tests mirror the code (`*.test.ts` beside it).
- **RESTful, versioned API** under `/api/v1/`.
- **Multi-tenant fence stays intact** — the per-company (`org_id`) + per-user wall is untouched for
  everyone; the superadmin view is a *separate, gated* path, not a loosening of the fence.
- **Plain language** in every user-facing string and every reply, ending with a short "In simple terms:".
- **Cost control** — nothing that hits the OpenAI API without Carl's explicit per-run yes and a cost
  stated first. This whole track is UI + free endpoints; default to `npm test` / `npm run typecheck`.

## The phases (we do ONE at a time)

We work the Darren Method: finish a phase, **you test and approve it**, *then* we start the next.
We never run several phases ahead.

| # | Phase | What you'll have at the end |
|---|---|---|
| **001** | **Manager Runs list** | The Runs page lists your own finished 1:1s (newest first), with a friendly empty state when there are none. |
| **002** | **Reopen a run** | Click any past 1:1 → a clean, read-only briefing you can re-read. |
| **003** | **Rate a 1:1** | Rate "how useful was this?" (1–5 stars) + an optional note on any finished 1:1; a star shows on the list. Carl sees all ratings. |
| **004** | **Team — auto-built people** | The Team page shows the people you've met with, built from your runs: times met, last met, average usefulness. |
| **005** | **Person detail** | Click a person → all your 1:1s with them, plus their rating history, in one place. |
| **006** | **Superadmin gate** | Carl's account gains a read-only, cross-company key (behind the scenes; proven by tests). |
| **007** | **Admin: who's registered** | Carl sees every alpha company and its users — names, roles, when they joined, how many runs. |
| **008** | **Admin: user → teams → runs** | Carl drills from a user into their people and their 1:1s, with ratings — the full alpha picture. |
| **009** | **Roster + polish** | Add/edit people by hand and merge duplicates; rating roll-ups; tidy empty/loading/error states. |

## How to read each phase folder

Every phase lives in its own numbered folder (e.g. `001-manager-runs-list/`). Inside:
- **`00-phase-overview.md`** — start here. The goal, what you'll have, a grounding example, the steps.
- **`01-…`, `02-…`** — one step each, in order, written plainly (created when the phase starts).
- **`99-qa-signoff.md`** — the checklist *you* walk to approve the phase before we move on.

**Every step file opens the same way, on purpose:**
1. **Goal** — one or two plain sentences.
2. **What you'll have when it's done** — the concrete result.
3. **A grounding example** — a tiny before → after so it's real.
4. **The technical detail** — precise instructions (technical is fine; it's for the AI to execute).
5. **How to check it worked** — a short test list.

## Operating protocol — for the AI agent

You are the **orchestrator** for this track. When Carl says **"what next?"**, "now what?", or anything
similar, do exactly this:

**Step 1 — Read the state.** Open **[PROGRESS.md](PROGRESS.md)**. Find the **active phase** and its **status**.

**Step 2 — Act on the status.** Do **one** thing, then stop and report to Carl:

| Status of the active phase | What you do |
|---|---|
| **`not-started`** (not broken down yet) | **Break it down.** Read that phase's `00-phase-overview.md`, expand it into numbered step files (`01-….md`, …) plus `99-qa-signoff.md`, each following the **Carl template** below. **Do NOT start the actual work yet.** Update PROGRESS: status → `planned`, list the steps. Tell Carl what you created. |
| **`planned`** / **`in-progress`** | **Do the next single step** — the lowest-numbered not-yet-done. Make the real changes for *that step only*. Update PROGRESS: mark the step done, log what changed and any decisions, set "Next up". Tell Carl how to check it. If it was the last step, set the phase → `awaiting-qa`. |
| **`awaiting-qa`** | **Hand Carl the QA.** Walk him through that phase's `99-qa-signoff.md`. Only when he confirms it passes: set the phase → `done`, offer to commit locally, and announce the next phase is ready (`not-started`). |
| all phases **`done`** | The track is complete — summarise what shipped. |

**The Carl template — every step file opens with these five parts, in order:**
1. **Goal** — one or two plain sentences, no jargon.
2. **What you'll have when it's done** — the concrete result.
3. **A grounding example** — a tiny before → after so it's real.
4. **The technical detail** — precise instructions (technical is fine here; it's for you to execute).
5. **How to check it worked** — a short test list.

**Standing per-phase expectations (apply to every phase — added after the CTO review):**
- Every new screen ships its **own** loading, empty, and error state. States are **not** warehoused into a
  later "polish" phase — a screen isn't done until its three states are.
- User-facing text stays plain and **≥14px**; interactive controls (the star rating especially) are
  **keyboard- and screen-reader-operable** with visible focus.
- **On phase close:** tick STATUS.md + PROGRESS.md and refresh the how-it-works changelog (CLAUDE.md §6).

**Rules you must never break:**
- **One phase at a time, one step at a time.** Never work ahead. (The Darren Method.)
- **PROGRESS.md is the single source of truth** — update it after *every* action.
- **Log every decision** in PROGRESS (with the date), so the log explains itself months later.
- **Don't self-certify.** Carl green-lights each phase via its QA before you move on.
- **Cost control.** Never run anything that hits the OpenAI API without Carl's explicit yes + a stated
  cost. Default to free checks: `npm test`, `npm run typecheck`.
- **Baseline first.** Before changing code in a phase, run the free checks and note the result, so
  pre-existing failures don't get blamed on the new work.
- **Keep the fence intact.** The per-company + per-user data wall is untouched for everyone; the
  superadmin path is separate and gated. Any wall-crossing gets a test proving non-superadmins are refused.
- **Park, don't expand.** New ideas go into PROGRESS → "Parked", not into the current step.
- **Plain language**, and end each reply with a short **"In simple terms:"** line.

### Talking to Carl (he's not technical)
- **Push back when something feels wrong.** If a decision looks mistaken, risky, or contradicts an
  earlier one, say so in plain words — don't just go along with it.
- **Keep questions simple.** One thing at a time, plain language, a small example so he can picture it.
- **When you offer choices, give 2–3 easy options** with a one-line "what this means" and your recommendation.

---

## Current status

The live state — active phase, next action, decisions, and the full activity log — lives in
**[PROGRESS.md](PROGRESS.md)**. This Overview is the fixed playbook; PROGRESS is what changes.

Right now: Overview + phase skeletons are written, and **Phase 001 is not yet broken down.**
Say **"what next?"** to begin.

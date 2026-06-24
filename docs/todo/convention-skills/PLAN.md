# House rules — Conventions & Skills (Prototype → Production · Phase 002)

**Goal:** Teach the agent our standards *once* as auto-loaded skills — install a test-first skill and security skill(s), write two plain rulebooks (backend + frontend), and wire the project guide so the right rulebook opens automatically.
**Driver:** Carl
**Created:** 2026-06-24
**Tracks:** the bigger plan in [../../prototype-to-production/002-convention-skills/00-phase-overview.md](../../prototype-to-production/002-convention-skills/00-phase-overview.md). When this is done + approved, update that effort's `PROGRESS.md` (Phase 002 → `done`).

## Done means
- Every skill (TDD + security + our two rulebooks) **loads/triggers without error**.
- Every guide link **resolves to a real file** — no dead links.
- One small **test-first change** lands (red → green) in correctly-named files following the new rulebook.
- Carl opens the guide and the **right rulebook surfaces** for backend vs frontend work.

**Out of scope (park it):** applying the new conventions across the existing codebase — that's Phase 003+. This phase is skills, rulebooks, wiring, and one tiny proof change only.

## The steps
| # | Step | What it lands | Status |
|---|---|---|---|
| 1 | Shop around for proven rules | Borrow-vs-build survey (below) for Carl's pick | ✅ **survey done — Carl picked Option 1** |
| 2 | Install the quality skills | Chosen TDD + security skill(s) installed; each verified to load/trigger | ⬜ |
| 3 | Write our own rulebooks | `backend-conventions` + `frontend-conventions` skills | ⬜ |
| 4 | Set up the safety tooling | Strict `tsconfig` + lint + mirrored `tests/` layout | ⬜ |
| 5 | Point the AI at the rules | `CLAUDE.md` wired so the right rulebook auto-loads; links resolve; one tiny test-first proof change | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

> Detailed per-step files (`01-…md` … `99-qa-signoff.md`) get written **after** Carl locks the borrow-vs-build picks below — because the picks shape steps 2 and 4. Writing them now would be guessing.

## Current state
**Baseline:** `npm test` → **30/30** (2026-06-24, free/offline). Known-good.

**Step 1 done (this pass):** borrow-vs-build survey written below from real research on skills.sh / GitHub. Nothing installed yet — waiting on Carl's pick before any code.

---

## Step 1 — Borrow vs build: the survey (for Carl's pick)

I looked at what the community has already proven, so we borrow what's solid and only hand-write what's truly *ours*. Three categories: **test-first**, **security**, **our house conventions**.

### A) Test-first (TDD) skill — **recommend: BORROW**

| Option | What it is | Verdict |
|---|---|---|
| **`obra/superpowers/test-driven-development`** *(recommended)* | The single, focused red→green→refactor skill the plan already names. Language-agnostic (examples use Jest but the rules are universal). Auto-trigger: "use when implementing any feature or bugfix, before writing implementation code." Part of the 89k★ *superpowers* framework — but we take **just this one skill**, not the whole framework. | ✅ Borrow it. It's exactly our "red→green as law" rule, already battle-tested. |
| Write our own TDD skill | Re-explain red→green ourselves. | ❌ Reinventing a solved, well-written thing. |
| Install the **whole** superpowers framework | 100+ skills, heavy, opinionated planning/subagent machinery. | ❌ Too much. We want one rule, not a second operating system. |

**Install (step 2):** `npx skills add https://github.com/obra/superpowers --skill test-driven-development`
**Pre-install check (honesty):** confirm the repo's licence allows reuse, and read the SKILL.md before enabling (don't run a third-party skill unseen). I couldn't confirm a LICENSE file from the web page — I'll verify it at install and report before enabling.

### B) Security skill(s) — **recommend: BORROW one general one now, PARK the heavy kit for Phase 008**

| Option | What it is | Verdict |
|---|---|---|
| **`getsentry/skills` → `security-review`** *(recommended now)* | General-purpose security code-review skill, Apache-2.0. Reviewers rate it the standout because it teaches the agent *how to think about security* rather than handing it a stale checklist — catches real issues without drowning you in false positives. | ✅ Borrow just this one skill now. Right weight for our stage. |
| **`trailofbits/skills`** | The gold-standard pro kit (CodeQL/Semgrep static analysis, audit + variant-analysis + fix-verification workflows). Heavy, audit-grade. | ⏸️ **Park for Phase 008 (Security).** Overkill today; perfect when real HR data is about to flow. |
| Sentry's `django-*` skills | Python/Django-specific. | ❌ Not our stack (Node/TypeScript). |
| `gha-security-review` | GitHub-Actions workflow security. | ❌ We don't run CI workflows yet. Revisit if/when we do. |

**Install (step 2):** `npx skills add getsentry/skills` then enable **only** `security-review` (the package carries Django/GHA skills we don't want auto-loading).
**Caution flagged by reviewers:** community skills are unvetted code — I'll read each SKILL.md before enabling, and confirm none auto-trigger on every prompt and slow things down.

### C) Our house conventions (backend + frontend rulebooks) — **recommend: BUILD**

| Option | What it is | Verdict |
|---|---|---|
| **Write `backend-conventions` + `frontend-conventions` ourselves** *(recommended)* | Our exact naming (`sessions.service.ts` etc.), folder layout, interfaces-first contracts, RESTful `/api/v1/` rules, error handling, and the **engine-honesty rule** (surface raw model output, never mask). No community skill encodes *our* house style. | ✅ Build. This is the part that's genuinely ours. |
| Borrow a generic "clean code"/TS-style skill | Generic style packs exist. | ❌ They'd fight our specifics and our honesty rule. Borrowing here creates conflicts, not shortcuts. |

We *will* borrow **structure**: use obra's `writing-skills` guidance as a template for *how* to author a skill that reliably triggers — but the content is ours.

---

### The pick — ✅ LOCKED: Option 1 (Carl, 2026-06-24)
**Borrow TDD (`obra/superpowers/test-driven-development`) + one general security skill
(`getsentry/skills` → `security-review`); park Trail of Bits for Phase 008; build our two rulebooks
(`backend-conventions` + `frontend-conventions`) ourselves.**

Next: step 2 — run the two installs, read each SKILL.md + confirm licence before enabling, verify each
loads/triggers. Installs run downloaded third-party code into the repo, so I pause for Carl's explicit
go before running them. (No OpenAI cost — these are local skill installs, not pipeline runs.)

## Parked
- Trail of Bits security kit → Phase 008.
- `gha-security-review` → only if/when we adopt GitHub Actions.
- Applying conventions across the existing JS codebase → Phase 003+.

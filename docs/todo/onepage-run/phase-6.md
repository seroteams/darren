# Phase 6 — "The language of this role" section

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 (built 2026-06-14 — backend verified free; on-page render needs a live walk)

Flow position: **between the prep brief and the interview** (Carl: "show all the lexicons and language found on that job, in between here"). Chosen data = the **role's vocabulary** (the role profile's `terminology`), not the post-interview "Phrase library" lexicon.

## Goal
After the prep brief, show a read-only **"The language of this role"** section — a glossary of the ~10 terms this job uses (term + plain meaning) — then a "Continue to interview" button. If there's no vocabulary (edge case), skip straight to the interview.

## Changes
- New read-only endpoint `GET /api/role-profile?s=<sessionId>` → `frontend/server/handlers/role-profile.js` (`getSession` → `loadRoleProfile(ctx)` → `{ ready, terminology }`), registered in `frontend/server/server.js`. No model call, no cost.
- `frontend/client/src/api.js`: `getRoleProfile(sessionId)` wrapper.
- `frontend/client/src/stages/onepage.js`: prep's "Continue to interview" now fetches the role vocabulary and appends the glossary section first; its "Continue to interview" runs the existing `startInterviewFlow()`.
- `frontend/client/src/styles/design.css`: `.flow-glossary` (term/meaning rows, stacks on narrow screens).

## Not in this phase
- The post-interview "Phrase library" / lexicon feature (separate, runs after the interview).
- Any change to how the role profile is generated (we only read the cached one).

## Done when
- [ ] In a one-page run, the role-vocabulary section appears after the prep brief and before the interview.
- [ ] It lists the job's terms with plain meanings; "Continue to interview" proceeds.
- [ ] `npm test` green; endpoint returns the role's terms.
- [ ] Product owner has tested the scenario below and said go.

## Verified so far (free)
- `npm test` 23/23. `GET /api/role-profile?s=<real session>` → `ready:true`, 10 terms (verified via API and through the browser/proxy). Module parses + mounts clean.
- **Not yet seen live on-page** — reaching prep needs a paid walk; fold into the next Phase 3 interview walk.

## Test scenarios — for the product owner
Walk through in a normal browser at localhost:3000 → One-page run.
1. **Language appears in the right place** — go setup → focus → prep brief → click "Continue to interview". Before the interview starts, a **"The language of this role"** section should appear with a list of terms + plain meanings for the job (e.g. for a UX Lead: User research, Wireframe, Prototype…). ❌ Not OK if it's empty for a normal role, or appears in the wrong spot.
2. **It continues** — click "Continue to interview" on that section. The interview (questions) should start as normal below. ❌ Not OK if it dead-ends or skips the section unexpectedly.
3. **Reads plainly** — the meanings are short, plain-language, and match the job. ❌ Not OK if it's jargon-y or clearly the wrong role.

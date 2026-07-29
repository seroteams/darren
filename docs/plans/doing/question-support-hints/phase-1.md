# Phase 1 — Bank questions carry real coaching lines

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl's walk

## Goal
The questions generated before a meeting each carry 1–3 coaching lines written for that question, and those lines survive being saved and read back.

## Changes
- `content/prompts/generate-questions.md` — teach the bank stage to write up to 3 tagged coaching lines per question ("how to ask" / "listen for"), grounded in that question's own angle. Worked example updated; the prompt's "never emit other fields" rule updated so `hints` is legal.
- `backend/engine/questions.ts` — the in-house YAML codec learns arrays of simple objects, so `hints` writes and reads properly instead of `[object Object]`. Round-trip test.
- The 22 already-corrupted YAML files: the broken `hints:` line stripped (they keep working as questions; regenerating real lines for them is parked).
- Tests: codec round-trip, prompt-contract test, existing generator tests updated.

## Not in this phase
- Mid-meeting planner questions (Phase 2).
- "Following up on..." thread-follows (Phase 3).
- Any panel or design change — the Support view already renders these.

## Done when
- [ ] A saved question file on disk shows real readable coaching lines, and reading it back returns the same 3 lines (round-trip proof, not routing).
- [ ] `npm test` + `npm run typecheck` green.
- [ ] ONE smallest paid proof that the model actually writes usable lines: `node scripts/gate.js --only <case>` (~$0.35), with Carl's nod at that moment.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
`local > admin (dev autologin) > start a new 1:1 > questioning screen > Support tab`
1. **Lines are about THIS question** — walk the first 3 questions. Each shows 1–3 lines that only make sense under that question. ❌ Not OK if a line would sit equally well under any other question, or if the "From your prep brief" fallback still shows on a normal generated question.
2. **They change** — click through to the next question. The right-hand lines change with it. ❌ Not OK if they stay the same.
3. **They survive** — reload the page mid-meeting. Same lines come back for the same question.
4. **Plain English** — no jargon, nothing that reads as a verdict on the person.

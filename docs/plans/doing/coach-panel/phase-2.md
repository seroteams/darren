# Phase 2 — Support hints

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Every generated question carries up to 3 short coaching hints ("How to ask" / "Listen for"), shown in the coach panel behind the POC's Support/Live-scores toggle.

## Changes
The ~14 touchpoints mapped in the research (§A of the report):
- `content/prompts/generate-questions.md` + the generator's JSON schema + mint — the bank stage writes 3 hints per question (gpt-5.4-mini; ~+$0.01–0.02/run).
- `backend/shared/question.types.ts` (`Question` + `WireQuestion`) and the hand-written wire literal in `sessions.service.ts` — hints travel to the browser.
- YAML codec (`backend/engine/questions.ts`) list support, or keep hints DB-only — decided at build time, smallest honest option.
- Coach panel: Support view + the toggle; questions without hints (planner-minted mid-run) show the role-profile "listen for" lines, clearly labelled as role-level guidance — or nothing. Never invented per-question hints.
- Affected tests + seed YAMLs updated.

## Not in this phase
- Planner emitting hints live (parked — cache-cliff risk).
- Any change to scoring or the Live-scores view.

## Done when
- [ ] A cassette/fixture run shows hints flowing bank → DB → wire → panel offline ($0).
- [ ] ONE smallest paid proof for hint QUALITY: `node scripts/gate.js --only <case>` (~$0.35) — with Carl's nod at that moment.
- [ ] `npm test` + typecheck green; screenshot of the real rendered Support view.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
`local > admin (dev autologin) > start a 1:1 > questioning screen > Support toggle`
1. **Hints appear** — on a fresh 1:1, each generated question shows 1–3 hints tagged "How to ask" / "Listen for", specific to THAT question. ❌ Not OK if hints read as generic filler that could sit under any question.
2. **The toggle** — flip Support ↔ Live scores; both views keep working through several questions.
3. **The honest fallback** — when a mid-conversation follow-up question appears (the engine mints these live), the panel either shows role-level lines labelled as such, or no hints — never fake question-specific ones.
4. **Nothing leaks** — log in as a member (not manager): no hints anywhere in their views.

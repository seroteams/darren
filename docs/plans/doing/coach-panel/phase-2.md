# Phase 2 — Support hints

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built (contract + panel), awaiting Carl's walk — one piece deferred

## Built (2026-07-19)
- **Contract carries hints, end to end.** New `QuestionHint {kind:"ask"|"listen", text}` on `Question` + `WireQuestion` ([question.types.ts](../../../backend/shared/question.types.ts)); optional in the generator `RESPONSE_SCHEMA`; a `toHints` gate mints ≤3 clean tagged hints in both the bank mint and the seed loader ([question-generator.ts](../../../backend/engine/question-generator.ts)); the `/question` wire literal carries `hints` when present and omits them otherwise ([sessions.service.ts](../../../backend/api/services/sessions/sessions.service.ts)).
- **Panel: the Support / Live-scores toggle** (POC), Support view renders the "How to ask" / "Listen for" pills; honest empty state when a question has none. `cleanHints` validates wire data ([coach-panel.ts](../../../admin/src/ui/coach-panel.ts) + coach-panel-state.ts).
- **Proof (all $0):** 158/158 tests incl. new ones — wire carries hints when present + omits when absent (real service), `toHints`/schema/`cleanHints` units; typecheck + lint:tokens clean. On-screen: toggle + honest empty state on the live split ([shots/phase2-support-empty.png](shots/phase2-support-empty.png)); the populated Support view rendered by the shipping component fed the exact wire shape the service emits ([shots/phase2-support-populated.png](shots/phase2-support-populated.png)).

## ⚠️ Deferred / honest gaps (needs Carl to know before green-light)
1. **The generation PROMPT is not edited yet** — `content/prompts/generate-questions.md` (+ its example + the hard "never emit other fields" rule) is inside another live chat's lane (promises-loop). Until it's edited to WRITE hints, no generated question carries any. Carl chose "build the rest now, prompt last" (2026-07-19).
2. **File/seed YAML can't store hints** — the in-house YAML codec (questions.ts) has no array support (a listed touchpoint I did NOT extend, to keep scope tight). Seeds + file-mode questions therefore never carry hints; only the live Postgres `generated_questions.doc` jsonb path does. So on a local file/seed-heavy walk the Support view stays on its empty state — real hints appear once the prompt lands and questions come from the DB path (or the codec is later extended).


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

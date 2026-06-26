# TypeScript Conversion (Prototype → Production · Phase 003)

**Goal:** Convert the existing JavaScript engine + server to **TypeScript with tight contracts**, so
everything built after this stands on typed, checked code. **Nothing behaves differently** — this is
safety, not features.
**Driver:** Carl
**Created:** 2026-06-24
**Tracks:** the bigger plan in [../../prototype-to-production/003-typescript-conversion/00-phase-overview.md](../../prototype-to-production/003-typescript-conversion/00-phase-overview.md). When this is done + approved, update that effort's `PROGRESS.md` (Phase 003 → `done`).

## Done means
- `backend/engine/` + the server (`backend/api/`, `cli`) converted from `.js` to `.ts`, **strict mode on**.
- **Shared types** for the core shapes (session, focus point, question, axis state, briefing, evaluation)
  so modules agree on exact contracts.
- `npm run typecheck` clean (no `any` in converted code) **and** `npm test` green at every step.
- The app and CLI behave **exactly as before** — Carl walks a real run + the CLI and sees no difference.
- **End-of-phase QA agency (Carl's instruction, 2026-06-24):** before final sign-off, run a multi-agent
  adversarial review of **all** converted code — behaviour drift, correctness, stray `any`/`as`/`@ts-ignore`,
  every importer specifier correct, no orphaned `.js` — then **fix everything it finds**. This runs *after*
  the conversion is complete, before the owner-walk + paid gate case.

**Out of scope (park it):** see the survey — depends on Carl's scope pick. New features, refactors,
or behaviour changes are *never* in this phase.

## The steps (DRAFT — detailed `phase-N.md` files written **after** Carl locks the picks below)
| # | Step | What it lands | Status |
|---|---|---|---|
| 1 | Lock scope + strategy (survey below) + de-risk | Carl's picks + a green proof that tests can import converted `.ts` engine modules | ✅ |
| 2 | Define shared core types | `backend/shared/` contracts — session, focus point, question, axis state, briefing, evaluation | ✅ |
| 3 | Convert engine leaf modules (test-first) | lowest-dependency engine files → `.ts`, tests green | ✅ |
| 4 | Convert engine core | up the dependency graph, tests green at each step | ✅ |
| 5 | Convert the API server | `backend/api/` → `.ts` | ⬜ |
| 6 | Convert CLI + final sweep | `cli.ts`; remove stray `any`; `typecheck` clean repo-wide | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

> The step count/shape will firm up once the scope pick is locked — a backend-only scope is ~6 steps;
> adding tooling or the admin UI adds more. Writing the detailed files now would be guessing.

## Current state

**API infra layer ✅ (2026-06-26, typecheck clean + npm test 30/30 + free require-boot test):** step 5 begun.
The 8 leaf-most `backend/api/` files — `router`, `sse`, `static`, `persona-script`, `selected-focus` (the api
helper, NOT the handler), `session-persistence`, `sessions`, `handlers/stream-helper` → `.ts`. Pure plumbing,
no live-AI paths, fully covered offline by `test-session-resume`/`test-persona-bench`/`test-back-nav`. Reuses
shared `Session`/`MeetingContext`/`AxisState`/`Question`/`FocusPoint` (the shared `Session` type was written in
step 2 *for* this). New exported API contracts: `RequestContext`/`RouteHandler` (router), `SseStream` (sse),
`Persona`/`ScriptedQuestion` (persona-script). **~22 importers flipped** repo-wide (all handler `.js` + `server.js`
+ scripts `test-session-resume`/`test-persona-bench`/`test-back-nav`). No `any`/`as`/`@ts-ignore`/`!`.
**Judgment calls surfaced to Carl:** (a) `session-persistence` uses a *documented loose guard*
`isPersistedSession(v): v is PersistedSession` — on-disk state is the closed output of `serialize()`, and the
original only checked `if (!s.id)`; `hydrateSession` still backfills the legacy-optional fields (axisState,
turnSnapshots, agenda*). (b) `createWebSession` now sets `completedAt: null` explicitly (the shared type requires
`number | null`; `serialize`/`snapshot` already did `?? null`, so byte-identical downstream). (c) `selected-focus`
helper: dropped the dead `typeof p === "string" ? p : p?.id` object-branch — the handler only ever stores
`string[]` (trimmed ids), so the branch was unreachable; behaviour identical. **API `.js` left: 29** (28
handlers + `server.js`), plus `backend/cli.js` (the engine entrypoint). Next: the 28 handlers, then `server.js`.

> ### ⏩ HANDOVER (2026-06-26 EOD) — read this first
> **Phase 003, step 3 (convert piece by piece) — well underway.** Baseline: `npm test` = **30/30 green**, `npm run typecheck` clean.
> **Done this session (committed):** answer-suggester, opener, intro-queue, closer, the full lexicon chain (review-core, cli-interactive, lexicon-reviewer), and **queue-manager** (1152 lines — the biggest; agent-drafted + line-by-line reviewed, 30/30 incl. its 6 internal tests + replay-regression).
> **Engine `.js` left: 0 — `backend/engine/` is 100% TypeScript** ✅ (verified by a free CLI boot-test: `require('./backend/cli.js')` loads every module + all 5 cli/stages and renders). **Remaining for Phase 003: `api/` (37 files) + `backend/cli.js` (the entrypoint shell).**
> **➡️ NEXT STEP:** the API server — `backend/api/` (37 files: handlers, routes, server). Then `backend/cli.js`. Then **step 6** (final sweep) + the **end-of-phase QA-agency review** + Carl's owner-walk + one paid gate case.
> **The per-module process (every module):** ① read the `.js` + grep its importers **repo-wide** (incl. `evals/`, `scripts/`) ② write the `.ts` (faithful — same logic, only types) ③ `git rm` the `.js`, flip every importer's specifier to `…/x.ts` (or `.mts`) ④ `npm run typecheck` clean + `npm test` 30/30 ⑤ commit locally **only after Carl's green light** (he walks QA; you don't self-certify) ⑥ update this Current state.
> **Hard rules:** NO `any`/`as`/`@ts-ignore`/`!` — narrow disk/model `unknown` with the house `isObjectRecord`/`asString` guards; honest no-op `?? `/`?.` for `noUncheckedIndexedAccess`; reuse shared types (`backend/shared/*.types.ts`). **No paid runs** (anything hitting OpenAI — gate/smoke/eval/live replay) without Carl's explicit yes for that run; free checks only (`npm test`, `npm run typecheck`). Leave `content/questions/_index.json` **unstaged** (unrelated artifact). Big modules: agent-draft → review line-by-line → integrate.
> **Hard gate before phase sign-off:** after ALL conversion, run the end-of-phase multi-agent adversarial review (see "Done means"), fix everything, then Carl's owner-walk + one paid gate case. Live AI paths (planner/reviewer/prep/etc.) are type+test-verified but behaviour-deferred to that owner-walk.

**reviewer ⇄ golden-checks ✅ (2026-06-26, committed `5dcef5ab`, typecheck clean + npm test 30/30):** the **circular pair** (761 + 555),
converted together in ONE commit — the last big-risk step. The lazy `require("./golden-checks")` that broke the load cycle became a
top-level ESM import; the cycle is safe via **ESM live bindings** (both crossed bindings — `applyManagerBriefingPostProcess`,
`ruleEchoAxisIds` — are function declarations used only at call time, never at module load; **verified loading in BOTH orders**).
Faithful + types-only (no `any`/`as`/`@ts-ignore`/`!`): the post-process/gate fns are typed against the shared `Briefing` with every
defensive guard kept verbatim; model output narrowed via a documented `isEvalBriefing` guard (the queue-manager parseAIJson pattern);
golden-checks' 3 *other* lazy requires (role-profile/questions/one-on-one-types) hoisted to top-level imports (verified no back-edge
cycle). **19 importers** flipped repo-wide (api ×1, engine ×4 incl. preparation/question-generator, evals, scripts ×13). Judgment
calls surfaced to Carl: (a) one **unreachable** micro-deviation — if the evaluator ever returned non-array `axes` (schema-impossible),
mine routes to the deterministic GENERATION_FAILED fallback vs the original's degenerate ship; (b) dropped a dead `transcript` arg
from two `validateQuestionBeforeShow` calls (the fn only reads `{name,answer}` — always ignored). **Pre-existing latent gap flagged,
NOT fixed (out of scope):** `evaluate`'s `flag:"GENERATION_FAILED"` handed to `logStage` is silently dropped (logStage only writes
inputs/prompt/response/final) — cosmetic, the fallback briefing still carries `generation_failed:true`. Live evaluator call is paid →
behaviour deferred to the owner-walk. **Engine `.js` left: 3 root / 8 incl. subdirs.** Next: `preparation`, `question-generator`.

**preparation ✅ (2026-06-26, committed `5fbe36a5`, typecheck clean + npm test 30/30):** 365-line prep stage-runner → `.ts`.
Reuses shared `PreparationResult`; the model brief (parseAIJson `unknown`) is **materialised** into a typed `PrepBrief` via the house
`asString`/`asRecord` guards (the generate.ts construction pattern — byte-identical to the raw object since the wire schema is closed);
`RawPrepInput`/`PrepInput` contracts pin the shared assembly path (buildPrepInput → buildMessages, used by both live + preview).
`findJargon` now from the converted golden-checks. **9 importers** flipped (engine/index, api ×2, scripts ×5, smoke); the `handlers/preparation`
*handler* require (a different `./preparation`) correctly left untouched. Live AI path paid → behaviour deferred.

**question-generator ✅ (2026-06-26, committed `18c2ad7e`, typecheck clean + npm test 30/30):** 338-line bank generator → `.ts`.
Reuses shared `Question`/`QuestionPurpose`; model output narrowed with the house `asRecord`/`asString` guards, and `toAxisObject` mirrors
queue-manager's wire→object axis coercion (`isObjectRecord(e) && typeof e.axis === "string"`); the lazy `require("./questions")` for the
seed-bank fallback hoisted to the existing top-level import (no cycle). Prep-opener placement helpers typed against `Question[]`.
**7 importers** flipped (api ×2, cli/stages ×2, engine/index, scripts ×2; the `admin/dist` hit is a built doc-string, not an import).
Live AI path paid → behaviour deferred. **Engine `.js` left: 1 root / 6 incl. subdirs** — only `index` + the 5 `cli/stages/*`.

**engine/index ✅ (2026-06-26, committed `3d392164`, typecheck + npm test 30/30):** the 30-line re-export barrel → ESM
(`import`/`export`; `...budgets` → `export * from "./budgets.ts"`). `cli.js`'s `require("./engine")` flipped to the explicit
`./engine/index.ts` — Node's directory-index resolution never finds `index.ts` (same lesson as the one-on-one-types barrel).

**cli/stages ×5 ✅ (2026-06-26, committed `0c46349e`, typecheck + npm test 30/30 + CLI boot-test) — ENGINE NOW 100% TS:**
`focus-points`, `preparation`, `question-bank`, `questioning`, `evaluation` → `.ts`; `cli.js`'s 5 stage requires flipped. Verified
by a **free CLI boot-test** (`require('./backend/cli.js')` loads every stage + the whole engine graph and renders the menu) on top
of typecheck + 30/30 — which **caught & fixed 3 latent broken bare-requires the suite never sees** (the stages still `require`d
`../../preparation` and `../../closer` after those became `.ts`; the CLI was silently broken). Faithful, types-only; reused shared
`Question`/`MeetingContext`/`TranscriptEntry`/`PreparationResult`/`CostTracker`; `plan` typed via a local `TurnPlan` the planner
result + the planner-failed fallback both satisfy. **Three supporting type-corrections the conversion surfaced (committed with it):**
(a) reviewer `ReadTurn.question` `{name}|null`→`unknown` (eval stage passes question as a name *string*, the fallback test as a
`{name}` object; narrowed in `buildFallbackBriefing`); (b) reviewer `axisState` `AxisState`→`Pick<AxisSlot,'score'|'history'>`
(`evaluate` receives the *serialized* axis state, not the live one); (c) `session.types` `TranscriptEntry.unbooked_signal`
`string[]`→`{axis,raw,booked,reason}[]` (mistyped — `planTurn`'s clamp emits objects, stored as-is). `question-generator`
`generateBankWithFallback` now returns `Question[]` via a faithful `seedToQuestion` materialiser (seeds are saved Questions;
`axis_effects` read as the stored object, not the wire array). **Engine `.js` left: 0.** Next: `api/` (37) + `cli.js`.

**Scope locked: A (backend only).** Frontend + `scripts/` tooling parked (brief: "don't touch frontend").

**Step 1 ✅ (approved).** Strict mode confirmed *already on* (Phase 002 set it). Leaf-first order mapped
(survey below). JS↔TS import boundary proven in a scratchpad: a `.ts` module resolves only via an
**explicit `.ts` specifier**, so every importer's `'./x'` must become `'./x.ts'` when `x` converts
(including the `scripts/test-*.js` harness). CJS-require-of-`.ts` and `.ts`-import-of-CJS-`.js` both work.

**Step 2 ✅ (committed `b5e94c07`).** Shared core types: `backend/shared/{cost,question,briefing,session}.types.ts`.

**Step 3 🔨 (overnight progress — leaf-first conversion underway).** Converted **18 modules** to TypeScript
in 6 green commits (each: convert → flip importers → `npm test` 30/30 + `typecheck` clean → commit):
- **All of L0 (11):** question-validator, budgets, meeting-types, agenda, selected-focus, prompt-utils, ui,
  ask, relational-arcs, lexicon/schema, **paths** (as `paths.mts` — see decision).
- **L1 so far (7):** env, models, rules, prompt-version, cost, run-fingerprint, one-on-one-types/_shared/prompts.
  (cost + run-fingerprint validate the shared cost/RunFingerprint contracts; refined `CostTracker.record` to
  accept optional `usage`.)
- **Post-overnight (this session, all committed):** `pipeline-lock` (4 importers), `axes` (reuses shared
  `AxisState`/`AxisSlot`; 13 importers), `questions` (YAML codec + index IO; reuses `Question`; 15 importers —
  agent-drafted, reviewed+corrected), `briefing` (CLI renderer; reuses `Briefing`/`NextAction`; 1 importer),
  `ai-client` (OpenAI+Gemini raw-fetch client; reuses `OpenAiUsage`; 13 importers — agent-drafted,
  reviewed+corrected). Each: typecheck clean + `npm test` 30/30 + smoke. **ai-client caveat:** its live
  fetch/retry network path can't run offline (paid API) — verified by review + types + pure-helper smoke;
  behavioural proof deferred to the owner-walk. **Noted:** `axes` carried a pre-existing unused `node:path`
  import — kept (not deleted) per the dead-code rule; flag for a later cleanup. (Agents used: 2 read-only
  drafters for the two big modules; integration kept serial; I reviewed every draft against the original.)

**⚠️ DECISION made overnight (needs Carl's nod):** `paths` needs its own directory, which is ESM-only
(`import.meta.dirname`). tsc treats a `.ts` as CommonJS (no `"type":"module"` — the ~80 remaining `.js` are
still CJS) and rejects `import.meta` (TS1470). Fix used: the **`.mts` extension** (tsc *and* Node both treat
it as ESM). Only `paths` (now) and `api/server.js` (later) ever need this. Alternative: tsconfig
`module:"preserve"` (all `.ts` → ESM). Chose `.mts` as most-local / lowest-risk; added `backend/**/*.mts` to
the typecheck includes. **Easy to switch if you prefer the tsconfig route.**

`session` ✅ committed (engine logging helper; 15 importers). **Safe frontier now fully cleared.**

**Lexicon trio ✅ done** (`lexicon`, `lexicon/candidates-io`, `lexicon/promote-core`) — hand-converted,
faithful in-place mutation via typed same-ref locals (preserves untouched fields/key-order); fixed a U+001F
id-delimiter escape mid-conversion. Each: typecheck clean + `npm test` 30/30 + smoke.

**Up-the-graph progress (this session, all committed, each typecheck + npm test 30/30 + smoke):**
`cli/io`, `cli/run-rating`, `prompt-fixer`, `run-history`. (Running total converted this session: 13 modules
+ the lexicon trio.) Engine `.js` left after that session: **19 root / 32 incl. subdirs**; then **`api/` (37 files)** + `cli.js`.

**New-session progress (2026-06-26, committed, typecheck clean + npm test 30/30):** converted `person-profile`
(3 importers; reuses shared `NextAction` and run-history's walked-run / review-summary shapes; narrows disk
JSON via the run-history helper pattern) and `review-html` (1 importer; pure static-HTML render with **no unit
test** → verified by a free read-only smoke that rendered a real run to a 25 KB valid page). **Engine `.js`
left now: 17 root / 30 incl. subdirs.**

**arc-overlay ✅ (2026-06-26, committed, typecheck clean + npm test 30/30):** 3 importers; `applyOverlay` now
typed against a new **shared `MeetingType` contract** (`backend/engine/one-on-one-types/_shared/meeting-type.types.ts`)
that the one-on-one-types cluster will reuse. Pulled **ahead** of where it sits in the wave list below, because
`index` imports its `applyOverlay` and arc-overlay's own deps (`questions.ts`, `paths.mts`) were already done —
strict leaf-first. Covered by `test-arc-overlay`. **Engine `.js` left now: 16 root / 29 incl. subdirs.**

**one-on-one-types cluster ✅ (2026-06-26, committed, typecheck clean + npm test 30/30):** 5 `*/type.js` → `.ts`
(`export default` a typed `MeetingType`) + `index.js` → `.ts` (default-imports, typed registry). The
`backend/engine/one-on-one-types/` dir is now **all TypeScript**. **16 registry importers** flipped to the
explicit `…/one-on-one-types/index.ts` specifier (Node's directory-index resolution never finds `index.ts`).
⚠️ **Lesson: grep importers REPO-WIDE.** One importer lived in `evals/trust-checks.js` (outside `backend/`+`scripts/`),
was missed, and surfaced as `test-trust-checks` + `test-replay-regression` failures — caught pre-commit by the
test gate, then fixed. Pre-existing dead code flagged: `ARCS_BY_SLUG` in `index.ts` (declared, never used) — kept
per the no-delete rule. **Engine `.js` left now: 16 root / 23 incl. subdirs.**

**meeting-arcs ✅ (2026-06-26 AM, committed, typecheck + npm test 30/30):** 9-line re-export shim → `.ts`;
6 importers flipped repo-wide (incl. `api/handlers/start.js`). **Engine `.js` left: 15 root / 22 incl. subdirs.**
Dependency scan — **leaf-ready now** (all deps converted): `answer-suggester`, `product-qa`,
`question-eligibility`, `role-profile`. (`role-profile` is the big unblocker — 6 modules wait on it.)

**question-eligibility ✅ (2026-06-26 AM, committed, typecheck + npm test 30/30 incl. `test-question-integrity`):**
171-line admission gate → `.ts` (typed question / result / log shapes; `getType` reused). 9 importers flipped
repo-wide (api ×3, engine ×4, `evals/trust-checks`, `scripts/test-question-integrity`). **Engine `.js` left:
14 root / 21 incl. subdirs.** Newly leaf-ready: `closer`, `opener` (both deps now done) — plus the standing
`answer-suggester`, `product-qa`, `role-profile`.

**product-qa ✅ (2026-06-26 AM, committed, typecheck + npm test 30/30):** 120-line self-diagnostic stage → `.ts`
(1 importer: `engine/index.js`). Bound to typed deps by structural extraction — `Parameters<typeof logStage>[0]`
for the session arg, focus-points type pulled from `resolveSelectedFocus` (those types aren't exported). The
inline AI JSON-schema literal checks clean against `callAI`'s `JsonValue`. **Refinement that unblocks the rest:**
`promptFor` now returns `string` (throws on the unreachable unknown-slot) instead of `string | undefined` — every
stage slot exists in SHARED_PROMPTS, so the remaining stage-runners (`generate`/`preparation`/`reviewer`/
`question-generator`/`queue-manager`) won't each need to narrow `readFileSync(promptFor(...))`. Live AI path is
paid → behaviour deferred to the owner-walk. **Engine `.js` left: 13 root / 20 incl. subdirs.**

**role-profile ✅ (2026-06-26 AM, committed, typecheck + npm test 30/30 incl. `test-role-profile` + `test-role-lexicons`):**
522-line module (disk cache + AI generation + user-word overlay + slice rendering) → `.ts`. **Agent-drafted then
reviewed line-by-line** (the PLAN process for big modules). The draft was typecheck-clean and honestly self-flagged
its deviations; I corrected 3 for byte-exact fidelity: an `as` cast in the SLICES lookup → `isSliceName` type guard;
`loadOverlay` + `effectiveTerminology` had normalized/coerced disk data → restored to the original's raw pass-through.
**17 importers** flipped repo-wide (api ×3, cli, engine ×6, evals, scripts ×4, smoke-test). Note: `api/server.js`
requires the *handler* `./handlers/role-profile`, NOT the engine module — correctly left alone. Live AI path is paid →
behaviour deferred. **Engine `.js` left: 12 root / 19 incl. subdirs.** Now leaf-ready: `generate`, `queue-manager`.
Remaining knot: `reviewer` ⇄ `golden-checks` (circular — convert back-to-back).

**Owner-walk ✅ (2026-06-26, Carl):** ran a real 1:1 on the live paid path — behaves identically. Proves
`ai-client` + `product-qa` + `role-profile` on the live path (they were agent/type-verified but not yet
behaviour-proven). Green light to resume converting. (Free CLI boot-test first confirmed every converted
`.ts`/`.mts` module resolves in the real entrypoint before spending — no module-resolution break.)

**generate ✅ (2026-06-26, committed, typecheck + npm test 30/30 + free `buildMessages` smoke):** 141-line
focus-points stage-runner (`01-focus-points`) → `.ts`. 5 importers flipped repo-wide (engine/`index`,
cli/stages/`focus-points`, api/handlers/`start` + `focus-points`, **scripts/`check-role-profile-injection`** —
the repo-wide grep applied). **First converted module to *read* fields off `parseAIJson`'s `unknown` return** —
narrowed with the local `asRecord`/`asString` trio (the person-profile house pattern), faithful to the
original's permissive coercions (the OpenAI strict schema already guarantees the string shapes, so the narrowing
is in-practice byte-identical). Catalogue kept entry-by-reference (all fields — `description`, `label_examples` —
still reach the model). Live AI path deferred to owner-walk; **offline smoke** verified 21 entries load, prompts
fill, zero leftover `{{…}}`. **Noted:** carried a pre-existing unused `node:path` import — kept (dead-code rule),
flag for later cleanup (same as `axes`). **Engine `.js` left: 11 root / 18 incl. subdirs.** Next leaf-ready: `queue-manager`.

**answer-suggester ✅ (2026-06-26, committed, typecheck clean + npm test 30/30):**
213-line dev-only note-suggester (roleplay aid, gated behind dev mode) → `.ts`. 2 importers flipped repo-wide
(api/handlers/`suggest-answers`, scripts/`test-answer-suggest-shape`). Reuses shared `TranscriptEntry`; the model's
JSON reply (`unknown`) narrowed via the house `asRecord` helper; `filterAnswers` takes `unknown` and coerces to an
array internally — faithful to the original `rawList || []` and byte-identical in practice (the strict response schema
guarantees `answers` is a string list). `question` typed required (always supplied, used unguarded), rest optional to
match the original's `|| ""` defenses. **No `any`/`as`/`@ts-ignore`.** Live AI path is paid → behaviour deferred to the
owner-walk; offline `test-answer-suggest-shape` covers the post-filter and passes. **Engine `.js` left after this: 10 root /
17 incl. subdirs.** Next leaf-ready: `closer`, `intro-queue`, `opener` (small), then `queue-manager` (big, 1152 lines).

**Session 2026-06-26 (Carl: "finish the engine today" — live todo list).** answer-suggester committed, then
**6 more converted+committed** (each: typecheck clean + npm test 30/30, no `any`/`as`/`@ts-ignore`):
`opener`, `intro-queue`, `closer` (small leaves), then the **independent lexicon chain** —
`lexicon/review-core` (hand-converted, heavy disk-JSON narrowing via `isObjectRecord`),
`lexicon/cli-interactive` (+ two folded type fixes: `generateSuggestions` given an explicit discriminated
`GenerateResult` return type so callers narrow; candidates-io `AcceptedSuggestion.better_as` widened to
`string|null` to match the schema), and `lexicon-reviewer` (barrel). Honest patterns used for
`noUncheckedIndexedAccess`: guarded throw / `?? null` / `?.id` at indexed-access spots (no `!`).
**Dependency rescan corrected the order:** `preparation`/`question-generator`/`index`/half of `cli/stages`
all depend on the **`golden-checks ⇄ reviewer`** pair, so that big circular pair is the true gate, not a
late step. **Engine `.js` left now: 6 root / 11 incl. subdirs** (6 root: golden-checks, index, preparation,
question-generator, queue-manager, reviewer · 5 subdir: the cli/stages/*) — and the *only* unblocked engine
work remaining is the **three big modules**: `queue-manager` (1152, leaf-ready), `reviewer` (761) ⇄
`golden-checks` (555) [circular pair]. Everything else (`preparation`, `question-generator`, `index`,
cli/stages) waits on them. ⏸️ **Paused here for Carl's green
light before the risky core** (per "stop before anything risky"); big modules go agent-draft → line-by-line
review → typecheck + npm test, live AI paths deferred to the owner-walk.

**Remaining engine waves (dependency order):**
- ✅ Done 2026-06-26: `person-profile` (3 importers) + `review-html` (1 importer; smoke-verified, no unit test). **Next unblocked: the one-on-one-types cluster.**
- ✅ one-on-one-types cluster DONE (2026-06-26): 5 `*/type` files → `index` (decision: `*/type` files use `export default {...}`
  — they're consumed only by `index`; index uses default-imports; shared `MeetingType` ✅ ready, `arc-overlay`
  ✅ done). Then `answer-suggester`,
  lexicon/`review-core`+`cli-interactive`, `lexicon-reviewer`,
  `closer`, `intro-queue`, `opener`.
- Then needs-role-profile tier: `role-profile` ✅ → now `generate`, `preparation`, `question-generator`,
  `queue-manager` (1152 lines), `reviewer` (761) ⇄ `golden-checks` (555) [circular — convert back-to-back].
- Then `index`, `cli/stages/*`. Then `api/`, then `cli.js`.

Big modules (`queue-manager`, `reviewer`, `golden-checks`, `role-profile`) are agent-drafted then reviewed
line-by-line before integrating. **No dangers hit so far.**
Paid `gate` stays parked until the end-of-phase behaviour proof. **End-of-phase QA-agency review is
a hard gate (see "Done means").**

---

## Step 1 — The survey: how much, and how (for Carl's pick)

### The JavaScript surface (tracked `.js` files)
| Area | Files | What it is |
|---|---|---|
| `backend/engine/` | 63 | The AI engine — the risky, valuable core |
| `backend/api/` | 37 | The server |
| `backend/cli.js` | 1 | The CLI |
| `scripts/` | ~69 | Test harness (~38 `test-*.js`) + tooling (gate, eval, replay, etc.) |
| `admin/src/` | 46 | The existing console UI |

### Decision 1 — **Scope: how much do we convert in Phase 003?**

| Option | What it converts | Verdict |
|---|---|---|
| **A — Backend only** *(recommended)* | `engine` + `api` + `cli` = **101 files**. Each module's test converts alongside it (test-first). | ✅ Matches the brief ("the engine and server"). Keeps the phase focused on the risky core. admin UI + standalone tooling parked. |
| B — Backend + tooling | A, **plus** the ~69 `scripts/` (test harness + gate/eval/replay tools). | ⏸️ More complete, but bigger. Tooling benefits from types far less than product code; can be a later cleanup. |
| C — Whole repo now | B, **plus** the 46 `admin/src` UI files. | ❌ Most complete, but **Phase 007 (frontend app)** revisits the UI — converting it now risks double work. |

**Recommendation: A.** It's exactly what the brief scopes, and it puts full attention on the engine
(where a silent type bug actually costs us). Tooling and admin convert in their natural later phases.

### Decision 2 — **Strategy** (recommended, not really a fork — flag if you disagree)
- **Leaf-first up the dependency graph:** define shared types → convert lowest-dependency modules → work
  up to the core → api → cli. `npm test` stays green at *every* step (the brief: behaves identically).
- **Strict from day one, no `any`** (the brief's rule). Any genuinely unavoidable loose spot gets
  **logged in Parked**, never silently `any`-ed or `@ts-ignore`-d (engine-honesty rule).
- **Test-first:** where a module has no test, add a characterising test first (red), then convert (green).

### A risk to kill in step 1 (before committing to a path)
Our existing tests are `.js` (run by `scripts/run-tests.js`). When an engine module becomes `.ts`, can a
`.js` test still import it under Node's native TS support — or do we convert each test in lockstep with
its module? **Step 1 proves this with one tiny conversion before we commit to the approach.** (The
Phase 002 `clamp.ts` proof suggests it's fine, but a `.js`→`.ts` import is the specific thing to confirm.)

---

### The pick — ⬜ AWAITING CARL
Pick a scope (A / B / C) and say whether the strategy looks right. Then I write the detailed
`phase-N.md` files (each ending in owner test scenarios) and we run step 1 — **after** you confirm.

## Parked
- Converting `admin/src` UI → with **Phase 007 (frontend app)**, unless pulled into scope here.
- Converting `scripts/` tooling → a later cleanup, unless pulled into scope here.
- The 1 pre-existing npm high-severity advisory (flagged in Phase 002) → `npm audit fix` is unrelated.

# Phase 5 — Em dashes, all three layers

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The em-dash rule holds in the words a manager actually reads, not just in the files the current guard happens to scan.

## Why three layers
`npm run lint:copy` passes today, and it is not wrong: it reads `admin/src` and `frontend/src`, 248 files, and those are clean. Everything downstream is unguarded. Measured on 25 Jul: **35 of 41** finished briefings in the dev org contain em dashes, the Meeting arcs screen renders **7**, the run review page renders **3**, and there are **144** quoted em-dash strings in `backend/engine` outside the tests. One of them is an instruction to the model.

## Changes
- **Layer 1, stop teaching it** — `backend/engine/answer-suggester.ts:56` currently says: *Use "→" for cause/result and "—" for a trailing detail when it fits.* Delete the em-dash half. This is the root cause: the engine asks for them.
- **Layer 2, widen the guard** — `scripts/lint-copy.js`: `SCAN_DIRS` becomes `["admin/src", "frontend/src", "backend/engine", "content/data"]`, skipping comments so the 500-odd em dashes in code comments do not drown the signal. Then clear what it finds, starting with the ones proven to reach a screen: `backend/engine/one-on-one-types/bi-weekly/type.ts` (the Meeting arcs intents) and `backend/engine/reviewer.ts:362` ("This didn't come up in the conversation — not enough signal to read.").
- **Layer 3, guard the generated prose** — a check where a briefing is saved, because no source scan can catch what the model writes at runtime. Per the house rule this **surfaces** the problem rather than silently rewriting it: the em dash is stripped and the occurrence is logged so we can see whether layer 1 actually worked. No hidden text rewrites that mask a model problem.

## Not in this phase
- Rewriting the 35 existing briefings. They are history, not copy we ship. Note it and move on.
- The en dash used as an empty-cell marker in admin tables ("–"). Different character, different question, in the Phase 7 sweep if it matters.

## Done when
- [ ] `npm run lint:copy` scans the wider set and reports 0 (before/after counts recorded)
- [ ] The Meeting arcs screen renders 0 em dashes, counted from the rendered page, not the source
- [ ] A briefing generated after the change carries none, and the guard's log shows whether it had to strip anything
- [ ] `npm test` and `npm run typecheck` still green
- [ ] Product owner has tested the scenarios below and said go

## Cost note
Proving layer 3 end to end needs one generated briefing, which means one paid OpenAI run. Smallest proof: `node scripts/gate.js --only <case>`, roughly $0.35. Layers 1 and 2 are free to prove. If the free layers look right, the paid run is the only spend in this phase.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

1. **Meeting arcs is clean** — `local > admin (audit.admin) > Meeting arcs`. Read the intent lines. No em dashes anywhere. ❌ Not OK if you see "How is the last stretch sitting —".
2. **The guard catches it now** — I will show you the before and after of `npm run lint:copy`: it should go from "PASS, 248 files" to scanning the engine and content too, and still pass.
3. **A new briefing is clean** — I will show you a freshly generated briefing with the em dashes gone, and tell you whether the guard had to strip any (which would mean the prompt change did not fully take).
4. **Nothing else broke** — `local > customer (audit.manager) > Past 1:1s`, open a 1:1 and read the recap. It should read exactly as well as it did before, just without the dashes.

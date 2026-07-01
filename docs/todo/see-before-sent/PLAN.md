# See-before-sent — exact LLM payload on every stage

**Goal:** On every LLM stage, the right-rail **Sent** tab shows *any and all data sent to the model* — exact, no drift — laid out so a non-engineer can eyeball "is the engine sending the right thing?". Labelled + skimmable, with the raw text one click away.

**Why:** Carl wants to trust the engine. Today only Prep brief previews; every other stage reads "Waiting for this stage to run…".

**No-drift rule:** every preview reuses the same `buildMessages()` the live run uses (`assembleX` mirrors `assemblePreparation`). Same input → same bytes.

**Cost:** zero. The preview endpoint never calls OpenAI — build & QA are fully offline.

## Current state

- 🚩 **Phase 1 — code is NOT in the current tree (lost in the 2026-06-24 monorepo reorg).** This was marked "✅ built, awaiting QA", but a **2026-07-01 code audit** found no `assembleFocusPoints` and no `FOCUS_POINTS` entry in `PREVIEW_ASSEMBLERS` (`backend/api/services/sessions/sessions.service.ts` has only `PREPARATION`), and no System/User split display in `admin/src/ui/stage-data-tab.js` (it renders the prompt as one raw block). The surviving Preparation-preview slice actually lives under [sent-preview](../sent-preview/PLAN.md), not here. **Decide: rebuild, fold into sent-preview, or cut this plan.** Baseline before the original work: `npm test` 30/30.
- ⏳ Phases 2–6 not started (one at a time, after each green light).

## Phases

1. **Focus areas + readable display** — `PHASE-1.md` *(was marked built; code lost in the reorg — see Current state)*
2. **Prep brief** verify + adopt display — `PHASE-2.md`
3. **Questions (BANK)** — `PHASE-3.md`
4. **Synthesis (EVAL)** — `PHASE-4.md`
5. **Live Q&A (QUESTIONING, per-turn)** — `PHASE-5.md`
6. **Briefing note + full sweep** — `PHASE-6.md`

## Parked (cut scope — stays cut unless Carl asks)

- Live debounced refresh of the preview as inputs are typed (today it refreshes on stage/tab change).
- Token-count / cost estimate per payload.

## Ritual

Baseline → build one phase → product owner walks that phase's QA in the running app → green light → commit (local) → next phase. When all ✅, move folder to `docs/todo/done/`.

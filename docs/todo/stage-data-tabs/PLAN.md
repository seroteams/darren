# See what's fed to the AI — tabs on the right rail

**Goal:** While running, the right rail gains two tabs next to Notes — **Sent** (what the AI was given for this stage + the exact prompt) and **Reply** (the model's raw answer) — updating as you move stage to stage.
**Driver:** Carl
**Created:** 2026-06-19

## Done means
- The right rail shows three tabs: **Notes · Sent · Reply**. Notes behaves exactly as before.
- On any stage, **Sent** shows a readable list of what the AI was given, with a "Show exact text sent ▸" reveal for the full prompt.
- **Reply** shows the model's raw answer for that stage (and "what shipped" where it's logged).
- The tabs follow you as the run advances — no reload, no leaving the flow.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Backend stage I/O | `GET /api/runs/:id/stages` serving each stage's input/prompt/reply; Q&A-turn prompts stop being discarded | 🔨 |
| 2 | Tabbed rail shell | Right rail becomes Notes·Sent·Reply tabs; Notes unchanged; Sent/Reply empty placeholders | 🔨 |
| 3 | Fill Sent & Reply | The two tabs show the current stage's injected context, exact prompt, and raw reply | 🔨 |

⬜ not started · 🔨 built, awaiting product-owner QA · ✅ done (tested)

## Current state
**Audit reconciliation (2026-07-01):** all three phases are **built, committed, and wired live in the app** — not "awaiting commit". Code-verified: `readRunStages()` + `GET /api/v1/runs/:id/stages` (`backend/engine/run-history.ts`, `server.ts`), the Notes·Sent·Reply tab shell (`admin/src/ui/notes-panel.js`, mounted in `main.js`), and the fully-populated Sent/Reply tabs (`admin/src/ui/stage-data-tab.js`). The only thing genuinely outstanding is Carl's on-screen QA sign-off — the badges stay 🔨 until he ticks. (`npm test` now 52/52, up from the 30/30 noted below.)

All three phases **built in one pass** (Carl said "go with all"). Awaiting Carl's QA before the ✅ tick.

Verified so far (free, no API spend):
- `npm test` → 30/30 pass. `npm run build` → client bundles clean (all imports resolve).
- `GET /api/runs/<existing-id>/stages` over HTTP → returns all 5 stages incl. 9 Q&A turns; unknown run → 404.
- Live UI driven against an existing run on an **isolated** stack (my API :3099 + Vite :3010 — Carl's :3000/:3001 untouched): rail shows **Notes · Sent · Reply**; Sent = 11 readable fields + "Show exact text sent to the model" (real 9.4k-char prompt); Reply = raw JSON + honest "no processed copy logged" note; Notes composer intact; no console errors.

Not yet tested (needs Carl): the live walk-through scenarios in the phase files, and the paid one-live-run check that new Q&A-turn prompts persist (~$0.35).

**To see it:** Carl's dev server (ports 3000/3001) is running the OLD code — restart `npm run dev` to pick up the changes, then open a run and check the right-rail tabs.

## Parked
- Browsing the same tabs on a finished run from the Library (the rail is live-session only today).
- Plain-English narration of each stage; cross-stage diffs; token/cost-per-stage; secret redaction.
- A turn switcher in the Live Q&A view (show latest turn first; add switcher only if cheap).

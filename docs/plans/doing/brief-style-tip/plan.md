# Brief style-tip — an AI-written "tip for this style of meeting"

**Goal:** Every prep brief carries a short, situation-aware line on how to run *this style* of meeting well (bi-weekly vs feels-off vs growth vs performance vs onboarding).
**Driver:** Carl
**Created:** 2026-07-20
**Mockup:** none for Phase 1 (backend/engine — no visible surface). Phase 2 adds one callout to the existing Arc brief layout (Carl's own pick from the 5 briefing mocks) — reviewed live via screenshot, no pre-mock.

## Done means
- Ask for a brief on any meeting type → the generated brief includes a `styleTip` field.
- The tip reads as coaching on the *meeting style*, tuned to the situation — not a generic rule, not a restatement of the core issue.
- Bi-weekly / feels-off tips carry no hidden competency/performance framing (relational-arc gate).
- The tip shows on the /prepare screen and in "Copy all".

## Resolved before we start (dug out of the code)
- `PrepBrief = PreparationResult["brief"]` (preparation.ts:27) → one type edit in session.types.ts propagates to the whole backend.
- Web payload path passes the **whole** brief (`session-streams.ts:104-105`, `:148`, `:387`) — no field whitelist, styleTip flows free.
- Arc gate `runFocusArcGate` (golden-checks.ts) is **input-side** (scans focus points, not brief text) — styleTip inherits protection because competency focus is stripped from inputs; the only styleTip-specific guard needed is the prompt's relational-arc line.
- Brief is logged as `response.json` (prep emits no final.json) — styleTip lands in the stage log automatically.
- Brief persisted as a JSON blob — no DB migration.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Engine + prompt | `styleTip` generated, schema-enforced, validated, arc-safe; shows in CLI + logs | ✅ |
| 2 | Render | `styleTip` on the /prepare screen (Arc callout) + Copy-all | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 1 ✅ GREEN-LIT 2026-07-20 (Carl approved the tip quality off 3 live tips; typecheck clean, tests 164/164). Phase 2 (render on the /prepare screen) now in progress.

## Parked
- Surfacing `styleTip` in the 11 admin-only layout variants (they're experiments; Arc is what managers see). Wire later if a variant is promoted.

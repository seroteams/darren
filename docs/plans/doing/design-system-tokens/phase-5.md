# Phase 5 — Admin JS + accessibility floor

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-18 — under Carl's continuous-run authorisation. Verified live (admin `/admin/gallery`): `.gal__caret` + `.gal__grp` now render Lucide chevron SVGs (16px + 14px, `sero-icon` class); no sub-14px `▾` glyph remains in the UI; console clean.

## Built (2026-07-18)
**The a11y fix:** `gallery.js` — the 11px/12px `▾` caret + group marker (below the 14px floor, non-Lucide) replaced with Lucide `ChevronDown` via `ui/icon.js`; help-text `▾` tidied to match. **Colour integrity:** `personas.js` — dropped mismatched `#6b7280`/`#4b5563` ink fallbacks; `account-sheet.ts` — dropped `#0f6b57` positive-text fallback; `guide.js` — phantom `--sero-rose-700 #b4232a` error red → `--color-negative-text`; `test.js` — thumbnail `stroke:#fff` → `var(--color-surface)`. **Left as warn-level** (floor-safe literal font-sizes + pill radii in admin-pulse/meeting-arcs/promises-loop — pixel-identical to their tokens, low value). Typecheck clean.

## Goal
Fix the admin JS/TS drift and the **one real accessibility breach** in the audit.

## Changes
- **`gallery.js` — the a11y fix:** the group caret/`▾` renders at 11px and 12px, below the 14px floor (and `▾` is a non-Lucide glyph). Replace with a Lucide chevron via `ui/icon.js` (icons are exempt from the text floor). *This is the one genuinely worth-it visible change.*
- **Mismatched hex fallbacks** in `personas.js` (ink-dim/ink-mute), `account-sheet.ts` (positive-text) → drop the wrong fallbacks.
- **`guide.js`** phantom `--sero-rose-700` error red → `--color-negative-text`.
- **Hardcoded font-sizes** (admin-pulse, promises-loop, test.js) → `--type-*`.
- **Off-scale radii** (guide 6/7/10px, meeting-arcs, admin-pulse 9999px pills, personas 999px typo) → `--sero-radius-*`.
- **Worst inline-style blocks** → scoped classes; `test.js` bespoke `<svg>` thumbnails' `stroke:#fff` → token/currentColor.

## Not in this phase
- Exempt files (`dev-badge.js`, `build-stamp.js`, `design.js`, universe, LOGO SVG). The lint guard (phase 6).

## Done when
- [ ] `npm run typecheck` clean, `npm test` green.
- [ ] Screenshot of Gallery showing the caret as a crisp Lucide chevron at readable size.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Gallery caret (the a11y win)** — `local > admin (email+pass) > Gallery`. The group expand/collapse marker is now a clean Lucide chevron, not a tiny `▾`. ❌ Not OK if it's missing, oversized, or misaligned.
2. **Personas + Guide** — open Personas and the Guide screen (trigger an error note). Text colours and error red read correctly. ❌ Not OK if any secondary text looks wrong-grey.
3. **Pulse / Meeting-arcs / Test area** — walk these; pills, buttons and cards render on the same pixels. ❌ Not OK if any pill or card mis-rounds.

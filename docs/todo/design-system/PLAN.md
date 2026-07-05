# Design system — Sero × Flowbite

**Goal:** one living design reference so every new/touched screen looks like Sero — because the
Sero look is **Flowbite 2.5.2 components + Carl's colours** (the Figma is the Flowbite UI kit
recoloured; the old `sero-original` prototypes loaded Flowbite 2.5.2 from CDN).

**Not the goal:** re-skinning existing screens. Adoption is incremental — new screens follow the
system from day one; old screens conform only when touched.

## Current state

- **Phase 1 — 🔨 building.** Component sheet at `admin/public/sero-flowbite/index.html`.
- Phase 2 — ⬜ not started.
- Pre-work done 2026-07-05: UI-idea prototype folders (`newdesign*`, `newui`, `sero-original`)
  removed from `admin/public/`; stale `dist/sero-original` cleaned; full checkpoint save committed.

## Phases

| # | Phase | What Carl gets | Status |
|---|---|---|---|
| 1 | [Component sheet](phase-1.md) | One page showing Flowbite components in Sero colours — open it, compare to Figma | 🔨 |
| 2 | [DESIGN.md + wiring](phase-2.md) | Auto-loaded design reference at project root; agents design "Sero" by default | ⬜ |

## Facts the work rests on

- Colour source of truth: `admin/src/styles/design.css` (`:root` tokens; read, never modified here).
  Key values: accent `#5aa9e6` / dark `#1b5d91`, ink `#1f2a37`, page `#f5fafd`, surface `#ffffff`,
  coral `#f76b5e`, mint `#88ecd5`, gold `#ffc247`, lavender `#b49edb`.
- Figma (`Sero - Demo 1.5`, key `YZzzruYVe1z2gTDxzwG2oW`): no published styles/variables/components —
  values must be read from nodes via REST (token in local memory, never in the repo).
- Fonts: **Inter** (body; already bundled) + **Bricolage Grotesque** (display headings, per Figma).
- House rules honoured in the system itself: 14px text floor (Figma's 12px avatar badge is a defect
  to fix, not copy), one accent per screen, no side-stripe borders, plain language.

## Parked

- Re-skin of existing app screens (incremental adoption instead).
- `scripts/figma-extract-design.mjs` bulk re-sync script + machine-readable tokens sidecar.
- Flowbite 3.x upgrade (sheet pins 2.5.2 to stay true to the Figma).
- Mining ideas from the deleted prototype folders (they're gone; Figma remains the idea source).

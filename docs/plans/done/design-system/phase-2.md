# Phase 2 — DESIGN.md at the root + wiring

**Turn the approved sheet into the living reference agents load automatically.**

## Work

1. **`DESIGN.md` at the project root** — Stitch format (YAML tokens + 6 fixed sections), because
   the impeccable loader checks the root first and auto-loads it every session.
   Content:
   - Tokens from `admin/src/styles/design.css` (the code truth) — colours, radii, spacing, type sizes.
   - Component recipes exactly as approved on the Phase 1 sheet (Flowbite 2.5.2 base).
   - Fonts: Bricolage Grotesque (display) + Inter (body) — fixing the archived doc's drift.
   - Radius truth: controls 4px, cards 12px (code + Figma agree; the archived doc's 8px was stale).
   - Do's/don'ts: 14px floor, one-accent rule, no nested cards / side-stripes / gradient text,
     plain language, "The Quiet Debrief" voice carried forward.
2. **Supersede banner** — one line at the top of `docs/archive/plans/design.md` pointing to the
   root `DESIGN.md`.
3. **Memory** — save where the design system lives (root `DESIGN.md` + `design.css` + the sheet),
   the Flowbite-2.5.2 basis, and how to re-read the Figma (REST token in local memory; no published
   styles/variables → sample nodes).

## QA scenarios (Carl walks these)

- [ ] `node .claude/skills/impeccable/scripts/load-context.mjs` prints `hasDesign: true` with the
      project root as contextDir.
- [ ] Read `DESIGN.md` top to bottom — it's in plain words and matches what you approved on the sheet.
- [ ] Acid test: ask me (or any fresh agent) to mock up a small new screen with no extra
      instructions — it should come out looking Sero without being told the colours.

**Green light = commit + close out** (move folder to `docs/archive/done/`, STATUS.md rolls on).

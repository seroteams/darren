# Phase 1 — Sero × Flowbite component sheet

**One self-contained page: `admin/public/sero-flowbite/index.html`.**
Flowbite **2.5.2** pinned via CDN (same version as the original prototypes → true to the Figma),
with Sero's colours wired in as the theme. No build step; open it in the browser (it's served by
Vite at `/sero-flowbite/index.html`, or open the file directly).

## What's on the sheet

Each component rendered in Sero colours, grouped and labelled:

1. **Buttons** — primary (sky `#5aa9e6`, white text), ghost/secondary (white, ink text, border),
   with hover/disabled states.
2. **Cards** — surface white on page `#f5fafd`, 1px border, the standard paddings.
3. **Badges / tags** — the category colours (Tasks gold, Team coral, Development mint, Fun sky,
   Fulfilment lavender) + status pills (viewed/starred style from the 1:1 panel).
4. **Inputs** — text input, select, textarea with labels, focus ring, error state.
5. **Side panel** — a mini "Upcoming 1:1"-style slide-over: heading, name + role, action row,
   details rows, request cards, sticky bottom bar.
6. **Modal** — header / body / footer, in Sero colours.
7. **Dropdown menu** — like the row `⋯` menu.
8. **Nav** — icon rail + topbar strip.
9. **Avatar + count badge** — with the badge at a readable size (**14px+**, fixing the Figma's 12px).
10. **Type ramp** — Bricolage Grotesque display sizes + Inter body sizes, all ≥14px.

## Rules the sheet itself must honour

- **14px floor** — nothing below 14px anywhere on the sheet.
- **One accent** — sky blue reads as "the action"; only one filled-blue button per component demo.
- No side-stripe borders, no gradient text, no nested cards.
- Plain-language labels (no jargon).

## QA scenarios (Carl walks these)

- [ ] Open `/sero-flowbite/index.html` (with `npm run dev` running) — the page loads, no console errors.
- [ ] Put it side-by-side with the Figma (any 1:1 screen): the blues, greys, radii and fonts feel
      like the same product.
- [ ] Check the badges: category colours match the Figma tags (gold/coral/mint/sky/lavender).
- [ ] Squint test: exactly one strong blue action per component group.
- [ ] Zoom to 100% and check the smallest text — nothing is under 14px.
- [ ] Say what feels off (colour, spacing, shape) — tweaks happen in this phase, not later.

**Green light = commit** (`feat(design-system): P1 — Sero × Flowbite component sheet`), then Phase 2.

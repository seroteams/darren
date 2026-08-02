# Sero brand style guide (for the seroteams.com brochure site)

Pulled from the live app's design system ([DESIGN.md](../../../DESIGN.md), `tokens.css`) and condensed
into plain hex/px values so a separate marketing-site codebase (Framer/Webflow/Next, stack TBD) can
match the product without importing app code. If the app's tokens change, re-export from here.

North star: **"The Quiet Debrief."** Calm, ink-on-paper, one accent colour, no enterprise-dashboard
gloss. No em dashes anywhere in copy.

---

## 1. Colour

**Core**
| Name | Hex | Use |
|---|---|---|
| Ink | `#1f2a37` | body text. Never pure black. |
| Ink dim | `#636363` | secondary text |
| Page | `#f5fafd` | page background. Never pure white. |
| Surface | `#ffffff` | cards |
| Border | `#e8e8e8` | 1px hairlines |
| Accent (Action Blue) | `#5aa9e6` | the one accent: primary buttons, links, active states |
| Accent dark | `#1b5d91` | accent hover/pressed |
| Accent soft | `#e9f3fb` | tinted backgrounds behind the accent |

**Semantic (use sparingly)**
| Name | Fill | Text-safe shade |
|---|---|---|
| Coral (error/negative) | `#f76b5e` | `#ac1608` |
| Mint (success) | `#88ecd5` | `#0c4b3c` |
| Gold (warning) | `#ffc247` | `#523600` |
| Lavender (AI touches) | `#b49edb` | `#55358f` |

**Rule:** one accent blue per screen/section. Semantic colours mark meaning, not decoration.

---

## 2. Typography

**Fonts**
- Display: **Bricolage Grotesque** (weight 600) — headlines only, 20px and up.
- Body: **Inter** — everything else, weights 400/500/600.

**Scale** (locked pairs, size/line-height, all land on a 4px grid)

| Role | Size / Leading | Weight | Face |
|---|---|---|---|
| Display | 36/40 | 600 | Bricolage |
| Heading XL | 30/36 | 600 | Bricolage |
| Heading L | 24/32 | 600 | Bricolage |
| Heading M | 20/28 | 600 | Bricolage |
| Heading S | 18/28 | 600 | Inter |
| Body lead | 18/28 | 400 | Inter |
| Body | 16/24 | 400 | Inter |
| Body small | 14/20 | 400 | Inter |
| Label | 14/20 | 500, tracking 0.02em | Inter |

**Rules**
- 14px is the floor. Nothing smaller, anywhere.
- Bricolage never below 20px.
- Max 4 text levels per page section.
- Body copy caps at ~66 characters per line.
- One bold phrase per paragraph, max. No blanket bolding.

---

## 3. Spacing (8px rhythm, 4px grid)

`4 · 8 · 12 · 16 · 20 · 24 · 28 · 32 · 40 · 48 · 56 · 64` px

- Items inside a group: 8-12px apart.
- Groups from each other: 24-32px apart (roughly 2x the inner spacing).
- A heading sits closer to what follows it than to what's above (e.g. 32px above, 12px below).

---

## 4. Radius

| Use | Radius |
|---|---|
| Buttons, inputs | 4px |
| Cards, modals | 12px |
| Pills, badges, avatars | 9999px (full) |

No 8px or 16px radii anywhere, on purpose.

---

## 5. Shadows

Flat by default, depth comes from the page-to-card tone shift plus 1px borders. Shadow only when
something detaches from the page:

| Use | Shadow |
|---|---|
| Card lift (subtle) | `0 1px 2px rgba(31,42,55,.04), 0 8px 24px rgba(31,42,55,.06)` |
| Dropdowns / toasts | `0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)` |
| Modals / overlays | `0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)` |

Never ambient/decorative shadow. Honour `prefers-reduced-motion`.

---

## 6. Buttons

- **Primary:** accent fill `#5aa9e6`, white label, 4px radius, hover to `#1b5d91`. One per screen/section.
- **Ghost:** white fill, `#e8e8e8` border, ink text.
- **Quiet:** text-only, ink-dim.
- Padding: `8px 16px`. No trailing arrow icons on action buttons.

---

## 7. Cards

White surface, 1px `#e8e8e8` border, 12px radius, 16-24px padding. Never nest a card inside a card.

---

## 8. Icons

Lucide only (lucide.dev). No emoji, no custom SVG glyphs. Stroke weight 2, 24x24 box, `currentColor`
(inherits text colour).

---

## 9. Voice

Plain language, no jargon. No em dashes (—) ever, use a full stop or colon instead. Dates written
as `Mon 18 Nov 2024`.

---

*Source of truth is the app's `admin/src/styles/design/tokens.css` and [DESIGN.md](../../../DESIGN.md). This file
is a static export for the separate marketing-site build, not a live token feed. If the app's palette
or type scale changes, this file goes stale until someone re-syncs it by hand.*

---
name: Sero
description: Calm, plain-spoken 1:1 prep — a thinking tool for the conversation, not a dashboard.
colors:
  ink: "#1f2a37"
  ink-dim: "#636363"
  ink-mute: "#757575"
  page-bg: "#f5fafd"
  surface: "#fdfefe"
  accent: "#5aa9e6"
  error: "#f76b5e"
typography:
  display:
    fontFamily: "InterVariable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "InterVariable, Inter, sans-serif"
    fontSize: "clamp(2rem, 3.5vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "InterVariable, Inter, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "InterVariable, Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "InterVariable, Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.04em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

> **⛔ SUPERSEDED (2026-07-05) by the root [DESIGN.md](../../../DESIGN.md)** — the live design
> system (Flowbite 2.5.2 + Sero tokens, auto-loaded by agents). This archived copy predates the
> Bricolage Grotesque display font and the 4px control radius; don't build from it.
> Active work lives in [SERO_BOARD.md](../SERO_BOARD.md).

# Design System: Sero

## 1. Overview

**Creative North Star: "The Quiet Debrief"**

Sero looks like a calm conversation written down, not a product dashboard. The canvas is a tinted off-white (`#f5fafd`) that reads as paper in soft daylight; cards sit a half-step brighter (`#fdfefe`) rather than floating on heavy shadow. Type does the work: a large, tight editorial headline states the read in plain words, and everything beneath it is reasoning in comfortable body text. The single sky-blue accent is used sparingly, for the one action that matters on each screen. It is unhurried by design, because the person using it is about to have a human conversation that deserves steadiness.

This system explicitly rejects the generic AI-tool look (dark mode, purple/neon gradients, glassmorphism, decorative glows), the hero-metric dashboard template (big-number grids), and clinical HR-software chrome (rating rubrics, traffic-light scorecards). When Sero shows a number — the four axis scores — it always sits beside the prose that earned it. A score never stands alone.

**Key Characteristics:**
- Light, warm, low-contrast-background, high-contrast-text.
- One accent, used rarely; color signals action, not decoration.
- Headline-led hierarchy: a sentence, then the reasoning.
- Flat surfaces; depth from tone and spacing, not heavy shadow.
- Plain language everywhere; no enterprise jargon.

## 2. Colors

A near-monochrome ink-on-paper palette with a single sky-blue accent and a coral reserved for warnings.

### Primary
- **Sky Action Blue** (`#5aa9e6`, `--color-accent`): the one accent. Primary buttons, selected radio/option states, links, the axis-slider fill. Carries the "do this / this is active" meaning. (`--color-accent-dark` #1b5d91 is the hover/pressed tone.)

### Tertiary
- **Signal Coral** (`#f76b5e`): warnings and negative deltas only ("Engine config changed…", low axis reads). Never decorative. Must reach ≥4.5:1 as text (darken for small copy).

### Neutral
- **Ink** (`#1f2a37`): primary text and headlines. Tinted toward navy, never pure black.
- **Ink Dim** (`#636363`): secondary body, "what we understood" supporting prose.
- **Ink Mute** (`#757575`): eyebrow labels, captions, timestamps. Keep at 12px+ and watch contrast on the tinted background.
- **Page** (`#f5fafd`): the app background. Tinted off-white, never `#fff`.
- **Surface** (`#fdfefe`): cards, inputs, popovers. A half-step brighter than the page.

### Named Rules
**The One Accent Rule.** Sky blue appears on at most one primary action per screen. Its rarity is what makes it read as "the thing to do." If two blue buttons compete, one is wrong.

**The Number-With-Reasoning Rule.** An axis score (Wellbeing / Engagement / Clarity / Growth) is never rendered without its adjacent prose. No bare-metric tiles.

## 3. Typography

**Display & Body Font:** InterVariable (with Inter, then `ui-sans-serif, system-ui, sans-serif`).
**Label Font:** same family, tracked-out uppercase for eyebrows.

**Character:** One humanist sans across the whole system, carried by weight and size rather than multiple families. The contrast between a tight, heavy headline and relaxed regular-weight body is the entire hierarchy — calm and editorial, not techy.

### Hierarchy
- **Display** (700, `clamp(44–56px)`, lh 1.1, tracking −0.02em): the briefing headline — the one-sentence read. Rare, one per screen.
- **Headline** (700, `clamp(32–44px)`, lh 1.1): page titles where the display size is too large.
- **Title** (600, 20px, lh 1.35): section subheads inside a stage.
- **Body** (400, 16px, lh 1.55): all reasoning and prose. Cap measure at ~65–75ch.
- **Label / Eyebrow** (600, 12px, tracking 0.04em, UPPERCASE): section eyebrows ("WHAT STOOD OUT", "DEMO PERSONA"), timestamps, pills.

### Named Rules
**The Sentence-First Rule.** Every major view opens with a full-sentence headline, not a noun-label. "Maya's review drag comes from unclear readiness," not "Summary."

## 4. Elevation

Flat by default. Depth comes from the tonal step between page (`#f5fafd`) and surface (`#fdfefe`), from 1px tinted borders, and from generous spacing — not from stacked shadows. Shadows are reserved and shallow: a faint resting lift on raised controls, a soft `0 8px 24px rgba(0,0,0,0.12)` on popovers/modals that detach from the page. Motion is restrained and **always honors `prefers-reduced-motion`** (reveal sequences and the thinking orb have static fallbacks).

### Shadow Vocabulary
- **Resting** (`--sero-shadow-sm`): primary buttons and cards that need to read as tappable. Barely there.
- **Floating** (`box-shadow: 0 8px 24px rgba(0,0,0,0.12)`): popovers, the start-session detail, modal dialogs.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow is a response to state (a popover opening, a control lifting), never ambient decoration. Nested cards are forbidden.

## 5. Components

### Buttons
- **Shape:** gently rounded (8px, `--sero-radius-md` / `--radius-button`).
- **Primary:** sky-blue fill (`--color-accent` #5aa9e6), surface-white text, 8px 16px padding. The single highlighted action.
- **Ghost:** transparent/surface background, ink text, used for secondary actions ("Copy QA prompt", "Delete", "New session").
- **Hover / Focus:** subtle background shift; `:active` nudges down ~1px; every button shows a `:focus-visible` ring (`--sero-shadow-focus`). No bounce.

### Cards / Containers
- **Corner Style:** 12px (`--sero-radius-lg`).
- **Background:** surface (`#fdfefe`) on the page (`#f5fafd`).
- **Border:** 1px tinted (`--color-border-tinted`).
- **Shadow Strategy:** flat or resting only (see Elevation).
- **Internal Padding:** 24px (cards), 20px (flat/compact).

### Inputs / Fields
- **Style:** surface background, 1px tinted border, 8px radius. Built with the `.field` primitive (`.field__label`, `.field__control`, `.field__hint`, `.field__error`).
- **Focus:** border shift + focus ring; do not strip the outline without replacing it.
- **Error:** `.field__error` text in signal coral (`[hidden]`-aware).

### Navigation
- **Session topbar:** a horizontal stage breadcrumb (Setup · Focus areas · Prep brief · Questions · Live Q&A · Synthesis · Briefing) with a check on completed stages and the current stage in ink. Completed stages open a review overlay.
- **Mobile:** the breadcrumb must condense or scroll — it currently truncates to the first two stages, which is a defect, not the intended treatment.

### Axis Slider (signature component)
A labelled horizontal track per axis (Wellbeing / Engagement / Clarity / Growth) with a sky/coral fill indicating the −5…+5 read and the numeric value beside it. Always paired with explanatory prose below. This is Sero's most distinctive primitive; keep it plain and never gamified.

## 6. Do's and Don'ts

### Do:
- **Do** open every major view with a full-sentence headline (the read), then the reasoning.
- **Do** keep the page on tinted off-white (`#f5fafd`) and cards on `#fdfefe`. Never pure `#fff` or `#000`.
- **Do** limit sky-blue (`#5aa9e6`) to one primary action per screen.
- **Do** always show an axis number next to the prose that justifies it.
- **Do** keep the single sky-blue accent (`#5aa9e6`) for the one primary action per screen.
- **Do** keep a `:focus-visible` ring on every interactive element and a static fallback under `prefers-reduced-motion`.

### Don't:
- **Don't** ship the generic AI-tool look: dark mode, purple/neon gradients, glassmorphism, or decorative glowing orbs.
- **Don't** build hero-metric / KPI-grid dashboards. A score never stands alone as a big-number tile.
- **Don't** use clinical HR-software chrome: rating rubrics, traffic-light scorecards, corporate-blue fills.
- **Don't** nest cards, or use a colored `border-left`/`border-right` stripe as an accent.
- **Don't** use gradient text or em dashes in UI copy (commas, colons, periods instead).
- **Don't** let the mobile stage breadcrumb truncate silently — condense or scroll it.

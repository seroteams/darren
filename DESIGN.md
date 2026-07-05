---
name: Sero
description: Calm, plain-spoken 1:1 prep — Flowbite 2.5.2 components wearing Sero's colours.
colors:
  ink: "#1f2a37"
  ink-dim: "#636363"
  page-bg: "#f5fafd"
  surface: "#ffffff"
  border: "#e8e8e8"
  accent: "#5aa9e6"
  accent-dark: "#1b5d91"
  accent-soft: "#e9f3fb"
  coral: "#f76b5e"
  mint: "#88ecd5"
  gold: "#ffc247"
  lavender: "#b49edb"
typography:
  display:
    fontFamily: "'Bricolage Grotesque', Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Bricolage Grotesque', Inter, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0.04em"
rounded:
  sm: "4px"
  lg: "12px"
  full: "9999px"
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
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
---

# Design System: Sero

> **The living reference.** The visual twin of this doc is the component sheet at
> `admin/public/sero-flowbite/index.html` (in-app: Admin → Design system). Copy from the sheet;
> obey this doc. Colour tokens live in code at `admin/src/styles/design.css` — never restate hex
> values in screen files.

## 1. Overview

**Creative North Star: "The Quiet Debrief."**

Sero looks like a calm conversation written down, not a product dashboard. The base is **Flowbite
2.5.2 components recoloured with Sero's palette** — that's literally how the product was designed
(the Figma is the Flowbite UI kit in Sero colours), so new UI starts from a Flowbite shape, then
wears the tokens below. The canvas is a tinted off-white that reads as paper in soft daylight;
white cards sit on it with 1px borders, not heavy shadow. One sky-blue accent marks the single
action that matters on each screen.

**Key characteristics:**
- Light, warm, low-contrast background, high-contrast text.
- One accent, used rarely; colour signals action, not decoration.
- Bricolage Grotesque display headings over calm Inter body — the pairing IS the personality.
- Flat surfaces; depth from tone and spacing.
- Plain language everywhere; no enterprise jargon.

## 2. Colors

Near-monochrome ink-on-paper with a single sky accent, plus a small semantic set.

### Primary
- **Action Blue** (`{colors.accent}` #5aa9e6): the one accent. Primary buttons, active nav,
  links, selected states. Hover/pressed darkens to `{colors.accent-dark}` #1b5d91.
  Tinted background: `{colors.accent-soft}` #e9f3fb (role pills, active icon rail).

### Semantic
- **Coral** #f76b5e — errors and negative deltas only. Darken for small text (contrast).
- **Mint** #88ecd5 — success; always dark-green text on a light mint tint.
- **Gold** #ffc247 — warnings; dark amber text on light tint.
- **Lavender** #b49edb — AI/fulfilment touches.
- **Category tags** (light tint + dark text of the same hue): Tasks gold · Team coral ·
  Development mint · Fun sky · Fulfilment lavender.

### Neutral
- **Ink** #1f2a37 (text, never pure black) · **Ink Dim** #636363 (secondary) ·
  **Page** #f5fafd (background, never pure white pages) · **Surface** #ffffff (cards) ·
  **Border** #e8e8e8.

### Named Rules
**The One Accent Rule.** Sky blue appears on at most one primary action per screen.
**The Tokens-Only Rule.** Screens never contain literal hex values — tokens from `design.css` only.

## 3. Typography

**Display:** Bricolage Grotesque (600) — page names, person names, the briefing headline.
**Body:** Inter — everything else. Weights 400/500/600.

### Hierarchy
- **Display** (Bricolage 600, ~40px, lh 1.1): one per screen.
- **Headline** (Bricolage 600, ~30px): section-level page titles.
- **Title** (Inter 600, 20px): card and section headings.
- **Body** (Inter 400, 16px, lh 1.55): all reading. Cap lines at ~75 characters.
- **Label** (Inter 500, 14px): metadata, table headers, eyebrows. **14px is the floor — nothing smaller, ever.**

### Named Rules
**The Name-Wins Rule.** A person's name outweighs their job title (title is ~16px dim, never a
second display line).

## 4. Elevation

Flat by default. Depth = the tonal step from page (#f5fafd) to surface (#ffffff) + 1px borders +
spacing. Shadows only when something detaches from the page: dropdowns and toasts get a soft lift,
modals and side panels a larger one. Never ambient decoration. Honour `prefers-reduced-motion`.

## 5. Components

Flowbite 2.5.2 shapes + Sero tokens. Canonical recipes (visual versions on the sheet):

- **Buttons** — controls round at **4px**. Primary: accent fill, white text, one per screen.
  Ghost: surface + border + ink. Quiet: text-only dim. Danger: coral border/text. Never a
  trailing arrow on an action button.
- **Cards** — surface, 1px border, **12px** radius, 16–24px padding. Never nested.
- **Table** (one style for all lists): whole row clickable, header 14px dim semibold, avatar +
  name + quiet second line, role/status badges, score with trend arrow, `⋯` menu right; scrolls
  sideways inside its card on phones — never the page.
- **Inputs** — exactly two variants: compact boxed (label above, 4px radius, accent focus ring;
  coral border + plain-words error below when invalid) and the big session variant (borderless,
  bottom line, ~24px type — session flow only). Nothing in between.
- **Toasts & alerts** — success = toast, bottom-right, auto-dismiss ~4s. Error = stays until
  dealt with, always says what to do next, offers retry. Warning = inline, next to the thing it
  warns about.
- **Dropdown menu** — one build: surface, border, soft shadow, 14px rows, coral for destructive,
  separator before it.
- **Modal** — header / body / footer with borders, 12px radius; destructive confirmations use
  the shared confirm dialog, always.
- **Side panel** — slide-over: eyebrow label, identity block (avatar + display-size name),
  quiet detail list (plain label/value rows, no pill-in-box), content cards, sticky footer
  holding the actions **once** (ghost + one primary).
- **Badges** — role pills (tinted bg + dark text, full radius); count badges ≥14px text.
- **Existing signatures to reuse, not rebuild:** the axis score bars (`admin/src/ui/axes.js`),
  star rating, thinking orb, confirm dialog, page-header pattern, `.l-*` layout primitives.

## 6. Do's and Don'ts

The "before you build" checklist — every new or touched screen passes all ten:

1. **Do** take colours only from the tokens; **don't** type hex in a screen file.
2. **Do** keep every text ≥ **14px**.
3. **Do** give each screen exactly **one blue action**.
4. **Do** round controls at **4px**, cards at **12px**.
5. **Do** design the **empty, loading, and error** states with the screen, not after.
6. **Do** build layout from the shared primitives (`.l-stack`, `.l-grid`…).
7. **Do** route every destructive action through the confirm dialog.
8. **Do** make it work at **phone width** — no page-level sideways scroll, everything tappable.
9. **Do** write dates one way: **Mon 18 Nov 2024**.
10. **Do** use plain words; keep focus rings. **Don't** nest cards, use side-stripe borders,
    gradient text, or dark-glass AI styling. **Don't** show a bare metric without its reasoning.

**One exemption:** dev/debug chrome (`ui/dev-badge.js`, `ui/build-stamp.js`) is deliberate
terminal-style kit — dark, mono, its own palette. It sits outside these rules; don't "fix" it.

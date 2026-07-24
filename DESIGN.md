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

### Brandmark / logo
The rounded square with two bars and two dots is **the Sero logo** — the one official mark.
Master + colour versions live in `admin/public/sero-flowbite/brand/` (see that folder's
`README.md` and the **Brandmark** section of the component sheet). Default is
`sero-brandmark-charcoal.svg`; colour tiles keep white marks and use only palette colours.
Don't recolour the marks, squash the square, or square off the corners.

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

### The full palette
Every Sero colour lives as an 11-step scale (50 → 950) in `admin/src/styles/design/tokens.css`
(`--sero-<scale>-<step>`), mirrored visually on the component sheet ("Full palette" in Colours):
**Primary · Mint · Sky · Lavender · Coral · Gold · Teal · Navy · Soft gray · Charcoal · Off white**
(from Carl's Figma export, 2026-07-05). Using a scale: **100–300** tinted backgrounds · **700**
the colour itself · **800+** text on tints. Two deliberate code-vs-Figma-export deviations:
accent stays `#5aa9e6` (the Figma *components* use it, only the variable export says #60a9e2)
and `soft-50` stays `#fdfefe` (never-pure-white rule).

### Accessible pairings (a11y pass 2026-07-05 — measured, not guessed)
Text must hit **4.5:1**; large text and UI shapes **3:1**. The pairs that pass:
- Body ink #1f2a37 on page/surface (13.8) · dim #636363 (5.7+) · links accent-dark #1b5d91 (6.6+).
- **Colour as text on light:** coral → **800** (#ac1608, 7.3) · mint → **900** (#0c4b3c, 9.9) ·
  gold → **900** (#523600) · lavender → **800** (8.7) · sky → **800** (5.4). **A 700 step is never
  text** (coral-700 2.9, mint-800 2.9 — fails). In code: `--color-positive-text` /
  `--color-negative-text`. The 700s stay for fills, bars, borders(≥3:1), tints.
- Mute #757575 passes on white (4.6) but not on the tinted page at small sizes (4.4) — on
  `page-bg`, mute text is 16px+ or use dim instead.
- **Focus ring**: the double ring (2px white gap + primary-800) — visible on every background.
  Never a pale ring.
- **Primary buttons — ACCEPTED brand deviation (Carl's call, 2026-07-05):** white label on the
  sky fill stays, at **2.5:1** (below AA). Carl saw the passing dark-label option rendered and
  chose the white ("put white back") — the light-blue-with-white button IS the brand. Don't
  re-flag it in audits; don't copy the pattern to new colour pairs. Hover (accent-dark fill)
  passes at 7:1. If accessibility requirements ever harden (e.g. a customer audit), the
  recorded fallbacks are: dark label on sky (6.8:1) or white on accent-dark (7:1).

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
**The Screen-Names-The-Object Rule.** A detail or recap screen's heading names the thing you
opened — the person, the 1:1 — never the parent list, and never re-shows the parent screen's
header stacked above it. A read-only 1:1 recap uses the shared `admin/src/ui/recap-header.ts`
(breadcrumb + a heading that names the 1:1); a generic title like "Past 1:1" fails this rule.

## 4. Elevation

Flat by default. Depth = the tonal step from page (#f5fafd) to surface (#ffffff) + 1px borders +
spacing. Shadows only when something detaches from the page: dropdowns and toasts get a soft lift,
modals and side panels a larger one. Never ambient decoration. Honour `prefers-reduced-motion`.

## 5. Components

Flowbite 2.5.2 shapes + Sero tokens. Canonical recipes (visual versions on the sheet):

- **Buttons** — controls round at **4px**. Primary: accent fill, white label (accepted brand
  deviation — see §2; hover darkens to accent-dark), one per screen. Ghost: surface + border +
  ink. Quiet: text-only dim. Danger: coral-**800** border/text. Never a trailing arrow on an
  action button.
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
- **Breadcrumbs** — *The Breadcrumb Rule:* any drill-down deeper than one level shows a single
  breadcrumb trail (`admin/src/ui/breadcrumb.ts`), not a per-screen back button. Crumbs read
  `Parent › … › current`; the current page is plain text, the rest are links. One trail per
  screen — never two stacked back controls.
- **Existing signatures to reuse, not rebuild:** the axis score bars (`admin/src/ui/axes.js`),
  star rating, thinking orb, confirm dialog, page-header pattern, the breadcrumb trail
  (`admin/src/ui/breadcrumb.ts`) and read-only recap header (`admin/src/ui/recap-header.ts`),
  `.l-*` layout primitives.

### Icons — Lucide only
**[Lucide](https://lucide.dev) is Sero's single icon system.** No emoji in the UI, no bespoke
SVG glyphs — every icon is a Lucide icon so the whole app shares one line weight and shape
language. The library is a project dependency (`lucide` in `package.json`); browse names at
[lucide.dev/icons](https://lucide.dev/icons).

Render through the one shared helper, `admin/src/ui/icon.js` — never hand-write an `<svg>`:

```js
import { House } from "lucide";
import { icon } from "../ui/icon.js";
el.innerHTML = `<span class="app-nav__icon">${icon(House)}</span>`;
```

- **Sizing:** default 22px (nav-rail size); pass `{ size }` for others. **Icons never carry text —
  the 14px floor is about labels, not glyphs.** Keep icons ≥16px so they stay legible.
- **Colour:** icons stroke in `currentColor` — they inherit the text colour of their context, so
  they honour the tokens automatically. Don't hardcode a fill.
- **Accessibility:** icons are `aria-hidden` by default (they sit beside a text label). For an
  icon-only control, pass `{ label }` **and** give the button its own `aria-label`.
- **Stroke weight (2) and the 24×24 box are fixed** by the helper — don't override them, so every
  icon matches. The Sero brandmark (`app-nav.js` `LOGO`) is the one exception: it's the logo, not
  an icon.

## 6. Do's and Don'ts

The "before you build" checklist — every new or touched screen passes all thirteen:

1. **Do** take colours only from the tokens; **don't** type hex in a screen file.
2. **Do** keep every text ≥ **14px** and every colour-as-text at **4.5:1+** (on light: coral 800,
   mint 900, gold 900 — never a 700 as text; use `--color-positive-text`/`--color-negative-text`).
3. **Do** give each screen exactly **one blue action**.
4. **Do** round controls at **4px**, cards at **12px**.
5. **Do** design the **empty, loading, and error** states with the screen, not after.
6. **Do** build layout from the shared primitives (`.l-stack`, `.l-grid`…).
7. **Do** route every destructive action through the confirm dialog.
8. **Do** make it work at **phone width** — no page-level sideways scroll, everything tappable.
9. **Do** write dates one way: **Mon 18 Nov 2024**.
10. **Do** use plain words; keep focus rings. **Don't** nest cards, use side-stripe borders,
    gradient text, or dark-glass AI styling. **Don't** show a bare metric without its reasoning.
11. **Do** use **Lucide icons only**, via `admin/src/ui/icon.js`; **don't** hand-write an `<svg>`
    or reach for an emoji in the UI (see §5 "Icons").
12. **Do** call a 1:1 a **"1:1"** (or its named cadence, e.g. "Bi-weekly check-in") — **don't**
    write "meeting" or "session" for it; join role and seniority with a middot ("UX Designer ·
    Staff"), never a comma.
13. **Never use an em dash (—) in user-facing copy** (Carl's hard rule). Use a full stop, a
    colon, or reword; an en dash used as a spaced separator ( – ) is the same sin. A bare en dash
    ("–") is fine only as an empty-value glyph in a cell. Guard: `npm run lint:copy` (free).

**Exemptions** (these sit outside the eleven rules — don't "fix" them):
- **Dev/debug chrome** (`ui/dev-badge.js`, `ui/build-stamp.js`) — deliberate terminal-style kit,
  dark, mono, its own palette.
- **The Universe screen** (`stages/universe.ts`, `stages/universe.model.ts`) — an admin-only,
  just-for-fun 3D map on a full-bleed dark canvas; the WebGL/canvas renderer needs numeric rgb
  strings, so its colour literals are intentional.
- **The in-app design sheet** (`stages/design.js`) — the live twin of the component sheet at
  `admin/public/sero-flowbite/`; it demonstrates the system (including small illustrative glyphs
  in its mock cards), so it documents the rules rather than being bound by them.
- **The Screen Gallery edit bar** (`stages/gallery/`) — internal design-mode chrome that stays a
  top toolbar (not a sidebar) so previewed screens keep their real width, and wears a deliberate
  gold "edit mode" tint over the shared `.btn` shape.

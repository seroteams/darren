---
name: Sero
description: Calm, plain-spoken 1:1 prep. Ink on paper, one sky accent, Sero's own component recipes.
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

> **The living reference.** The visual twin of this doc is the in-app component sheet
> (Admin → Design system), built by `admin/src/stages/design.js`. Copy from the sheet; obey this
> doc. Every design token lives in code at `admin/src/styles/design/tokens.css` (`design.css` is
> just the `@import` barrel) — never restate hex values in screen files.

## 1. Overview

**Creative North Star: "The Quiet Debrief."**

Sero looks like a calm conversation written down, not a product dashboard. The canvas is a tinted
off-white that reads as paper in soft daylight; white cards sit on it with 1px borders, not heavy
shadow. One sky-blue accent marks the single action that matters on each screen.

New UI starts from an **existing Sero recipe** (§5) wearing the tokens below, not from a blank
page. Sero owns its components outright: no UI framework, no component library, no CDN kit. The
recipes in §5 and the in-app sheet are the only source.

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
**20px and up only.**
**Body:** Inter — everything else. Weights 400/500/600.
**Mono:** one stack, `--type-family-mono`, for code and machine output.

The scale is **Tailwind's default, adopted whole** rather than invented here (read from
`tailwindcss/defaultTheme`). Seven rungs, each a locked size/leading **pair**. Every leading
lands on the 4px spacing grid, so type and spacing keep one rhythm. There is no 12px rung on
purpose: 14px is the floor, and a token below it is an invitation to breach it. The top rung is
**36, not 40** — adopting a standard scale means taking its top step too (Carl, specimen
sign-off, 2026-07-30).

### The ladder (Layer 1 — `design/tokens.css`)

| token pair | size | leading |
|---|---|---|
| `--type-size-sm` / `--type-leading-sm` | 14px | 20px |
| `--type-size-base` / `--type-leading-base` | 16px | 24px |
| `--type-size-lg` / `--type-leading-lg` | 18px | 28px |
| `--type-size-xl` / `--type-leading-xl` | 20px | 28px |
| `--type-size-2xl` / `--type-leading-2xl` | 24px | 32px |
| `--type-size-3xl` / `--type-leading-3xl` | 30px | 36px |
| `--type-size-4xl` / `--type-leading-4xl` | 36px | 40px |

Use them **in pairs**. A size taken without its matching leading is how a heading ends up on a
line-height meant for body copy.

### The fourteen roles (Layer 2 — `design/type.css`)

A screen picks a role by what the text **is** ("this is a card title", "this is a field label"),
never by how big it should be, so the same decision made on two screens lands on the same numbers.

| role | size / leading | weight | family | carries |
|---|---|---|---|---|
| `.type-display` | 36 / 40 | 600 | Bricolage | tracking -0.02em, balanced wrap. One per screen. |
| `.type-heading-xl` | 30 / 36 | 600 | Bricolage | page title. Drops to 24/32 below 640px. |
| `.type-heading-lg` | 24 / 32 | 600 | Bricolage | section heading. Drops to 20/28 below 640px. |
| `.type-heading-md` | 20 / 28 | 600 | Bricolage | card heading. The last Bricolage rung (T6). |
| `.type-heading-sm` | 18 / 28 | 600 | Inter | below the display face's floor. |
| `.type-heading-xs` | 16 / 24 | 600 | Inter | body-size text that must outrank the body beside it. |
| `.type-body-lg` | 18 / 28 | 400 | Inter | lede. |
| `.type-body` | 16 / 24 | 400 | Inter | all reading. Carries the measure. |
| `.type-body-sm` | 14 / 20 | 400 | Inter | quiet supporting lines, table cells, chrome. No measure. |
| `.type-label` | 14 / 20 | 500 | Inter | tracking 0.02em. |
| `.type-label-strong` | 14 / 20 | 600 | Inter | |
| `.type-overline` | 14 / 20 | 600 | Inter | uppercase, tracking 0.08em. |
| `.type-code` | 14 / 20 | 400 | mono | |
| `.type-metric` | 30 / 36 | 600 | Bricolage | tabular figures. |

The three 14px chrome roles separate by **weight and tracking, not size**, so nothing here can
ever be shrunk to distinguish it.

**Modifiers, which are not roles:** `.type-body--narrow` and `.type-body--full` adjust one
property of a body role and mean nothing alone. `.type-flush` (`line-height: 1`) exists for the
~18 selectors that centre a glyph, an avatar initial or a stepper number inside a fixed-height
circle; it is always used alongside a role, never on its own.

**Layer 3** is one `--type-role-*` composite per role, for a canvas or an inline style. Read the
warning at the head of `design/type.css` first: the `font:` shorthand carries only
weight/size/leading/family and **resets** `font-variant-numeric`, Inter's stylistic sets and
everything outside the font group; and the phone breakpoint targets the class, not the composite.

### Where type may be declared
`font-size`, `line-height`, `font-weight`, `letter-spacing`, `font-family`, `text-transform`,
`font-variant-numeric` and the `font` shorthand belong in **`design/tokens.css` and
`design/type.css` and nowhere else.** `npm run lint:tokens` counts every one that lives anywhere
else, as `type-property-outside-type-layer`.

Two things are not counted, and both for the same reason: they set no type **value**.
- A CSS-wide keyword (`inherit`, `initial`, `unset`, `revert`). `font: inherit` on a `<button>`
  is how a control rejoins the page face at all.
- A line carrying a `lint-tokens-ignore` comment **with a stated reason**.

### How a screen joins a role
`design.css` imports `type.css` **before** `base.css`, and component sheets import later still
(several are code-split and injected later again), so **a role loses every same-specificity tie
it could be in.** There are exactly two ways in, and both require the component's own stylesheet
to hold **zero** type declarations:

1. **Group the component selector into the role's selector list** in `type.css`. No markup
   changes. This is the `base.css` pattern that already puts ten chip families on one recipe and
   three segmented controls on another. Anything grouped into a role that the phone block
   re-states must be repeated there by hand: a class selector cannot match a descendant one.
2. **Replace** the old class in markup with the role class. Use this where the component's styles
   are injected at runtime (`ui/account-sheet.ts`, `ui/profile-badge.js`), because those land
   after every stylesheet and a grouped role can never beat them.

A role added *beside* an old class does nothing: the old class still wins. Half-doing it silently
half-applies, and nothing warns you.

### The nine type rules

**T1. Four levels per screen, no more.** A screen carries at most four text treatments (e.g.
display, title, body, label). A fifth idea reuses one of the four rather than inventing a fifth.

**T2. Make levels obviously different.** Two levels on one screen differ by at least one rung of
the ladder, and ideally by weight or ink as well. A 1–2px difference is not a level, it's a bug.
**15px and 17px are gone from the product; do not reintroduce them.** The 14→16 rung is the one
narrow pair (14%), so those two must also differ in weight or ink colour.

**T3. The ladder: 14 · 16 · 18 · 20 · 24 · 30 · 36.** Seven rungs; most screens use three or
four. Nothing sits between rungs. Prefer a role plus the phone breakpoint over a `clamp()`; if a
fluid size is unavoidable, both endpoints land on a rung.

**One rung, one token name.** A rung has exactly one `--type-size-*` token. Caption, Label and
Lead used to have their own size tokens that resolved to a rung another token already owned
(14px three times over, 18px twice), which is four ways to write the same thing and no way to
tell them apart on screen. They are **treatments, not sizes**, and they are roles now.

**T4. Leading is absolute, and married to its size.** 14→20 · 16→24 · 18→28 · 20→28 · 24→32 ·
30→36 · 36→40. Every one lands on the 4px grid, so type and spacing share a rhythm.

> The rule is "every leading lands on the grid", **not** "the ratio falls as size rises". The
> real ramp does not fall monotonically: 18px takes 28 (1.556), which is looser than 16px's 1.5.
>
> Never mix these seven absolute `--type-leading-sm..4xl` lengths with the four legacy
> `--type-leading-tight/snug/normal/relaxed` **multipliers** (which now live only in the parked
> gallery's own sheet, and as Tailwind `leading-*` utilities). Swapping one family for the other
> turns a 24px leading into a 1.5 ratio with no lint error and no failing test.

**T5. Reading content caps at 66 characters per line** (75 absolute max). This governs prose: the
briefing, recaps, anything generated. The body roles carry the measure themselves. Tables and
working surfaces are **not** capped by measure — their width comes from their columns, which is
why `.type-body-sm` carries none and why `.type-body--full` exists.

**T6. Bricolage only at 20px and above.** The display face is cut for size. Inter carries all
body, labels, controls, table cells and captions. Bricolage below 20px is a defect.

**T7. Tabular numerals for anything that lines up or changes.** `font-variant-numeric:
tabular-nums` on tables, right-aligned numeric columns, timers, scores, and any figure that
updates in place while the reader watches. `.type-metric` bakes it in — and declares it **last**,
because a `font:` shorthand above it resets the figures back to proportional. `base.css`'s
`.num-tabular` is the standalone escape hatch; pair it in markup rather than declaring the
property in a component sheet. Prose keeps proportional figures.

**T8. One bold phrase per paragraph, maximum.** In generated prose, never bold a whole sentence
and never bold the lead-in of every bullet. Blanket bolding is the loudest AI tell and it
destroys the scanning value bold is meant to buy.

**T9. Let CSS absorb unknown lengths.** Model output can't be hand-tuned, so the heading roles
carry `text-wrap: balance` (no one-word last lines) and the body roles carry `text-wrap: pretty`.
You do not add them by hand.

### Print and email
Neither surface can read a CSS variable, so both carry a **derived copy** of the table above,
held by a test rather than by the linter.

**PDF** (`admin/src/ui/recap-pdf.ts`) — pdfmake measures in points, so `pt = px × 0.75`. Its
`lineHeight` is a multiplier (`leadingPx ÷ sizePx`) and its `characterSpacing` is absolute points
(`em × sizePt`). Only three static faces ship, so Inter 500 and Inter 600 have no PDF form and
fall to 400 and 700, and `.type-code` has no PDF form at all. Held by `recap-pdf.test.ts`.

**Email** (`backend/api/services/notifications/email-layout.ts`) — mail clients load no
stylesheet and no webfont, so the shell is inline styles, hex literals and a system-sans stack by
necessity, and it has **no media query**, so nothing can drop a rung on a phone. Sizes come from
`email-type.ts` and are asserted against the real `tokens.css` by `email-layout.test.ts`.


### Named Rules
**The Name-Wins Rule.** A person's name outweighs their job title (title is ~16px dim, never a
second display line).
**The Screen-Names-The-Object Rule.** A detail or recap screen's heading names the thing you
opened — the person, the 1:1 — never the parent list, and never re-shows the parent screen's
header stacked above it. A read-only 1:1 recap uses the shared `admin/src/ui/recap-header.ts`
(breadcrumb + a heading that names the 1:1); a generic title like "Past 1:1" fails this rule.

## 3a. Layout and spacing

Sero already has the tokens: an 8px rhythm on a 4px grid (`--sero-space-*`, where `n = px / 4`) and
the `.l-*` primitives. What follows are the rules about **relationships** — how far apart things
sit, and what that distance tells the reader.

**L1. Groups sit twice as far apart as the things inside them.** Items within a group use 8/12px;
groups are separated by 24/32px. Anything under 1.5× is a defect, because at that ratio the reader
can no longer tell where one group ends. This is the single biggest readability lever on a screen.

**L2. A heading belongs to what follows it.** The space *above* a heading is at least twice the
space *below* it (e.g. 32px above, 12px below). Equal gaps orphan the heading between two blocks
and the reader can't tell what it titles.

**L3. Three vertical lines, maximum.** A screen has at most three left/right alignment axes: the
nav edge, the content-column left, and a right-aligned numeric/action edge. Every text block lands
on one of them. In a form, label, field and helper text share one axis; helper and error text sit
*below* the field, never to its right.

Two existing rules restated in these terms, so they're findable here:

- **Nesting stops at two.** DESIGN's "never nested cards" (§5, §6.10) generalises: page → card →
  optional inset region, and no third delimited box inside that. Sub-sections inside a card are
  separated by space and a heading, not by another box.
- **Numbers right-align, text left-aligns.** Variable numeric columns and their headers right-align
  (with T7's tabular figures, so digits stack). Discrete identifiers stay left.

## 4. Elevation

Flat by default. Depth = the tonal step from page (#f5fafd) to surface (#ffffff) + 1px borders +
spacing. Shadows only when something detaches from the page: dropdowns and toasts get a soft lift,
modals and side panels a larger one. Never ambient decoration. Honour `prefers-reduced-motion`.

## 5. Components

Sero's own shapes + Sero tokens. Canonical recipes (visual versions on the in-app sheet):

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

The "before you build" checklist — every new or touched screen passes all fifteen:

1. **Do** take colours only from the tokens; **don't** type hex in a screen file.
2. **Do** keep every text ≥ **14px** and every colour-as-text at **4.5:1+** (on light: coral 800,
   mint 900, gold 900 — never a 700 as text; use `--color-positive-text`/`--color-negative-text`).
3. **Do** give each screen exactly **one blue action**.
4. **Do** round controls at **4px**, cards at **12px**.
5. **Do** design the **empty, loading, and error** states with the screen, not after. A loading
   state is a **preset** from `ui/skeleton-presets.ts`, never hand-rolled markup and never a grey
   "Loading…" sentence: it borrows the screen's own layout classes so the ghost is the same size
   as the content, and nothing jumps when the data lands. No preset fits? Add one to the catalogue
   and to the sheet's Loading skeletons section, then use it.
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
14. **Do** take a **role** from `design/type.css` rather than declaring type on a screen. Type
    properties are legal in `design/tokens.css` and `design/type.css` **only** — anywhere else is
    counted by `npm run lint:tokens`. Keep to the ladder (**14 · 16 · 18 · 20 · 24 · 30 · 36**),
    at most **four levels** per screen, each visibly different; **don't** invent 15px or 17px.
    Bricolage ≥20px only; prose capped at 66 characters a line (see §3).
15. **Do** space **groups twice as far apart as their contents**, and sit a heading closer to what
    it titles than to the block above; keep to **three alignment axes** (see §3a, L1–L3).

**Exemptions** (these sit outside the fifteen rules — don't "fix" them). This list is the twin of
the `ALLOWLIST` in `scripts/lint-design-tokens.js`; if you change one, change the other.
- **Dev/debug chrome** (`ui/dev-badge.js`, `ui/build-stamp.js`) — deliberate terminal-style kit,
  dark, mono, its own palette.
- **The in-app design sheet** (`stages/design.js`) — it demonstrates the system (including small
  illustrative glyphs in its mock cards), so it documents the rules rather than being bound by them.
- **Decorative signatures** (`design/orb.css`, `design/motion.css`) — the thinking orb's gradient
  and the aura/shimmer have no token home and are meant to be one-offs.
- **On-dark translucency** (`design/app-nav.css`) — alpha-white over the dark rail; no token for it.
- **The brandmark SVG** (`ui/app-nav.js`, `ui/session-topbar.js`, both apps) — it's the logo, not
  an icon, and its fills are the mark's own.
- **The PDF renderer** (`ui/recap-pdf.ts`) — pdfmake can't read CSS variables, so each hex there
  names the token it mirrors, and each `fontSize` is a print rung derived from the roles
  (`pt = px × 0.75`). Both halves are held by `ui/recap-pdf.test.ts` instead of by the linter.
- **The email shell** (`backend/api/services/notifications/email-layout.ts` and its
  `email-type.ts`) — mail clients strip `<style>`, so an email has no stylesheet, no classes and
  no custom properties: inline hex and a literal system-font stack are forced, not drift.
  `email-type.ts` is to email what `tokens.css` is to the screens. Held by
  `email-layout.test.ts`, which parses the real `tokens.css` and compares them rung by rung.
- **The parked gallery** (`admin/src/stages/tests/`) — design sketches behind /test that no
  customer reaches. Exempt from the **structural** type rules only (`TYPE_EXEMPT` in the linter,
  which is narrower than `ALLOWLIST`): the 14px floor and the colour rules still apply in full.
  Parked is not the same as unreadable.
- **`design/tokens.css`** — the source of truth; it is where hex values are supposed to live.
- **Tests** (`*.test.*`).

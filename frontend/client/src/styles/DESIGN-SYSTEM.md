# Sero design system

Single source of truth: **`src/styles/design.css`** (`:root` tokens) → surfaced as
Tailwind utilities in **`tailwind.config.js`**. Both read the same CSS variables, so a token
change propagates everywhere.

**Rule for new code:** reference `--sero-*` tokens, the `.l-*` layout primitives, and the
semantic type/component classes below. Legacy aliases (`.stage-inner`, `.field-actions`,
`.briefing-grid--pair`, `--type-small`, …) still work but are marked `@deprecated` in the CSS —
don't reach for them in new markup.

---

## Spacing (4px base, `number = px / 4`)

| Token | px | Tailwind |
|---|---|---|
| `--sero-space-1` | 4 | `*-sero-1` |
| `--sero-space-2` | 8 | `*-sero-2` |
| `--sero-space-3` | 12 | `*-sero-3` |
| `--sero-space-4` | 16 | `*-sero-4` |
| `--sero-space-5` | 20 | `*-sero-5` |
| `--sero-space-6` | 24 | `*-sero-6` |
| `--sero-space-7` | 28 | `*-sero-7` |
| `--sero-space-8` | 32 | `*-sero-8` |
| `--sero-space-9` | 36 | `*-sero-9` |
| `--sero-space-10` | 40 | `*-sero-10` |
| `--sero-space-12` | 48 | `*-sero-12` |
| `--sero-space-14` | 56 | `*-sero-14` |
| `--sero-space-16` | 64 | `*-sero-16` |
| `--sero-space-20` | 80 | `*-sero-20` |
| `--sero-space-24` | 96 | `*-sero-24` |

Prefer these over off-grid Tailwind defaults (`p-5`, `gap-7`, …).

## Typography

Modular scale (~1.2) anchored at 16px body.

| Role | Token | Size | Class | Tailwind |
|---|---|---|---|---|
| Display / hero | `--type-display` | clamp 44–56px | `.text-display` | `text-display` |
| Page title | `--type-h1` | clamp 32–44px | `.h1` | `text-h1` |
| Section | `--type-h2` | clamp 28–36px | `.h2` | `text-h2` |
| Subsection | `--type-h3` | 20px | `.h3` | `text-h3` |
| Minor heading | `--type-h4` | 18px | `.h4` | `text-h4` |
| Lead paragraph | `--type-lead` | 18px | `.lead` | `text-lead` |
| Body | `--type-body` | 16px | `.body` | `text-base` |
| Small / hint | `--type-body-sm` | 14px | `.caption` | `text-sm` |
| Caption | `--type-caption` | 13px | — | `text-caption` |
| Label / eyebrow | `--type-label` | 12px | `.label`, `.eyebrow` (uppercase) | `text-label` |

Supporting token families (also Tailwind `font-*`, `tracking-*`, `leading-*`):

- **Weight** — `--type-weight-regular/medium/semibold/bold` (400/500/600/700)
- **Leading** — `--type-leading-none/tight/snug/normal/relaxed/loose` (1 / 1.1 / 1.25 / 1.5 / 1.6 / 1.75)
- **Tracking** — `--type-tracking-tighter/tight/normal/wide/wider` (−0.02 / −0.01 / 0 / 0.02 / 0.04em)

> `.h1` intentionally renders at display size (back-compat). Use `.text-display` for the hero
> and `--type-h1` / `text-h1` when you want the distinct, smaller page-title size.

## Other token families (already established)

- **Color** — `--sero-{primary,mint,sky,lavender,coral,gold,teal,navy,soft,charcoal}-{50…950}`;
  semantic roles `--sero-{success,warning,error,info,link,ai}`; block accents
  `--sero-block-*`. Tailwind: `bg-sero-primary-700`, `text-sero-error`, legacy `text-ink`, etc.
- **Radius** — `--sero-radius-{sm,md,lg,xl,2xl,full}` + role aliases `-button/-input/-card`.
- **Shadow** — `--sero-shadow-{xs…2xl}` + elevation `-raised/-floating/-overlay` + `-focus`.
- **Z-index** — `--sero-z-{base,dropdown,sticky,fixed,modal,popover,tooltip,toast,max}`.
- **Breakpoints** — `--sero-breakpoint-{sm 640,md 768,lg 1024,xl 1280,2xl 1536}`; Tailwind
  screens `sero-sm…sero-2xl`. Standardize on these — avoid one-off `32rem` / `720px` queries.
- **Motion** — `--ease-{out-expo,in-out-cubic,spring}`, `--dur-{instant,fast,medium,slow,hero}`.

---

## Layout primitives (`.l-*`)

Class-based, token-driven. Use instead of ad-hoc Tailwind stacks / one-off grids.

| Class | Purpose | Modifiers |
|---|---|---|
| `.l-container` | centered max-width wrapper (38rem) | `--wide` (72rem), `--full` |
| `.l-stack` | vertical flex rhythm via `gap` (16px) | `--1/2/3/6/8/10/12` (token gaps) |
| `.l-row` | horizontal flex, centered | `--2/3/6`, `--start/baseline/between/end/wrap` |
| `.l-grid` | CSS grid, `--l-cols` track count (12) | `--pair/3/4`, `--gap-4/8`, `--keep` (no collapse); cells `.l-col-3/4/6/full` |
| `.l-cluster` | wrapping inline group (buttons, chips) | `--2`, `--end` |

`.l-grid` collapses to a single column below 768px (`--sero-breakpoint-md`) unless `.l-grid--keep`.

```html
<div class="l-container l-container--wide">
  <header class="page-header">
    <div class="page-header__row">
      <div class="l-stack l-stack--1">
        <span class="eyebrow">Briefing</span>
        <h1 class="h1">What stood out</h1>
      </div>
      <button class="btn btn--ghost">Reset</button>
    </div>
    <p class="page-header__lede">A short summary line.</p>
  </header>

  <div class="l-grid l-grid--pair l-grid--gap-8">
    <section class="l-stack l-stack--6">…</section>
    <section class="l-stack l-stack--6">…</section>
  </div>
</div>
```

## Component primitives

**Form field** — `.field` (column, 8px gaps) with `.field__label`, `.field__control`,
`.field__hint`, `.field__error` (`[hidden]` aware), `.field__actions`.

```html
<label class="field">
  <span class="field__label">Their name</span>
  <input class="input field__control" />
  <span class="field__hint">First name is fine.</span>
  <span class="field__error" hidden></span>
</label>
```

**Buttons** — base `.btn` is the medium default. Sizes: `.btn--sm`, `.btn--md` (token-aligned
8/16px), `.btn--lg` (12/24px). Variants: `.btn--ghost`, `.btn--danger`. All buttons now show a
`:focus-visible` ring (`--sero-shadow-focus`).

**Page header** — `.page-header` + `.page-header__row` / `__step` / `__lede`. Generalizes the
per-stage header so eyebrow, step counter, title, lede, and trailing action align consistently.

---

## Deprecated aliases (kept working, don't use in new code)

| Old | Use instead |
|---|---|
| `.stage-inner` | `.l-container` |
| `.stage-wide` | `.l-container--wide` |
| `.field-actions` | `.field__actions` / `.l-cluster` |
| `.stage-step` | `.page-header__step` |
| `.briefing-grid--pair` | `.l-grid.l-grid--pair` |
| `.briefing-headline` | `.h1` |
| `--type-small` | `--type-body-sm` |

`.stage` (full-viewport centering) is **not** deprecated — it's orthogonal to `.l-container`.

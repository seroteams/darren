# Sero brandmark — this is our logo

The rounded square with two bars and two dots is **the Sero logo**. It is the one
official mark. Don't redraw it, restretch it, recolour it outside the palette below,
or add effects. Use these files as-is.

## The source of truth

`sero-brandmark-source.svg` — the **original master artwork**, exactly as supplied
(charcoal #333333 tile, white marks, 280×280). This is the reference every other file
is derived from. Don't edit it; if the mark ever changes, replace this file and
regenerate the versions below from it.

## The default

`sero-brandmark-charcoal.svg` — same artwork with an `aria-label`. This is the day-to-day
logo; reach for it unless you have a reason to use another colour.

## Colour versions (all from our design tokens)

Every tile keeps **white marks** for contrast:

| File | Tile colour | Token |
|------|-------------|-------|
| `sero-brandmark-charcoal.svg`  | `#333333` | Charcoal 700 — **master** |
| `sero-brandmark-ink.svg`       | `#1f2a37` | Ink |
| `sero-brandmark-blue.svg`      | `#5aa9e6` | Action blue |
| `sero-brandmark-blue-deep.svg` | `#1b5d91` | Blue pressed |
| `sero-brandmark-mint.svg`      | `#1aa887` | Mint 800 |
| `sero-brandmark-lavender.svg`  | `#55358f` | Lavender 800 |
| `sero-brandmark-coral.svg`     | `#ac1608` | Coral 800 |

## Backgrounds without a tile

| File | Marks | Use on |
|------|-------|--------|
| `sero-brandmark-mono-light.svg` | ink marks on a pale `#f5fafd` tile | pale surfaces, mono print |
| `sero-brandmark-white.svg`      | white marks, transparent tile     | dark or photo backgrounds |
| `sero-brandmark-ink-marks.svg`  | ink marks, transparent tile       | light backgrounds |

## Rules

- **Clear space:** keep space equal to one bar-width clear on every side.
- **Minimum size:** don't render below 24px.
- **Don't:** recolour the marks, squash the square, add shadows/gradients, or rotate it.
- **Corners are intentional** — the tile radius is part of the mark; don't square it off.

See it rendered in the component sheet under **Brandmark** (`../index.html#brandmark`).

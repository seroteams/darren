# P2 — Delete the provably dead

**Status:** ✅ built, awaiting Carl's sign-off · **Changes pixels:** no
**Files touched:** `admin/tailwind.config.js`, `admin/src/styles/design/tokens.css`,
`admin/src/styles/design/layout.css` (one stale comment)

## ✅ GREEN-LIT 2026-07-26 — Carl read the byte-identical rule diff, ramp correction included ("a")

## The audit was wrong about the colour ramps. They stay.

The plan said "70 dead colour ramp steps of 122". That is **not true**, and it would have been a
visible bug. `admin/src/stages/design.js:182-187` renders the full palette by building token names
at runtime:

```js
STEPS.map((step) => `<div class="ds-ramp__chip" style="background: var(--sero-${s.key}-${step})">`)
```

11 scales × 11 steps = **121 swatches**, all read straight from `tokens.css`. Deleting unused steps
would have left 70 transparent chips on the Design system screen. A plain text search called them
dead because the names are never written out literally.

So the ramps are kept whole, and this phase deleted 53 tokens rather than ~124. Verified after the
fact: all 19 dynamically-built names still resolve, and the ramp grid has **zero gaps**.

> **One question this leaves for later, and it's a design call, not a clean-up one:** the Teal
> scale has no product usage at all. It exists as 11 swatches on the palette screen and nowhere
> else. Dropping a colour from the brand palette is Carl's decision, so it stays untouched.

## Order matters: Tailwind first, then tokens

`admin/tailwind.config.js` was the *only* thing referencing 40-odd tokens, and it referenced them
invisibly, building the names in a loop (`seroScale`). While it stood, those tokens looked live.

**Step 1 — trim the config.** It was 211 lines generating ~380 utilities from the token layer: 11
colour ramps, 18 spacings, 11 radii, 13 shadows, 10 z-indices, 5 breakpoints, 13 font sizes. Every
utility actually used in markup across both apps was counted:

| Kept | Used | | Deleted | Used |
|---|---|---|---|---|
| `text-ink-dim` | 155 | | every `*-sero-*` utility (colour, spacing, radius, shadow, z, screens) | **0** |
| `text-sm` | 107 | | `text-h1/h2/h3/h4/lead/caption/label` | **0** |
| `text-ink-mute` | 59 | | `rounded-card/button/input` | **0** |
| `leading-normal/snug/relaxed/tight` | 39 | | `duration-instant/fast/medium/slow/hero` | **0** |
| `text-ink`, `text-negative` | 24 | | `font-regular/medium/semibold/bold` | **0** |
| `text-xs` | 7 | | `tracking-tighter/normal/wider` | **0** |
| `max-w-measure`, `max-w-wide` | 6 | | `shadow-card-hover`, `sero-*` shadows | **0** |
| `tracking-tight/wide` | 5 | | `bg-surface`, `border-border`, `text-accent`, `text-positive`, … | **0** |
| `shadow-card` | 3 | | | |
| `text-display` | 2 | | | |
| `ease-out-expo` | 1 | | | |
| `font-sans` (preflight reads it) | — | | | |

211 lines → 74. This matters beyond byte count: it was a **second, parallel design system** anyone
could reach for, silently bypassing the tokens and DESIGN.md.

**Step 2 — re-audit.** With the fake consumer gone, the dead list grew from 75 to 98 names.

**Step 3 — delete the 53 that are dead and not part of a rendered ramp:**

| Group | Count | Note |
|---|---|---|
| `--sero-state-*` | 9 | interaction overlays, never wired up |
| `--sero-breakpoint-*` | 5 | **structurally unusable** — custom properties don't work in `@media` |
| `--sero-block-*` | 6 | category accents; the design sheet's tags use ramp steps directly |
| `--sero-elevation-*` + `--sero-shadow-none/-2xl/-inner` | 7 | |
| `--sero-radius-none/-2xl/-modal/-badge/-avatar/-tooltip` | 6 | |
| `--sero-space-px/-9/-20/-24` | 4 | five steps carry 86% of all spacing |
| `--sero-info`, `--sero-info-light`, `--sero-completed`, `--sero-ai`, `--sero-purple` | 5 | |
| `--sero-z-base`, `--sero-z-max` | 2 | |
| `--type-leading-none/-loose`, `--type-tracking-normal` | 3 | |
| `--space-section`, `--space-page-tail` | 2 | the role-spacing layer had 1 call site across 3 tokens |
| `--color-purple-glow`, `--color-warn` | 2 | |
| `--sero-emerald-500`, `--sero-rose-700` | 2 | "phantom-token backfills" that became phantoms again |

**309 → 256 tokens.**

## Proof

Built both apps before and after, split each stylesheet into top-level rules, and compared the
`:root` block separately from everything else. A token deletion is supposed to shrink `:root` and
change nothing else.

```
########## admin  (157,698 -> 155,800 bytes) ##########
:root custom properties: 309 -> 256
  REMOVED (53)   [full list in the diff]
everything OUTSIDE :root: 1391 -> 1391
  identical
VERDICT: CLEAN — nothing outside :root changed

########## frontend  (157,894 -> 155,996 bytes) ##########
:root custom properties: 309 -> 256
everything OUTSIDE :root: 1393 -> 1393
  identical
VERDICT: CLEAN — nothing outside :root changed
```

The Tailwind trim was checked the same way as its own step: **zero rules changed, in either app.**
Not one removed utility was live.

```
npm run typecheck   clean
npm test            195/195 passed
npm run lint:tokens PASS — 68 / 53 / 135, ceilings unmoved
```

One run mid-phase reported 194/195. It was green on the two runs either side, and the working tree
holds uncommitted edits from other sessions (`design/motion.css`, `ui/skeleton.js`), so it was a
concurrent-edit flake, not this change. Noted rather than swept.

## QA (no browser needed)

```bash
npm test && npm run lint:tokens
```

**✅ Pass:** `195/195 passed`, guard PASS at 68 / 53 / 135.
**❌ Fail:** any test failure, or a ceiling breach.

Optional eyeball, if Carl wants one: `local > admin > Design system` — the Colours section, "Full
palette" expander. All 11 scales should still show 11 solid chips each, no gaps.

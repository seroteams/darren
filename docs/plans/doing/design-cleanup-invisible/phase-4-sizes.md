# P4 — One name per size

**Status:** ✅ built, awaiting Carl's sign-off · **Changes pixels:** no (one nuance, below)

## The problem

Four token names all meant 14px, and two meant 18px:

| Value | Names | Sites |
|---|---|---|
| 14px | `--type-body-sm`, `--type-caption`, `--type-label`, `--type-small` (self-`@deprecated`) | 264 + 27 + 25 + 24 |
| 18px | `--type-h4`, `--type-lead` | 12 + 7 |

Plus **55 hardcoded font-size literals** on rungs that already had a token.

DESIGN.md's own T2 says two levels must be visibly different, and "a 1-2px difference is not a
level, it's a bug". Four names rendering identically is the same bug wearing a bigger coat: no
reader can tell a caption from a label from small text, because there is nothing to tell.

## What changed

- `--type-caption` (27), `--type-label` (25), `--type-small` (23 of 24) → `--type-body-sm`
- `--type-lead` (7) → `--type-h4`
- 55 literals → tokens: `14px` → `--type-body-sm` (47), `16px` → `--type-body` (4),
  `18px` → `--type-h4` (4)
- DESIGN.md §3 gains the rule that made this necessary: **one rung, one token name.** Caption and
  Label are still real treatments, they are just not sizes: a label is `--type-body-sm` + weight
  500 + `--type-tracking-wider`, set where it is used.

**Guard ceiling: 68 → 13.** The 13 survivors are every remaining non-token font-size, and all of
them are OFF-ladder (15px ×8, 17px ×2, 30px ×2, 32px ×2). That is precisely the visible type
pass's work, now isolated and countable.

**Tokens 253 → 250.**

## The one nuance, stated rather than buried

Four literals were `18px` and the token they moved to, `--type-h4`, is `1.125rem`. At the browser
default root size (16px) those are the same 18 pixels, and nothing in either app overrides the root
font-size (checked). They differ only for a reader who has raised their browser's default text
size, and for that reader the rem version **scales with their setting** where the literal would
not. That is the accessible behaviour and it matches the rest of the scale, so it is an
improvement rather than a regression, but it is not literally "zero change" and should not be
described as such.

The token file still mixes units (`--type-body: 16px` but `--type-h3: 1.25rem`). Normalising that
changes behaviour for non-default root sizes, so it belongs to the visible pass, not here.

## Two temporary bridges remain

`--type-small` survives as a one-line alias because `design/session-topbar.css` calls it once and
is held by session 4b899314's lane. Same pattern as P3's radius bridge. Both are marked in
`tokens.css` with the lane that blocks them and the line to delete.

## Proof

```
########## admin ##########
unresolved names, both sides (Tailwind runtime / component-scoped, not a bug): 30
no token that resolved before is undefined now
token count: 253 -> 250

########## frontend ##########  (same)
```

The resolved-rule comparison shows 6 removed / 11 added in each app. Accounted for individually:

- **4 are mine**, all `font-size:18px` → `1.125rem` (`.um-menu-btn`, `.pa-add__plus`, and two
  more). Same rendered size; see the nuance above.
- **The rest are other sessions' work** landing in the tree between builds: `.sk-two-col` from the
  skeleton-shapes lane, `.start-vs` / `.start-step` / `.start-pain` from a start-stage edit. `git
  status` confirms `design/start-stage.css`, `design/motion.css` and `design/promise-agree.css`
  carry uncommitted changes this session did not make.

```
npm run typecheck        clean
node scripts/test-design-guard.js
  design guard ok — 194 files, 0 violations; fonts 13/13, radii 53/53, spacing 135/135; copy clean
npm test                 196/196 passed
```

**The intermittent failure is identified.** Running the suite three times gave
`195/196, 196/196, 196/196`, and the failing test is `admin/src/ui/skeleton-presets.test.ts` —
owned by session 70b40d36, which is editing `skeleton-parts.ts` and `skeleton-presets.ts` right
now. The suite reads those files mid-write. Not this change, and now named rather than shrugged at.

## QA (no browser needed)

```bash
npm test && npm run lint:tokens
```

**✅ Pass:** `196/196 passed`; guard PASS with **fonts at 13**, down from 68.
**❌ Fail:** a ceiling breach, or a font count above 13.

# P0 — Make the docs true

**Status:** ✅ built, awaiting Carl's sign-off · **Changes pixels:** no
**Files touched:** `DESIGN.md`, `SERO_BOARD.md`, `admin/src/styles/DESIGN-SYSTEM.md`,
`docs/reference/handover.md`

## ✅ GREEN-LIT 2026-07-26 — Carl read the grep + both linters green ("a")

## Result (2026-07-26)

```
$ grep -rin "flowbite" DESIGN.md SERO_BOARD.md README.md CLAUDE.md STATUS.md \
    docs/reference/handover.md admin/src/styles/DESIGN-SYSTEM.md
DESIGN.md:109:Master + colour versions live in `admin/public/sero-flowbite/brand/`

$ npm run lint:copy   -> PASS, 255 files
$ npm run lint:tokens -> PASS, 191 files
```

The one surviving hit is a real folder that exists on disk and holds the brandmark SVGs. Renaming
it would 404 the logo, and `audit-fixes-jul-25` already owns the brand-mark path work, so it stays.

**Overlap noted:** session `d03316aa`'s `component-consolidation/phase-8.md` had the same doc fixes
queued. That phase can now drop them.

---

## Why

DESIGN.md auto-loads into every agent session, so its errors propagate into every screen built
from it. Four of its claims are false:

| Claim | Reality |
|---|---|
| "The base is Flowbite 2.5.2 components" (`:3`, `:92-97`, `:259`) | `flowbite` is not in `package.json` and not in `node_modules`. Zero Flowbite classes in markup. The CDN prototype it refers to was retired. |
| "The visual twin is `admin/public/sero-flowbite/index.html`. Copy from the sheet" (`:83-84`) | That file does not exist. The directory holds only `brand/`. The real sheet is the in-app stage `admin/src/stages/design.js` (769 lines). |
| "Colour tokens live in `admin/src/styles/design.css`" (`:86`) | That file is a 34-line `@import` barrel. Tokens live in `design/tokens.css` — which line 136 already says correctly, so the doc contradicts itself 50 lines apart. |
| Exemption for "The Universe screen (`stages/universe.ts`, `stages/universe.model.ts`)" (`:349-352`) | Neither file exists. `find admin frontend -name "universe*"` returns nothing. The matching `/universe\./` entry in the guard's allowlist is dead too (removed in P1). |

Also: `SERO_BOARD.md:140-144` repeats the Flowbite + component-sheet claim, and a **second**
design doc at `admin/src/styles/DESIGN-SYSTEM.md` (145 lines) carries its own stale numbers
(`--type-caption` "13px", `--type-label` "12px" — both are 14px now; `--type-display` "clamp
44-56px" — it is 30-42px). Two design docs is how the next drift starts.

## What changes

- Strip the Flowbite premise from `DESIGN.md` and replace it with what is actually true: Sero's
  own component recipes, tokens, and the in-app sheet.
- Repoint "the living reference" at the in-app Design system stage.
- Fix the tokens path at `DESIGN.md:86`.
- Delete the Universe exemption; keep the `stages/gallery/` one (it is real).
- Add the exemptions the guard already honours but the doc never listed: `orb.css`, `motion.css`,
  `app-nav.css`, `app-nav.js`, `session-topbar.js`, `recap-pdf.ts`, `tokens.css`, `*.test.*`.
- Collapse `admin/src/styles/DESIGN-SYSTEM.md` to a pointer at `DESIGN.md` (only `repo-map.md`
  references it).
- One-line correction to the closed-track entry in `SERO_BOARD.md`.

Not touched: the "Known drift" note at `DESIGN.md:191-195`. It is accurate and stays until the
visible pass fixes the thing it describes.

## Done means

- `grep -ri flowbite` over `DESIGN.md`, `SERO_BOARD.md`, `README.md`, `CLAUDE.md` returns nothing.
- No reference anywhere to `sero-flowbite/index.html`.
- One design doc.

## QA (no browser needed)

```bash
npm run lint:copy && npm run lint:tokens
```

**✅ Pass:** both PASS, exit 0, same counts as the baseline (nothing functional changed).
**❌ Fail:** an em dash slipped into the rewritten prose, or a count moved.

Second check, pasted for Carl:

```bash
grep -rin "flowbite" DESIGN.md SERO_BOARD.md README.md CLAUDE.md
```

**✅ Pass:** no output.

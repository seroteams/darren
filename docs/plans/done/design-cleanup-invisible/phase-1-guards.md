# P1 — Make the guards bite

**Status:** ✅ built, awaiting Carl's sign-off · **Changes pixels:** no
**Files touched:** `scripts/lint-design-tokens.js`, `scripts/test-design-guard.js` (new),
`package.json`

## ✅ GREEN-LIT 2026-07-26 — Carl read the ceiling proof and npm test 192/192 ("a")

## Why

Two design guards existed and both passed, but neither ran anywhere automatically: not in
`npm test`, not in `scripts/gate.js`, not in CI (which runs typecheck / test / replay only), not
in a hook. They ran when someone remembered. A change that reintroduced raw hex, an em dash or
sub-14px text went green all the way to live.

Worse, `npm run lint:tokens` omitted `--report`, so it printed "PASS" while hiding its own
findings: 68 non-token font-sizes, 53 literal border-radii, 135 off-grid spacing declarations.

## What changed

**1. The guard is now a test.** New `scripts/test-design-guard.js`. `scripts/run-tests.js`
auto-discovers every `scripts/test-*.js`, so this lands in `npm test` and therefore CI with no
`package.json` and no `ci.yml` edit.

**2. Ceilings, not booleans.** The soft counts the token guard only reported are now held to a
ceiling. They may fall, never rise. Setting them to zero today would have meant ~256 failures on
day one; starting at the measured count freezes existing debt and blocks new debt. Each later
phase lowers a ceiling in the same commit that earns it.

```js
const CEILINGS = { nonTokenFont: 68, literalRadius: 53, offGridSpacing: 135 };
```

On breach the failure names the counts per file, so the session that grew one sees its own file
in the list.

**3. `--json` mode** on `lint-design-tokens.js` so the counts are machine-readable. Exit codes
unchanged.

**4. The alias stops hiding.** `"lint:tokens"` now passes `--report`.

**5. Allowlist reconciled with DESIGN.md §6.** Added `stages/gallery/` (DESIGN.md exempted it, the
guard didn't). Removed the dead `/universe\./` entry: `stages/universe.*` no longer exists, so
both the doc exemption (deleted in P0) and the regex were protecting nothing. Adding the real
gallery exemption is what moved the counts from 76/55/138 to 68/53/135.

## Proof

```
$ node scripts/test-design-guard.js
design guard ok — 189 files, 0 violations; fonts 68/68, radii 53/53, spacing 135/135; copy clean

$ npm test
PASS  test-design-guard.js
192/192 passed

$ npm run lint:tokens
design-token guard — scanned 192 files under admin/src, frontend/src
~ 68 warning(s) (non-token font-size >=14px)
~ report: 53 literal border-radius, 135 off-grid spacing declarations
PASS — no hard violations.
```

**The ceiling was proved to trip**, not assumed. A throwaway CSS file with one 15px font-size, one
7px radius and one 7px padding was dropped into `admin/src`, and all three ceilings failed with
`+1` each; the file was deleted and the suite went green again.

```
✗ nonTokenFont rose to 69, ceiling is 68 (+1).
    Design drift may only shrink. Fix the new one, or lower nothing and ask Carl.
    Non-token font-sizes by file (yours is most likely the one that grew):
       17  admin/src/stages/tests/runner-v2.js
       16  admin/src/styles/admin-pulse.css
       15  admin/src/styles/coach-panel.css
       …
        1  admin/src/__ceiling-proof.tmp.css
```

## Note for the other lanes

`runner-v2.js` (17), `admin-pulse.css` (16) and `coach-panel.css` (15) hold 48 of the 68
non-token font-sizes between them, and `coach-panel.css` is a near-verbatim fork of the CSS string
embedded in `runner-v2.js`. Both are held by other sessions' lanes right now, so they are not
touched here. That fork is the single biggest win available on this count when the lane clears.

## QA (no browser needed)

```bash
npm test
```

**✅ Pass:** `PASS  test-design-guard.js` in the list, `192/192 passed` (or higher).
**❌ Fail:** the guard is absent from the list, or reports a ceiling breach.

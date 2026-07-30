# Phase 1 proof — the layer is there, and nothing moved

Measured in the live dev build (`type-web`, localhost:3943, admin app, `/admin/admin/registered`) on 2026-07-30.
No screenshot: the Browser pane would not composite frames this session and the headless
browser was held by another chat. Everything below is a computed-style read from the real
running page or a command against the real repo. Carl's eye is the visual check.

## 1. The role layer genuinely loaded

`.type-heading-xl` injected into the live page computes to **30px / 36px / 600**, exactly its
definition. So `type.css` is reachable through the import chain, not silently absent.

## 2. Nothing in the app uses a role class

Every one of the fourteen role classes checked against the live DOM with `getElementsByClassName`:

```
roleClassesMatchingLiveMarkup: []
```

Zero. Backed by three independent greps over `admin/`, `frontend/` and then the whole repo
(`.js`, `.ts`, `.html`, excluding `dist/` and `node_modules/`), using a negative lookbehind so the
class names are not matched inside the `--type-*` custom-property names. All returned no hits.
The roles are inert until Phase 2 consumes them.

## 3. The ten existing treatment classes are unchanged

Computed live, after the new layer shipped:

| Class | Family | Size | Leading | Weight | Tracking | Case |
|---|---|---|---|---|---|---|
| `.text-display` | Bricolage | 42px | 46.2px | 600 | -0.84px | none |
| `.h1` | Bricolage | 42px | 46.2px | 600 | -0.84px | none |
| `.h2` | Bricolage | 36px | 43.2px | 600 | -0.36px | none |
| `.h3` | Inter | 20px | 27px | 600 | normal | none |
| `.h4` | Inter | 18px | 27px | 600 | normal | none |
| `.lead` | Inter | 18px | 28.8px | 400 | normal | none |
| `.body` | Inter | 16px | 25.6px | 400 | normal | none |
| `.label` | Inter | 14px | 21px | 500 | 0.56px | none |
| `.caption` | Inter | 14px | 21.7px | 400 | normal | none |
| `.eyebrow` | Inter | 14px | 21.7px | 600 | 1.12px | uppercase |
| `.eyebrow--slot` | Inter | 16px | 24.8px | 400 | 0.96px | none |

These are the old system's values, unchanged. `.h1` and `.text-display` both resolve to
`--type-display` and both still render at the clamp's desktop maximum of 42px, which is the
pre-existing inversion Phase 5 fixes. Nothing here is what the new roles specify, which is the
point of this phase.

## 4. Why it cannot have moved

| Claim | Command | Result |
|---|---|---|
| `base.css` untouched since Phase 0 | `git diff HEAD --stat -- .../base.css` | empty |
| `tokens.css` purely additive | `git diff -U0 HEAD -- .../tokens.css \| grep "^-[^-]"` | empty: not one line removed or modified |
| Additions only | `git diff HEAD --numstat` | `59 0` tokens.css, `7 0` design.css |
| The roles lose every tie | `grep -n "@import" design.css` | tokens.css:16, **type.css:23**, base.css:24 |

`type.css` is imported *before* `base.css` on purpose. These sheets are flat, mostly
single-class selectors, so source order decides same-specificity ties. Importing the new file
early means an existing class always wins. The consequence for Phase 2: a role must **replace**
an old class in markup, never sit beside it.

## 5. Free checks

| Check | Result |
|---|---|
| `npm test` | 218/218 passed |
| `npm run typecheck` | clean |
| `npm run lint:tokens` | PASS, no hard violations |
| `npm run lint:copy` | PASS |
| `node scripts/test-design-guard.js` | ok: fonts 13/13, radii 53/53, spacing 135/135, type 560/560 across 9 rules |

## 6. Adversarial review, and what it caught

Three verifiers attacked the build independently: one on invisibility, one on whether the new
lint rules actually fire, one on house rules. Zero blockers, six majors, eight minors. The four
that were real, and what was done:

- **The 14px floor was still px-only.** The unit-aware resolver was built and wired into the
  eight new *warnings* but not into the one hard *error*, so the exact class of bug Phase 0 found
  could still land. Worse, a size written inside a `font:` shorthand was invisible to every size
  rule in the file, and this phase had just published fourteen composites whose entire purpose is
  to be used as `font: var(--type-role-x)`. **Fixed:** the floor now resolves px, rem, clamp
  endpoints and tokens, and reads the size out of a `font:` shorthand. Proved firing on all six.
- **Two ceilings traded against each other.** `font-size: var(--old, 14px)` counted only as
  `relative-font-size`. Doing what the guard's own hint said and dropping the fallback moved the
  site into `unsanctioned-size-token` and would have broken a build that had just fixed something.
  **Fixed:** the token name is read through a fallback, so dropping one can only ever remove a hit.
  `unsanctionedSizeToken` re-froze at its true 451.
- **On-rung rem literals were invisible to every counter.** All eleven could be driven to zero by
  swapping tokens for rem literals, which would read as a finished migration. **Fixed:** a ninth
  rule, `literal-font-size`, frozen at 18.
- **A test claimed coverage it did not have.** The group named "the Phase 1 type.css shape" tested
  a hand-copied string covering six of the fourteen roles and never opened the file. **Fixed:** it
  reads the real `type.css` off disk and asserts all fourteen roles are present.

The rest were record and wording fixes, all applied: the phase file said three new measures when
one shipped, the guard printed two different ladders in one file, a scratch baseline copy was left
in `scripts/`, and the lane row did not claim two files it had touched.

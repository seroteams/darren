# Phase 0 proof — measured in the running app

Measured in the live dev build (`type-web`, localhost:3943, admin app, 1440x900) on 2026-07-30.
No screenshot: the Browser pane would not composite frames this session, so every
number below is a computed-style or layout read from the real running page, not a
render of one. Carl walks the screens himself in the phase-0 scenarios.

## Method

A width probe: the same 29-character string set at 40px/400 in different font stacks,
measured with `getBoundingClientRect().width`. Two stacks that produce the same width
are painting the same face. `serif` is the control for "nothing loaded".

```js
const probe = (stack) => { /* span, position:absolute, 40px, measure, remove */ };
```

## Before the fix

| Stack | Width | Reads as |
|---|---|---|
| `serif` (control) | 542.11 | nothing loaded |
| `"Inter Variable", serif` — the bundled webfont | **542.11** | **identical to serif: the bundled font never painted** |
| `system-ui, serif` | 590.83 | Segoe UI — what a customer without Inter gets |
| `Inter, serif` — Carl's locally installed copy | 644.61 | |
| `InterVariable, Inter, ui-sans-serif, system-ui, sans-serif` — the app's stack | **644.61** | **identical to local Inter: the app was using Carl's installed font** |

`document.fonts` reported 7 `Inter Variable` faces, **all `unloaded`**. Forcing
`document.fonts.load('400 40px "Inter Variable"')` then re-probing gave 644.36 —
so the face was present and downloadable, just never requested by that name.

**Conclusion:** `"InterVariable"` (no space) matched nothing. Machines with Inter
installed silently fell through to the local copy; everyone else got system-ui.
Segoe UI is ~8% narrower than Inter over the same string, so customer line breaks
and truncation points differed from Carl's.

## After the fix

| Check | Result |
|---|---|
| `getComputedStyle(document.body).fontFamily` | `"Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif` |
| `Inter Variable` face status | one **`loaded`** (latin subset; the other 6 are other unicode ranges, correctly unloaded) |
| App stack width | **644.36** |
| `"Inter Variable", serif` width | **644.36** — the app is now painting the bundled webfont |
| `Inter, serif` (local copy) width | 644.61 — no longer what the app uses |

Carl's own view shifts by 0.25px over 29 characters at 40px, i.e. invisible.
A customer's view shifts 590.83 → 644.36. That is the actual win.

## The two floor breaches

| Selector | Before | After | Instances |
|---|---|---|---|
| `.um-trend` (user list trend glyph) | **11.9px** computed, inside a 14px row | **14px** | 37 on `/admin/admin/registered` |
| `.bullet__mark` (briefing bullets) | **10.4px** computed, against a 16px bullet | **14px** | every briefing bullet |

`.bullet__mark` measured by rebuilding the real `.bullets-host > .bullet > .bullet__mark`
structure in the live page and reading the stylesheet's computed result: parent 16px,
mark 14px, colour `rgb(180, 158, 219)` unchanged, glyph box 16px wide (fits the 1rem
grid column).

**Smallest text anywhere on `/admin/admin/registered` after the fix: 14px.** The floor holds.

## Free checks

| Check | Result |
|---|---|
| `npm test` | 217/217 passed |
| `npm run typecheck` | clean |
| `npm run lint:tokens` | PASS, 13 known warnings (unchanged, all queued for later phases) |
| `npm run lint:copy` | PASS |
| `grep -rn "InterVariable"` outside comments | 0 |

## Coverage

The customer app inherits both fixes by construction, verified in source:
`frontend/src/main.js:10` imports `../../admin/src/styles/design.css`, and
`frontend/tailwind.config.js:11` spreads `adminConfig`. One token file, both apps.

# P5 — Get admin CSS out of the customer bundle

**Status:** ✅ built, awaiting Carl's sign-off · **Changes pixels:** no

## The problem

`admin/src/styles/design.css` is a barrel of `@import`s that **both** apps load on first paint.
Three sheets in it are internal-only:

| Sheet | Lines | Who actually uses it |
|---|---|---|
| `design/design-stage.css` | ~1,000 | the internal Design system screen |
| `design/test-engine.css` | 300 | `guide.js`, `personas.js`, `job-lexicons.js` |
| `design/run-log.css` | 235 | `ui/run-debrief.js` |

Every customer downloaded all of it. The two bundles were 157,894 B (customer) and 157,698 B
(admin): a 196-byte difference between an internal console and a customer product.

## The pre-flight found more than expected

The plan named one landmine (`.ds-alert` in `ui/action-error.ts`). A mechanical sweep of every
class in the three sheets, cross-referenced against the customer app's full import graph, found
**four component families** that had escaped the design sheet into real product code:

| Class | Used by |
|---|---|
| `.ds-alert` `.ds-alert--error` `.ds-alert--warn` `.ds-alert__icon` | `ui/action-error.ts` → customer Team + Members |
| `.ds-avatar` | `runs.ts`, `recap-header.ts`, `skeleton-presets.ts`, `frontend/person-detail.ts` |
| `.ds-tabs` `.ds-tab` | `run-detail.ts`, `frontend/person-detail.ts` |
| `.ds-btn-quiet` | `ui/button.ts` |

Unhooking the sheet without moving those first would have shipped four unstyled components to
customers. (The sweep also flagged `card`, `stage`, `btn`, `is-active`, `is-in`, `is-done` — all
false positives: those appear only in compound selectors like `.ds-tab.is-active`, and the base
classes live in other sheets.)

They are promoted to a new `design/shared-components.css`, which stays in the barrel because
customer screens genuinely use it. The misleading `ds-` prefix is kept for now: renaming the
classes would mean editing files three other sessions hold.

## What changed

- `design.css` drops the three admin-only imports and gains `shared-components.css`; its header
  now states the rule that keeps it honest ("does a customer screen use it?").
- Each sheet is imported by the module that owns it, the pattern `personas.js` and `runs.ts`
  already used, so Vite code-splits it: `stages/design.js`, `stages/guide.js` +
  `stages/personas.js` + `stages/job-lexicons.js`, `ui/run-debrief.js`.

## Proof

**The bundle:**

```
                    before        after
admin index.css     157,698 B     129,227 B     (-18%)
customer index.css  157,894 B     129,423 B     (-18%)
```

244 rules left the customer's first-paint stylesheet (1,398 → 1,154). Markers in the customer
bundle: `ds-layout` 0, `ds-rail` 0, `run-log__` 0, `guide-section` 0, `joblex-` 0. The promoted
components are still present in **both** builds.

Two rules appeared that are not mine (`.sk-line`, `.sk-input`, from the skeleton lane). No token
that resolved before is undefined now.

**Nothing lost:** Vite emitted `run-debrief-*.css` in the **customer** build too, paired with its
JS chunk. The debrief still gets its styles, lazily, if a customer ever opens it.

**In the running app** (admin `localhost:3353`, customer `localhost:3355`, both dev servers):

| Check | Result |
|---|---|
| Design system screen | `.ds-layout` display `flex`, `.ds-rail` position `sticky` → its chunk loads |
| The palette (P2's correction) | **121 ramp chips, 0 transparent** |
| Promoted components | `.ds-alert` radius 12px + shadow · `.ds-avatar` radius 50% · `.ds-tab` 2px border, 14px · `.ds-btn-quiet` radius 4px |
| Guide screen | `.guide-toc` `sticky`, `.guide-section` `flex` → test-engine chunk loads |
| **Customer Team page, real failed action** | `.ds-alert--error` renders: border `rgb(247,107,94)`, background `rgb(255,246,245)`, radius 12px, padding 16px, max-width 448px, no shadow |
| Run debrief, before/after its module loads | `.run-log__head` `block` → `flex`, `.run-log__stats` `block` → `grid`, style nodes 9 → 10 |

That last row is the mechanism proved end to end: the sheet is absent until its module loads, then
arrives with it.

```
npm run typecheck   clean
design guard        195 files, 0 violations; fonts 13/13, radii 53/53, spacing 135/135; copy clean
npm test            196/196 passed
```

## What I could not do

**No screenshots.** `computer screenshot` times out in this session with "the Browser pane is not
displayed, so the page is not compositing frames" — the pane isn't visible, so nothing renders to
capture. The evidence above is computed styles read from the live pages in both running apps,
which for this particular change is the sharper instrument (it proves a rule is present or absent,
where a picture only suggests it). But by the house rule this is **not** screenshot-verified, and
the customer Team page in particular is worth Carl's own eyes.

## QA

Free checks, no browser:

```bash
npm test && npm run lint:tokens
```

**✅ Pass:** `196/196 passed`; guard PASS at 13 / 53 / 135.

Optional 2-minute walk, if Carl wants the picture I couldn't take:
`local > admin (dev autologin) > Design system`

1. Open the Colours section, expand "Full palette".
2. Check all 11 scales show 11 solid chips each.
3. Go to Guide in the rail; the sticky contents list on the left should look normal.

✅ **Pass:** both screens look exactly as before · ❌ **Fail:** blank swatches, or an unstyled
wall of text.

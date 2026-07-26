# P3 — One namespace per concept

**Status:** ✅ built (partial by necessity), awaiting Carl's sign-off · **Changes pixels:** no

## The problem

Radius and shadow each had **two competing namespaces**, both live at real volume, so a screen
could round a card three different ways and all three were "correct":

| One value | Names it answered to | Sites |
|---|---|---|
| 12px card radius | `--radius-card`, `--sero-radius-card`, `--sero-radius-lg` | 57 + 7 + 2 |
| 4px control radius | `--sero-radius-sm`, `--radius-input`, `--radius-button`, `--sero-radius-input`, `--sero-radius-button` | 34 + 31 + 19 + 3 + 2 |
| the card shadow | `--shadow-card`, `--shadow-card-hover`, `--sero-shadow-md` | 11 + 3 + 4 |
| the focus ring | `--shadow-focus`, `--sero-shadow-focus` | 22 + 16 |
| the page tint | `--color-bg`, `--color-page` | 22 + 11 |

`--shadow-card-hover` deserves its own mention: a **hover** shadow defined to exactly the same
value as the resting one. The system said "this lifts on hover" and it never did.

## The rule applied

**One name per value, named for the job.** Where a raw scale step had a role, it took the role's
name. Shadows are now named by what DESIGN §4 says they are for, not by t-shirt size:

| Was | Now | For |
|---|---|---|
| `--sero-shadow-xs` | `--shadow-subtle` | hairline lift |
| `--sero-shadow-md`, `--shadow-card`, `--shadow-card-hover` | `--shadow-card` | resting cards |
| `--sero-shadow-lg` | `--shadow-pop` | dropdowns, toasts |
| `--sero-shadow-xl` | `--shadow-overlay` | modals, side panels |
| `--sero-radius-lg`, `--sero-radius-card` | `--radius-card` | 12px surfaces |
| `--sero-radius-md` (8px) | `--radius-offspec-8` | **debt, made visible** |
| `--sero-radius-xl` (16px) | `--radius-offspec-16` | **debt, made visible** |

The two `offspec` names are deliberate. DESIGN §5 sanctions three radii (4 / 12 / full) and these
seven call sites use neither. Renaming them to something ugly and greppable means the radius pass
can find every one in a second, and nobody reaches for them by accident in the meantime.

**Tokens 256 → 253**, and 30 call sites moved onto the surviving names.

## What is NOT done, and why — five other chats hold the files

This is the honest part. The remaining duplicates all have call sites inside files another live
session has claimed on the lane board, and the house rule is to surface that rather than edit
through it.

| Left to collapse | Sites | Held by |
|---|---|---|
| `--sero-radius-full` → the pill radius | 87 (8 in blocked files) | `app-nav.css`, `admin-tables.css` |
| `--sero-radius-sm` → `--radius-button`/`--radius-input` | 34 (1 blocked) | `admin-tables.css` |
| `--sero-shadow-focus` → `--shadow-focus` | 16 (2 blocked) | `session-topbar.css` |
| `--color-page` → `--color-bg` | 11 (1 blocked) | `coach-panel.css` |
| `--sero-shadow-sm` → a role name | 2 (1 blocked) | `app-nav.css` |
| `--sero-radius-card/-button/-input` | 9 (all blocked) | `welcome-redesign.js` |

The last row forced a compromise. Those three tokens were deleted, then **restored as a clearly
marked temporary bridge** in `tokens.css`, because `welcome-redesign.js` calls them nine times and
leaving them undefined would have silently squared off the corners on another session's screen:

```css
/* TEMPORARY bridge: welcome-redesign.js still calls these 9 times and is held by
   another session's lane (97834757). Delete these three lines and repoint that file
   the moment the lane clears. */
```

**This is a decision for Carl,** because it is the difference between "one namespace" and "one and
a bit": finish it when the lanes clear (a P3b, roughly 150 more call sites, same proof method), or
ask those chats to release the six files now.

## Proof

A text diff is useless for a rename, so the check resolves every `var()` chain down to a literal
value and compares the **resolved** rules. Value-neutral renames come out identical; anything that
actually changes what the browser paints does not.

```
########## admin ##########
unresolved names, both sides (Tailwind runtime / component-scoped, not a bug): 30
no token that resolved before is undefined now
RESOLVED rules outside :root: 1391 -> 1391
  identical (after resolving every var())
token count: 256 -> 253
VERDICT: CLEAN — every rule resolves to the same value

########## frontend ##########
unresolved names, both sides: 32
no token that resolved before is undefined now
RESOLVED rules outside :root: 1393 -> 1393
  identical (after resolving every var())
token count: 256 -> 253
VERDICT: CLEAN — every rule resolves to the same value
```

```
npm run typecheck   clean
npm test            196/196 passed
npm run lint:tokens PASS — 68 / 53 / 135, ceilings unmoved
```

Same caveat as P2, and it happened again: one run reported 195/196, green on the run either side.
Five other sessions are writing files in this folder while the suite reads them. Reporting it
rather than hiding it, but it is not this change.

## Mistake to record: P3's commit swept another session's work

`git show --stat a62bf150` shows every file as a clean 1:1 line swap except one:

```
admin/src/styles/design/start-stage.css | 74 +++++++++++++++++------
14 files changed, 106 insertions(+), 66 deletions(-)
```

My change to that file was **one line**. The other 57 insertions / 17 deletions were another
session's uncommitted start-screen redesign (`.start-vs`, `.start-step`, `.start-pain`), sitting in
the working tree when I committed. The pathspec was correct per the safe-commit rule, but a
pathspec only limits *which files*, not *which changes inside them*, and I did not check
`git diff` on a file I only meant to touch once.

Not rewriting history: the work is on `main`, which is where that session was heading anyway, and
they may already have built on the commit. But it is now filed under the wrong phase, and if they
want to amend or revert it, it is tangled with mine.

**The rule this earns:** before committing a shared file, diff it and confirm every hunk is yours.
Checked for every other file in both P3 and P4 — all clean.

## QA (no browser needed)

```bash
npm test && npm run lint:tokens
```

**✅ Pass:** `196/196 passed`, guard PASS at 68 / 53 / 135.
**❌ Fail:** any test failure, or a ceiling breach.

# Phase 1 — prototype both versions in the Test area

## ✅ GREEN-LIT 2026-07-25

Carl walked both versions in the Test area and picked **Version A (matching set)**: keep the three
screens and the three routes, dressed to match. Version B is not being built; it stays documented
here in case the bouncing between three screens becomes a problem later.

## What was built

One throwaway prototype in the existing Test area. Mock only: hardcoded state, zero API calls,
nothing saved, no routing. The live login, register and front door are untouched.

- **New:** `admin/src/stages/tests/entry-redesign.js` — `mount(root)`, scoped `.er-*` CSS injected
  as a `<style>` string (same pattern as `tests/promises-before-recap.js`).
- **Edited:** `admin/src/stages/test.js` — one import, one `TESTS` entry (`bare`, `wide`), one
  schematic SVG thumb.
- **Reused, not rebuilt:** the real `.btn` / `.btn--ghost` recipes, `.intake-or`, `.field__label`,
  the `.l-stack` primitives, `LOGIN_PHOTOS[0]` and `google-g.svg` from the live screens, and
  Lucide via `admin/src/ui/icon.js`.

Three switches at the top: **Version** (A / B), **Screen** (version A only: Log in / Create
account / Front door) and **Width** (Desktop / Phone).

### What each version changes

| Change | A | B |
|---|---|---|
| Compact boxed fields instead of the session input | yes | yes |
| Form on a white card | yes | yes |
| One `or` divider, not two | yes | yes |
| Show/hide password sits inside the field's right edge | yes | yes |
| Field-level errors plus one form alert with a next step | yes | yes |
| Display family on the heading (Bricolage, not Inter) | yes | yes |
| A real link style (fixes the undefined `.link`) | yes | yes |
| Three screens kept, links between them | yes | collapsed to one |
| Log in / Create account as two tabs | no | yes |
| Free no-account path always visible | footer link | persistent ghost under the card |

## Checks run (all free)

| Check | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm test` | 186/186 pass |
| `npm run lint:copy` (no em dashes) | pass, 248 files |
| `npm run lint:tokens` (no hardcoded hex) | pass, 187 files |
| Rendered on screen | 9 screenshots via headless Chrome: A login/register/front door, A empty-field errors, A wrong-password alert, A phone, B log in, B create account, B phone. No console errors. |

The Browser pane would not composite in this session, so the screenshots were taken through
headless Chrome over CDP against the same dev server (`localhost:3213`).

## DESIGN.md §6 checklist

1 tokens only (lint passes) · 2 nothing under 14px, coral-800 as error text · 3 exactly one blue
action per screen (Google and the free path are ghosts) · 4 controls 4px, cards 12px · 5 empty,
pending and error states all built and walkable · 6 layout from `.l-stack` · 7 no destructive
actions here · 8 phone width has no sideways scroll · 9 no dates on these screens · 10 plain words,
focus rings kept, no nested cards · 11 Lucide only (the G mark is the existing sanctioned asset;
the card thumbnail is a schematic, matching the other test cards) · 12 "1:1" throughout · 13 no
em dashes.

## QA walk

`local > admin (dev login: Admin) > /admin/test > "The way in. Two versions"`

1. Version A: walk Log in → Create account → Front door with the switch and the in-mock links.
2. Press "Log in" with both fields empty. Each field should say what it needs, in plain words.
3. Fill both fields and press "Log in". Pending label, then one alert with a next step.
4. Set Width to Phone. Photo drops away, card fills the width, nothing scrolls sideways.
5. Version B: switch the two tabs. The free-entry block stays put under the card.

**Green light means:** Carl picks A or B (or asks for changes), and Phase 2 can start once the
google-signin lane releases the login files.

# Phase 2 — Frontend hide / restore UI

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
On the "Words of each role" page, let the manager hide an AI word with one click and restore it from a "Hidden words" area — using the endpoints built in Phase 1.

## Interaction (Carl's spec)
Hovering an AI word row reveals a **delete (trash) control** on that row. Click it → the word disappears from the page immediately and is dropped from the engine (Phase 1). It reads as a delete, but it's undoable: deleted words collect in a "Hidden words" area with a "put back" control (we never wipe the AI's original file).

## Changes
[admin/src/stages/job-lexicons.js](../../../admin/src/stages/job-lexicons.js):
- `rowHtml`: for AI rows (`source === "ai"`), add a **trash/delete control** (`js-hide-word`, `data-key` + `data-term`, aria-label "Delete <term>") that is visually hidden until the row is hovered/focused (revealed via CSS). Leave "yours" rows exactly as they are (they keep their own remove ✕).
- `sectionHtml`: render only **non-hidden** AI + your words in the main groups (skip `t.hidden`). Below the add box, if any AI words are hidden, render a collapsible **"Hidden words (N)"** block listing each with a "put back" control (`js-restore-word`).
- Delegated click handlers on the detail host:
  - `js-hide-word` → `hideRoleLexiconTerm(key, term)` → mark that AI term `hidden: true` in the local `role.terms` → `refreshSection(key)`.
  - `js-restore-word` → `unhideRoleLexiconTerm(key, term)` → clear the flag → `refreshSection(key)`.
- Import the two new helpers from `shared/api.js`.

[admin/src/styles/design.css](../../../admin/src/styles/design.css) (job-lexicons section):
- `.flow-glossary__row` gets a hover/focus-within rule that reveals the delete control (hidden by default via `opacity:0` / `visibility`), so the list stays clean until you hover. Keep the control keyboard-reachable (visible on focus too, not hover-only).
- Style the "Hidden words" block (muted heading, dimmed rows) and the delete/put-back controls. Reuse existing tokens; keep text ≥14px; the trash control needs an adequate hit target.

## Not in this phase
- Editing wording, bulk hide, hidden-count badge in the left list (Parked).

## Done when
- [ ] Hiding a word removes it from the list and it appears under "Hidden words"; restoring brings it back to its group.
- [ ] Refresh keeps hidden words hidden (persisted via Phase 1).
- [ ] `npm run typecheck:admin` stays green.
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these on `localhost:3000/job-lexicons`. Next step waits for your green light.
1. **Hover reveals delete** — pick a role, hover a word row. A trash/delete control should appear on that row and be hidden again when you move away. ❌ Not OK if it's always showing, or never shows.
2. **Delete a word** — click the delete control. It should vanish from the list right away and show up under "Hidden words (1)". ❌ Not OK if it stays, or the whole list flickers/breaks.
3. **Put it back** — open "Hidden words", click "put back". The word returns to its proper group and the Hidden area shrinks/disappears.
4. **It sticks** — delete a word, refresh the page, reopen that role. The word is still gone. ❌ Not OK if it comes back on refresh.
5. **Your words still work** — add one of your own words, remove it, delete an AI word — all three behave independently and nothing else disappears.
6. **Looks right + reachable** — the delete control is readable (not tiny) and also reachable by keyboard (Tab), and the Hidden area clearly reads as "put back if you want".

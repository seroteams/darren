# Copy rules — how Sero writes

House rules for every word a user reads: screens, buttons, labels, and the text the
engine generates. Carl's calls, kept in one place so a prompt, a component, and a
guard can all point at the same line.

## Capitalisation (Carl, 2026-07-29)

Sero writes in **sentence case**. One rule, everywhere.

| Thing | Rule | Yes | No |
|---|---|---|---|
| Sentences and paragraphs | Capital first letter, full stop at the end | "She has not named a date yet." | "she has not named a date yet" |
| List items on a card | Same as sentences: they are sentences, not note fragments | "Whether he names two concrete outcomes." | "whether he names two concrete outcomes" |
| Labels and headings | Sentence case in the source, first word only | "Listen for", "Aim to leave with" | "Listen For", "LISTEN FOR" |
| Buttons | Sentence case | "Start 1:1 questions" | "Start 1:1 Questions" |
| Job titles, seniority, meeting types, focus areas | Lowercase mid-sentence | "as she moves toward lead-level work" | "as she moves toward Lead-Level work" |
| People, products, companies | Capitals, exactly as given | "Machar", "Figma" | "machar", "FIGMA" |
| Emphasis | Never ALL CAPS. Emphasis comes from the words | "This is the one thing to settle." | "This is the ONE thing to settle." |

Fixed forms that never change: `1:1`, and `Low` / `Medium` / `High` where a
confidence level opens a sentence.

**Visual caps are a style, not a spelling.** Some labels render in capitals through
CSS (`.eyebrow` uses `text-transform: uppercase`). That is a design treatment applied
at render. The source string stays sentence case, so the same words read correctly in
the copied brief, in a screen reader, and anywhere the style does not apply.

## The other two standing rules

- **No em dashes, ever** (Carl, 2026-07-21). Also no spaced en dash used as one.
  Use a full stop, a colon, or reword. Guard: `npm run lint:copy`.
- **Plain language.** Short sentences, no jargon, nothing a manager would not say
  aloud in the meeting.

## Where each rule is enforced

| Surface | Enforced by |
|---|---|
| Preparation brief (engine output) | `<capitalisation_rules>` in [content/prompts/preparation.md](../../content/prompts/preparation.md) plus check C6 in `validateBrief` ([backend/engine/preparation.ts](../../backend/engine/preparation.ts)) — a violation triggers the corrective retry |
| Em dashes in app copy | [scripts/lint-copy.js](../../scripts/lint-copy.js) |
| Everything else (questions, wrap-up, evaluation, UI strings) | Convention only, not yet guarded |

# Copy glossary — the customer vocabulary

**Part of:** [phase-5.md](phase-5.md) · the single reference for what the product calls each thing on customer-facing screens.

One word per concept, everywhere the customer can see it. UK English, plain language, no exclamation marks, no hype.

## The four words

| Concept | The word we use | Never say (customer-facing) |
|---|---|---|
| The meeting | **1:1** | one-to-one, session, run, meeting, catch-up |
| What Sero writes *before* the 1:1 | **prep brief** | pre-meeting brief, prep, report, summary |
| What Sero writes *after* the interview | **briefing** | evaluation, report, run result |
| What the manager types in | **notes** | context, manager context, context notes |

Notes on the two outputs: a manager reaches the **prep brief** first (before the 1:1), then — after answering Sero's interview questions — gets the **briefing**. They are two different artefacts; keep the two words distinct so "briefing" always means the post-1:1 one.

## Supporting phrasing

- The setup flow asks for **notes** with one question: keep the intake prompt and the first-run wording both on "notes".
- Buttons that start a fresh 1:1 say **New 1:1** (matches the member nav), not "New session".
- "Cancel setup" / "Reset" controls may keep their plain verbs, but never introduce "session" as the *name of the meeting*.
- Interview turns are **"Question N of M"** — the step is the interview; the meeting is still the 1:1.

## House style (applies to every string above)

- **UK English** — analyse, emphasise, personalise, organise, colour, behaviour.
- **No exclamation marks** anywhere a customer or guest can read.
- **Plain, calm voice** — the Welcome screen sets the tone; every other front-door / status line matches it. No "your 1:1s are broken", no "where teams thrive".

## Scope guard

Internal / admin-only surfaces (persona bench, superadmin, test-lane verdict block, scripted-replay controls) are out of scope and keep their engine vocabulary ("run", "evaluation", "session") — those strings are gated behind `store.scripted` / `isInternalAdmin` / `import.meta.env.DEV` and never reach a manager or guest.

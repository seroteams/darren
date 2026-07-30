# Phase 4 — Reading surfaces

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Kill 15px and 17px from the product, put every reading block at 16px, and give prose a real line length. This is the phase Carl will actually see the quality change in.

## Changes
- **`admin/src/styles/design/briefing.css`**, **`stage-extras.css`**, **`about-stage.css`**, **`promise-agree.css`**, **`design/run-detail.css`**, **`meeting-arcs.css`**, **`member-home.css`** — prose selectors take `body` + the 66ch measure; ledes take `body-lg` + 72ch.
- **`frontend/src/stages/guided/guided.css`** — its 28 prose selectors. This sheet holds 16 of the ~40 hand decisions.
- **`frontend/src/stages/preparation.css`** and **`preparation-lab.css`** — the nine confidence-readout selectors currently render the same thing at 18 / 16 / 14px across eight layout variants. All become `label`.
- **The ~40 hand decisions** from the migrate script's review table. Each gets a prose / chrome / glyph / numeric column in the review table before anything is written. **Never sed this set:** in `guided.css`, `.gd-row__chev` is a glyph and `.gd-row__pct` and `.gd-q__n` are numbers — those go *down* to 14 — while `.gd-q__coach`, `.gd-sum li`, `.gd-rec__block li` and `.gd-sugg__row` are prose and go *up* to 16.
- The question stem's other four homes (`guided.css`, `buttons-inputs.css`, `meeting-arcs.css`, `finish-feedback-modal.css`, `run-detail.css`) currently render the same object at 28 → 16 → 15 → 14px depending on surface. They take `heading-xl` or `heading-xs` by context, and stop being four different things.

**Lane collision:** `frontend/src/stages/preparation.css` is claimed by session `080b9104`. Surface it to Carl before starting; do not edit through it.

## Not in this phase
- Headings, metrics and KPI values — Phase 5.
- The markup class sweep — Phase 5.

## Done when
- [ ] `grep -rn "15px\|17px\|--type-body-md\|--type-body-lg" admin/src frontend/src` returns nothing outside the parked gallery files
- [ ] Every reading block computes to 16px with a max width between 60 and 66 characters, measured in the Browser pane console
- [ ] The review table for the ~40 hand decisions is in this file, with each call recorded
- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy` clean
- [ ] Screenshots of each screen below saved to `proof/`
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
This is the one where you should **see it get better**.

**Setup:** `local > Start Sero.bat > localhost:3000 > Dev login: Manager`

1. **A prep briefing** — open a briefing with real text in it. The paragraphs should now break at a comfortable width instead of running the full page. ❌ Not OK if lines are still very long, or so short the text looks like a newspaper column.
2. **All the reading text matches** — in that same briefing, every paragraph, bullet and note should be the same size as every other. ❌ Not OK if you can spot one block that is slightly bigger or smaller than the one above it.
3. **A recap** — open a finished run's recap. Same check: one reading size, comfortable line length. ❌ Not OK if the recap reads differently from the briefing.
4. **Customer app, guided run** — `localhost:3002`, Dev login: Member. Open a guided meeting and scroll to the summary and recommendations. Reading text should be comfortable; the little chevrons, percentages and question numbers should stay small. ❌ Not OK if a percentage or arrow has ballooned to the size of body text.
5. **Confidence readouts** — on the preparation screen, the confidence line should look the same everywhere it appears. ❌ Not OK if two of them are different sizes.
6. **The gut check** — put this next to a screenshot from before the phase. Does it read better? That's the whole point of this one.

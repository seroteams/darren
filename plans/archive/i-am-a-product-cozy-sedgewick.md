# UI consistency audit — Sero 1:1 prep

**Version:** 0.3 (implemented)
**Caveman:** full
**Changelog:**
- 0.1 — initial draft after 3 Explore passes (stages 0-3, 4-8, shared/tokens)
- 0.2 — locked scope (medium pass), eyebrow drop, intake all-Continue, focus-points unselected-default (+8 -2 lines)
- 0.3 — medium pass shipped across all 9 stages (+1 line, see implementation note below)

## Implementation note (v0.3)

Edits applied:
- `start.js` — dropped `Sero · 1:1 prep` eyebrow + dev reminder; h1 stays.
- `intake.js` — eyebrow now `Let's set the scene` (replaces brand eyebrow); `Step N of 5` → `N of 5`; question divs promoted from `.h2` → `<h1 class="h1">`; last CTA `Prepare focus points` → `Continue`; `Skip notes` → `Skip`; footer hint trimmed to `Enter to continue`; `Start Fresh` → `Start over`.
- `focus-points.js` — added `eyebrow + h1` ("Focus points" / "What we'll cover") visible during thinking + result; selection flipped to start unselected; hint → `Pick the ones you want to cover.`; meeting_type moved inline with name·role·seniority (dropped h3); CTA `Prepare for this 1:1` → `Prepare briefing`; in-page `Start over` removed (topbar covers it); `Start Fresh` → `Start over`; orb label ellipsed.
- `bank.js` — h3 → `<h1 class="h1">` `Your question bank is ready.`; orb label `Generating question bank` → `Building your question bank…`.
- `questioning.js` — outer `Questioning` eyebrow dropped; turn label now functions as eyebrow; per-question inner eyebrow dropped; question div `.h2` → `<h1 class="h1">`; textarea placeholder → `What did they say?`; key-hint footer added inside card; `Save & Exit` → `Save and exit`; `Start Fresh` → `Start over`; `Record & continue` → `Record and continue`; orb labels rewritten in user voice.
- `preparation.js` — section eyebrows shortened: `Probable theme` / `Opener` / `Listen for` / `Avoid` / `Good outcome` / `Suggested action`; `Start Fresh` → `Start over`; orb ellipsed.
- `briefing.js` — `What to watch for` → `Reminders` (per memory).
- `eval.js` — eyebrow `Synthesising` dropped (helper carries it); orb label → `Pulling it together…`.
- `error.js` — eyebrow `Something went wrong` dropped; `We hit a snag.` promoted to h1; redundant duplicate heading removed.

Skipped (deferred to token sweep):
- dev-badge/notes-panel hardcoded sizes & colors
- `design.css:981, 1251` hardcoded `ease`
- watch-for items into copy-pasteable reminders (eyebrow renamed only)

Visual verification needed: run `npm run dev` in `frontend/client` and walk 9-stage flow. The `.h1` class is large (clamp 2.75–3.5rem); questioning question inside card may need a tone-down to `.h2` if it dominates.

---

## Context

User is product designer. Wants per-stage UI audit: consistency, redundancy, heading hierarchy, terminology. App is 9-stage flow (start → intake → focus-points → bank → questioning → preparation → briefing → eval → error). Tokens already well-defined in `design.css`; problem is **inconsistent application** across stages, not missing primitives.

Goal of this plan: hand designer a stage-by-stage punch list + a small cross-cutting consistency layer to react to. Plans are suggestions — pick what lands, push back on what doesn't.

---

## Cross-stage findings (apply everywhere)

### 1. Heading hierarchy is incoherent
| Stage | Eyebrow | h1 | h2 | h3 |
|---|---|---|---|---|
| start | "Sero · 1:1 prep" | "Start a run" | — | — |
| intake | "Sero · 1:1 prep" + "Let's set the scene." + "Step N of 5" | — | question text | — |
| focus-points | — | — | — | meeting type |
| bank | "Question bank" | — | — | "Question bank is ready." |
| questioning | "Questioning" + "Question X of Y" | — | question text | — |
| preparation | "Preparation" + "Your briefing for X" | — | — | — |
| briefing | "Briefing · For X" | headline | — | — |
| eval | "Synthesising" | — | — | — |
| error | "Something went wrong" | — | — | — |

Only **start** and **briefing** have an h1. Three stages have neither h1 nor h2. Intake stacks 4 heading levels (eyebrow + subtitle + step + h2 question) before the field.

**Suggestion (option A — flatten):** Drop the global "Sero · 1:1 prep" eyebrow on start/intake — the topbar already identifies the app. Promote the per-stage question/headline to h1. Use eyebrow only when there's no obvious h1.

**Suggestion (option B — codify):** Pick one pattern and enforce it everywhere: `eyebrow (stage name) → h1 (page question / state) → optional subtitle`. Audit each stage against it.

**Open Q:** Is "Sero · 1:1 prep" load-bearing? Topbar already shows stages; eyebrow may be ceremonial.

### 2. Step counter only appears on intake (and questioning, differently)
- intake: "Step N of 5" (substages within intake)
- questioning: "Question X of Y" (questions within questioning)
- No global "Stage 3 of 8" anywhere — topbar carries that, but only visually.

**Suggestion:** Keep substage counters local. Don't add a global step counter — topbar is the answer. But rename intake's "Step N of 5" to "N of 5" (no "Step") so it reads as substage progress, not flow progress.

### 3. Button verb inconsistency
Across the flow: `Continue` / `Prepare focus points` / `Prepare for this 1:1` / `Start the 1:1` / `Build question bank` / `Record & continue` / `Skip` / `Skip notes` / `Start a new prep` / `Start over` / `Start Fresh` / `Try again` / `Save & Exit`.

**Issues:**
- "Start over" vs "Start Fresh" — same action, two labels. Pick one. (Recommend **Start over**.)
- Mixed casing: "Save & Exit" title-cased; everything else sentence-case. (Recommend **Save and exit**.)
- Some CTAs are neutral ("Continue"), others narrate the next stage ("Prepare focus points"). Pick a voice.

**Suggestion:** Two patterns only:
- **Neutral progression** ("Continue") — when the next stage is obvious from context.
- **Named next step** ("Build question bank") — when there's a meaningful state change worth labeling.
Pick per stage; don't mix in same flow position.

### 4. Keyboard hint footer copy drifts
- intake: "Enter or Continue to move forward"
- bank: "Enter or Space" (different keys, different phrasing)
- questioning: textarea placeholder mentions "Press Enter or click Record & continue"
- notes panel: "Enter to save · Shift+Enter for new line"
- notes edit: "Enter saves · Shift+Enter for new line · Esc cancels"

**Suggestion:** One pattern: `Enter to <verb> · <other key> to <verb>`. Drop "to move forward" filler. Mirror notes-panel's tight middle-dot style everywhere.

### 5. Orb / thinking labels inconsistent register
- "Choosing focus points" (friendly)
- "Generating question bank" (technical)
- "Recording skip & re-planning queue" (engineer jargon)
- "Scoring answer & re-planning queue" (engineer jargon)
- "Preparing your briefing" (friendly)
- "Final evaluation" (terse, abstract)

**Suggestion:** All present-participle, all user-facing language, no internal terms ("queue", "re-planning", "scoring"). E.g. "Listening… choosing the next question."

### 6. Error voice splits in two
- error.js: "Something went wrong" + "We hit a snag." (friendly, two phrases doing same job)
- preparation.js: "Preparation briefing failed." (cold)
- eval.js: "Lost connection during the final evaluation." (cold)
- questioning.js: "Lost connection while scoring the answer." (cold)

**Suggestion:** Pick one voice. Recommend warm-but-specific: "Sero lost the connection during X. Try again?" Drop double-heading "Something went wrong / We hit a snag" — one is enough.

### 7. Hardcoded sizes/colors bypass the token system
`design.css` defines a full token system. Offenders:
- `dev-badge.js`: all inline styles, 10px font, hex colors
- `notes-panel.js`: textarea 15px, items 14-15px, `#ac1608`, `#c0392b`
- `design.css:981, 1251`: `ease` instead of Sero easing vars

**Suggestion:** Surgical pass — replace magic numbers with `var(--type-small)` / `var(--sero-error)` / `var(--ease-out-expo)`. Not glamorous, but it's why future redesigns ripple cleanly.

---

## Per-stage notes

### start
- h1 "Start a run" is fine; only stage that gets it right.
- Eyebrow "Sero · 1:1 prep" duplicates topbar identity — drop.
- "Reminder: Carl run /reviewrun…" is dev/internal copy in production view. Move to dev-badge or remove.
- "or press Enter" hint near Start button is helpful; mirror this hint style on every primary CTA.

### intake
- 4 heading layers before the field is heavy. Cuts:
  - Drop eyebrow "Sero · 1:1 prep" (topbar covers it).
  - Keep subtitle "Let's set the scene." OR keep "Step N of 5" — not both. (Recommend keep step counter, drop subtitle on substages 2-5; show subtitle only on substage 1.)
- Question text styled as `.h2` but no actual h1 — promote to h1.
- Hints inconsistent capitalisation: "Their first name is enough." vs "Pick the shape that fits today…" — both sentence-case is fine, but audit for parallel structure.
- Primary CTA flips: "Continue" → "Continue" → "Continue" → "Prepare focus points". Last one breaks rhythm. Either all "Continue" (and let the next page introduce itself) or all named ("Save name", "Save role", …) — recommend **all "Continue"**.

### focus-points
- **No header at all during thinking phase**, then a meeting-type h3 pops in. Disorienting.
- Suggest: keep an eyebrow + h1 ("Focus points" + "What we'll cover") visible throughout, swap body content.
- "Uncheck any you'd rather skip." — fine, but per memory: focus points should **start unselected**, user picks in. So copy should be "Pick the ones you want to cover." [[feedback_focus_points_selection]]
- Three CTAs (Prepare for this 1:1 / Regenerate / Start over) — busy. Demote Regenerate to icon or link; Start over to topbar-only.

### bank
- Eyebrow "Question bank" + h3 "Question bank is ready." — same words twice.
- Suggest: eyebrow drops or becomes stage name only; h3 promoted to h1 "Your question bank is ready."
- Single CTA, clean. Good.

### questioning
- Eyebrow "Questioning" + per-question eyebrow "Question" + h2 question text + "Question X of Y" turn label — 4 layers labelling the same concept. Memory warns about this exact pattern. [[feedback_preparation_coreissue_length]]
- Suggest: drop outer "Questioning" eyebrow (topbar carries it). Keep "Question X of Y" as eyebrow. h1 = the question.
- "Save & Exit" / "Start Fresh" in header — rename to "Save and exit" / "Start over" for parity.
- Textarea placeholder "Type what they said. Press Enter or click Record & continue." is doing too much. Trim: "What did they say?"; move key hint to footer.
- Avoid axes panel under the question if it competes for attention — confirm placement is intentional.

### preparation
- Eyebrow "Preparation" + subtitle "Your briefing for [name]" — clean, mirror this everywhere.
- 6 section eyebrows: "What this 1:1 is probably about" / "Start with this question" / "Listen for" / "Avoid" / "Good outcome" / "Suggested action to agree".
  - Length wildly varies (3 → 7 words). Aim for 2-3 words each: "Probable theme" / "Opener" / "Listen for" / "Avoid" / "Good outcome" / "Suggested action".
  - "What this 1:1 is probably about" already flagged in memory as too long. [[feedback_preparation_coreissue_length]]
- CTA "Build question bank" is good (named next step).

### briefing
- Eyebrow "Briefing · For [name]" + h1 (data-driven headline) — works because h1 is editorial, eyebrow is structural. Keep.
- Section eyebrows mix register: "What stood out" / "What we understood" / "Where things sit" / "What to do next" / "What to watch for". Memory says drop "What to watch for" into actionable copy. [[feedback_briefing_actions_over_watchfor]]
- "About them" / "About you" brutal-truth cards — good labels, keep.
- CTAs: "Start a new prep" + "Copy review prompt" — fine. But the second is conditional; surface it consistently or hide it cleanly.

### eval
- Pure loading screen. Eyebrow "Synthesising" + helper "Sero is turning the conversation into a briefing. This takes a few seconds."
- Mild redundancy: synthesising = turning conversation into briefing. Pick one. Recommend drop eyebrow, keep helper. Or eyebrow "Synthesising" + helper "A few seconds…"
- Orb label "Final evaluation" doesn't match user-facing register. Rename "Pulling it together".

### error
- Eyebrow "Something went wrong" + h-ish "We hit a snag." — same job twice. Pick one.
- Recommend: just h1 "We hit a snag." + body (specific error).
- "Try again" + "Start over" CTAs — good.

---

## Locked scope: medium pass

Confirmed decisions:
1. **Medium pass** — wording + heading hierarchy across all 9 stages. Token sweep deferred to follow-up.
2. **Drop "Sero · 1:1 prep" eyebrow** on start + intake. Topbar carries identity.
3. **Intake: all "Continue"** across 5 substages. No more "Prepare focus points" break.
4. **Focus-points: start unselected.** Copy: "Pick the ones you want to cover."

Token-compliance sweep (dev-badge, notes-panel magic sizes/colors, design.css `ease` literals) tracked separately for a future pass.

---

## Critical files

- `frontend/client/src/stages/{start,intake,focus-points,bank,questioning,preparation,briefing,eval,error}.js`
- `frontend/client/src/ui/{session-topbar,notes-panel,shortcuts,confirm,axes,orb,dev-badge,field,reveal}.js`
- `frontend/client/src/styles/design.css`

## Reuse already present (don't reinvent)

- `.eyebrow`, `.h1`, `.h2`, `.h3`, `.caption` classes in `design.css:351-379`
- `revealSequence()` / `splitLetters()` in `ui/reveal.js`
- `field()` swap in `ui/field.js`
- Token system in `design.css:8-241`
- Tailwind extensions already mapped to tokens in `tailwind.config.js:30-106`

## Verification

- Visually diff every stage before/after (run `npm run dev` in `frontend/client`, walk the 9-stage flow with a scenario).
- Heading audit script: grep for `class="h1"`, `class="h2"`, `class="h3"`, `class="eyebrow"` and confirm each stage has exactly one h1.
- Copy audit: grep button strings against the canonical list.
- Token audit: grep for hex colors (`#[0-9a-fA-F]{6}`) and `px` font sizes in `src/ui/` and `src/stages/`.

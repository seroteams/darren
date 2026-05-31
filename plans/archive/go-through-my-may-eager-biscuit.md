# May logs — fix plan (v2)

**Caveman version summary:** v2. Adds tightening pass on fix #6 after user showed live output still reads corporate.

**Changelog:**
- v1: initial draft — 9 fixes scoped from 8 notes files across May 16–23.
- v2 (+38/-0): adds **fix #10** — harden focus-point reason prompt after user reviewed live output and found 2 of 3 reasons still corporate ("Standard bi-weekly anchor", "Bi-weekly hygiene at this seniority, the cleanest channel for her to redirect the relationship"). Existing v1 banned-list insufficient; needs wider phrase ban + shape rule + voice check. Root cause likely also stale dev server — flagged.

---

## Context

User reviewed May 1:1 runs (Taya, Michael, Sarah, yeah, Aom, Usman, Urman). 47 inline notes across focus-points, preparation, questioning, briefing stages. Many concerns already canon in memory; several are new + a few canon items still un-implemented in code. Goal: translate notes into surgical code fixes. No new features, no speculative refactors.

Notes already mapped to existing canon memory (no plan needed — reference only):
- `feedback_focus_points_selection` · `feedback_preparation_coreissue_length` · `feedback_question_repetition` · `feedback_questioning_flow_breaks` · `feedback_winddown_overshoot` · `feedback_notes_link_to_question_content` · `feedback_briefing_typography_and_layout` · `feedback_briefing_actions_over_watchfor` · `feedback_axis_starting_values` · `feedback_plans_are_suggestions` · `feedback_ui_consistency_canon`

---

## Fixes

### NEW (no memory yet)

#### 1. Strip em-dashes from AI output before render
**Why:** Taya May 16 — "I see long dashes in everything, we need to completely remove that. filter it before anyone sees it."
**Where:** Centralize in render-time sanitizer. Cleanest insertion: extend the `escape()` helper used by stages.
**Files:**
- [frontend/client/src/stages/briefing.js:228](frontend/client/src/stages/briefing.js#L228) — `escape()`
- [frontend/client/src/stages/focus-points.js:152](frontend/client/src/stages/focus-points.js#L152) — `escape()`
- [frontend/client/src/stages/preparation.js](frontend/client/src/stages/preparation.js) — its `escape()`
**Change:** After existing HTML-escape replacements, add `.replace(/\s*—\s*/g, ", ")` (em-dash → comma) and `.replace(/\s*–\s*/g, ", ")` (en-dash → comma).
**Verify:** Run a fresh 1:1; inspect briefing + prep + opener text — no `—`/`–` visible.

#### 2. Briefing CTA label + lexicon flow handoff
**Why:** Usman May 18 — "When we get to start to new prep it shoulld actually go 'complete 1:1' then the next page is all about the lexicanos that will be adede and i choose yes or no".
**Files:**
- [frontend/client/src/stages/briefing.js:57](frontend/client/src/stages/briefing.js#L57) — current `"Start a new prep"` → `"Complete 1:1"`.
- [frontend/client/src/state.js:3](frontend/client/src/state.js#L3) — add `LEXICON_REVIEW` stage to STAGES enum.
- New: `frontend/client/src/stages/lexicon-review.js` — yes/no per candidate lexicon entry mined from run.
- [frontend/client/src/stages/briefing.js:189](frontend/client/src/stages/briefing.js#L189) — `js-restart` handler: instead of jumping straight to `INTAKE`, route to `LEXICON_REVIEW` first; that stage's "Done" advances to INTAKE.
**Open question:** lexicon storage path / backend endpoint — does extraction already exist? If not, scope to UI shell + stub endpoint for v1; real lexicon mining is a follow-up.
**Verify:** Finish a 1:1 → click "Complete 1:1" → lexicon page shows candidates → yes/no → returns to start.

#### 3. Focus-point selection visual — hide ✓ when not selected
**Why:** Repeated note across May 16–18 ("they should be selected to choose, not deselected"). Code already starts items unselected ([focus-points.js:64](frontend/client/src/stages/focus-points.js#L64)) — but [design.css:1085-1090](frontend/client/src/styles/design.css#L1085) renders ✓ at opacity 0.4 always, creating "pre-checked" perception.
**Files:**
- [frontend/client/src/styles/design.css:1085-1094](frontend/client/src/styles/design.css#L1085-L1094)
**Change:** `.focus-point__check { opacity: 0; }` default; `.is-selected .focus-point__check { opacity: 1; }`. Replace dim-tick with "+" or nothing when unselected (your call — `+` reads as "add", supports the "select-in" mental model).
**Verify:** Load focus-points page — no ticks visible until items clicked.

#### 4. Reframe briefing "About you" — drop blame framing
**Why:** Sarah May 17 — "the about you was strange as its as if its the managers fault for the AI's wrong question".
**Files:**
- [prompts/final-evaluation.md:108-111](prompts/final-evaluation.md#L108-L111) — `brutal_truth_manager` instruction currently "must name a specific turn where manager should have pushed deeper".
**Change:** Rewrite rule to forward-coaching frame: "Name one observable pattern in *how* the manager ran this conversation that, if shifted next time, would unlock more. Not 'what you got wrong' — what to deepen. Never reference a specific turn unless the manager visibly redirected away from the report's signal."
**Verify:** Re-run brutal_truth_manager on a recent session log; reads as coaching, not autopsy.

#### 5. Tighten `goodOutcome` scope — single-meeting agreements
**Why:** Sarah May 17 growth/career — "the scope of 'You and Sarah will have a clear understanding of the skills and experiences she needs to develop for the Head of UX role' is too much for one meeting".
**Files:**
- [prompts/preparation.md:34](prompts/preparation.md#L34)
**Change:** Replace current rule with: "`goodOutcome`: one sentence. The single observable agreement or decision reachable in this 30–60 min meeting. Not a multi-meeting arc, not 'a clear understanding of X' (that's a quarter). Format: 'You and {{NAME}} have agreed [one concrete next step or shared frame].'"
**Verify:** Re-run prep on Sarah/growth fixture; outcome describes a single agreement, not a development plan.

#### 6. De-corporate focus-point reason copy
**Why:** Urman May 23 — "this language is not human again". Pattern: "Standard Performance & feedback anchor for a Lead — strategic impact is what gets evaluated at this level."
**Files:**
- [prompts/generate-focus-points.md:24](prompts/generate-focus-points.md#L24)
**Change:** Strip the "Standard … anchor for a {seniority}" example. Replace with a human-voice example: e.g., "How they're framing the top three things they're owning right now — Leads drift into operator mode if no one asks." Add rule: "No phrases like 'standard anchor', 'is what gets evaluated', 'crucial for', 'essential to'. Talk like a senior peer briefing you over coffee."
**Verify:** Run focus-points on a fresh fixture; descriptions read conversational, not consultancy-deck.

#### 7. Scope cheesy openers narrower; add meeting-type fit
**Why:** Michael May 16 — "What's been nourishing in your life recently?" cheesy. Sarah May 17 — energy-read not linked to meeting type.
**Files:**
- [questions/_openers.json:39-49](questions/_openers.json#L39-L49) (`q_open_giving_you_energy`)
- [questions/_openers.json:171-181](questions/_openers.json#L171-L181) (`q_open_nourishing`)
**Change:** `q_open_nourishing` → restrict `meeting_types` to `["something_feels_off"]` only (high-warmth context). `q_open_giving_you_energy` → keep `bi_weekly_check_in`, drop `growth_career_plan` (replace with a growth-fitted opener — e.g. add `q_open_what_matters_now` scoped to growth: "What feels worth pushing on right now?").
**Verify:** Trigger growth/career meeting; no "energy" or "nourishing" opener picked.

#### 8. Add early "anything on your mind?" semi-set question; raise total to 9
**Why:** Sarah May 17 — "i do think that we should be asking early as a semi set qwueion, do they have anyhting to cover so we go up to 9 questions".
**Files:**
- [frontend/server/sessions.js:6-8](frontend/server/sessions.js#L6-L8) — bump `INTRO_BUDGET = 4`.
- Intro queue builder (likely `frontend/server/handlers/start.js` — confirm during implementation) — append semi-set "anything on your mind" question as the 2nd or 3rd intro slot.
- Add corresponding entry to `questions/_openers.json` (or whichever bank intro pulls from) with `alias: q_open_agenda_check`, name e.g. "Before we get into it — anything you want to make sure we cover today?".
**Verify:** Start a session; 9 question slots; agenda-check appears in intro phase consistently.

### CANON-IN-MEMORY, STILL UN-IMPLEMENTED

#### 9. Seed axis starting values from memory canon
**Why:** `feedback_axis_starting_values` — wellbeing & engagement seed at −1, clarity & growth at 0. Currently hardcoded 0.
**Files:**
- [frontend/client/src/stages/briefing.js:99-100](frontend/client/src/stages/briefing.js#L99-L100) — `renderInitial(...)` seeds all 0.
- [src/axes.js](src/axes.js) — `initState()` — confirm and update server-side seed too.
**Change:** Wellbeing & engagement → −1; clarity & growth → 0.
**Verify:** Fresh session axes panel opens at -1/-1/0/0, not 0/0/0/0.

### v2 ADDITIONS

#### 10. Harden focus-point reason prompt (post-implementation re-test failed)
**Why:** Live screenshot after v1 implementation (Sarah, UX Lead, Bi-weekly) still produced corporate copy. Two of three reasons failed:
- #2: "Standard bi-weekly anchor, she needs space to surface what she is actually shipping…" — close paraphrase of v1 banned "standard anchor".
- #3: "Bi-weekly hygiene at this seniority, the cleanest channel for her to redirect the relationship if something is off." — none of these phrases were on the v1 ban list.

**Root cause check (do FIRST):** likely the running dev server never reloaded `prompts/generate-focus-points.md` after the v1 edit. Confirm before re-prompting:
- `Get-Process node` → check uptime against file mtime of [prompts/generate-focus-points.md](prompts/generate-focus-points.md).
- If process predates the edit: restart `npm run dev` and re-test the *same* fixture (Sarah / UX Lead / Bi-weekly). If output now clean → no prompt change needed, stop here.
- If process is newer than the edit and output is still corporate: continue to the prompt change below.

**Prompt change** ([prompts/generate-focus-points.md:24](prompts/generate-focus-points.md#L24)):
- **Wider banned-phrase list:** "standard anchor", "standard ... anchor", "hygiene", "cleanest channel", "the channel for", "at this seniority", "redirect the relationship", "is what gets evaluated", "crucial for", "essential to", "key to", "important for", "surface what", "space to surface".
- **Shape rule:** every `reason` MUST start with one of: `Whether …`, `How they're …`, `What …`, `If …`. No noun-phrase-as-sentence ("Standard X, …"). No abstract-concept opener.
- **Voice check (add as final step in the prompt):** "Before returning JSON: re-read each `reason`. If any line could appear unchanged in a consultancy slide, rewrite it. Read it aloud — if you sound like a deck, fix it."
- **Two new positive examples** to anchor voice — concrete people speaking, not categories:
  - Bi-weekly / Lead: "Whether they're actually shipping the things they said they would two weeks ago, or quietly carrying them forward again."
  - Bi-weekly / Lead: "What they want from you that they haven't asked for. Leads stop asking when they think you're already stretched."

**Verify:**
1. Restart dev server.
2. Re-run focus-points on Sarah / UX Lead / Bi-weekly with the same notes ("always late to work").
3. Each `best_practice` reason starts with one of the allowed openers; none contain any banned phrase; reading aloud, none sounds like a deck bullet.

---

## Out of scope / flagged for confirmation

- **"What we will cover" duplicate** (Usman May 18, FOCUS_POINTS stage) — only one source render found ([focus-points.js:14](frontend/client/src/stages/focus-points.js#L14)). Header h1 says "What we'll cover" and hint says "Pick the ones you want to cover" — possibly user's "twice" perception. Need user confirmation (screenshot/repro) before changing.
- **"What this 1:1 is probably about" length** — already canon (`feedback_preparation_coreissue_length`), prompt rule allows "2–3 sentences, <70 words". Canon says one tight sentence. Tightening this remains pending — promote to a v3 fix when wanted.
- Lexicon mining backend (fix #2) — UI shell only in this plan; real extraction is a separate engineering task.

---

## Verification

After implementation:
1. `npm run dev` (or project's run command) → walk a full flow: intake → focus-points → preparation → questioning → briefing → complete 1:1 → lexicon review.
2. Visual: no em-dashes anywhere; focus-points show no ticks until clicked; CTA reads "Complete 1:1"; axes seed at -1/-1/0/0.
3. Re-run a fixture through prep + briefing; confirm `goodOutcome` reads as single-meeting agreement and `brutal_truth_manager` reads as forward-coaching.
4. 9 question slots, agenda-check appears in intro.

## Critical files

- [prompts/preparation.md](prompts/preparation.md)
- [prompts/generate-focus-points.md](prompts/generate-focus-points.md)
- [prompts/final-evaluation.md](prompts/final-evaluation.md)
- [questions/_openers.json](questions/_openers.json)
- [frontend/server/sessions.js](frontend/server/sessions.js)
- [frontend/client/src/state.js](frontend/client/src/state.js)
- [frontend/client/src/stages/briefing.js](frontend/client/src/stages/briefing.js)
- [frontend/client/src/stages/focus-points.js](frontend/client/src/stages/focus-points.js)
- [frontend/client/src/stages/preparation.js](frontend/client/src/stages/preparation.js)
- [frontend/client/src/styles/design.css](frontend/client/src/styles/design.css)
- (new) frontend/client/src/stages/lexicon-review.js

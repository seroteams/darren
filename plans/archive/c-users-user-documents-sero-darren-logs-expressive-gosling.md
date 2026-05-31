# Plan — Run review: 2026_May18_19-47-3e7fe11b (Aom · Perf & feedback)

**Version:** 1
**Caveman summary:** Run review of Aom session. Extracts changes already pinned in memory + new design decisions surfaced this turn. Framed as suggestions + tradeoffs per [[feedback_plans_are_suggestions]].
**Changelog:** v1 — initial (this file). No prior version.

---

## Context

Run had 8 turns. Topic anchor (UX communication tension) never directly addressed — Aom redirected to workload overload and AI followed. Axes ended wellbeing -3, engagement -3, clarity -10, growth 0. Closer landed soft ("want more PO help" = request, not commitment). Notes capture 11 issues — most already in memory. This review extracts the new design decisions confirmed in Q&A this turn and proposes a small set of changes that target the gaps memory hadn't pinned.

---

## Suggestions (each = option + tradeoff + open question)

### S1. Share-view card after self_read drill
**Change:** After self_read stage produces 2–3 concrete turns, AI emits an inline "Manager's view" card BEFORE the first evidence question. Card content = manager's raw pre-run notes verbatim + bulleted list of selected focal points.
**Why:** Q4 promised "before I share my view" but Q5 just drilled. Note 869d71dd at 19:53:55: "you said you would share your view, then the next one you didn't and now i am confused". Honoring the promise restores flow integrity.
**Tradeoff:** Verbatim notes are blunt — employee may bristle. Alternatives (AI synthesis, gap call-out) soften but risk misrepresenting manager. Picked verbatim+focal-points for transparency.
**Open question:** Should employee see this card on their screen too, or is it manager-only?

### S2. Wind-down taper at 75% of budget
**Change:** With budget N, turn ⌈0.75·N⌉ flips planner into taper mode. Taper = synthesis turn → closer. For N=8: turn 6 = "here's what I'm hearing", turn 7 = synthesis probe, turn 8 = closer.
**Why:** Note 3c790cd9 at 20:02:07: "not about a review its just keep asking more quesitons. its suppoet to be winding down now". Linked to [[feedback_winddown_overshoot]].
**Tradeoff:** Hard ratio kills late-emerging threads. Could soften with "if any axis hit ±3 already, taper earlier".
**Open question:** Does the closer itself count as a turn or sit outside the budget?

### S3. Force-pivot to focal point by turn 3 if untouched
**Change:** Hard rule. If by turn 3 of N no question has overlapped a selected focal point, AI must pivot next turn to a focal-point question.
**Why:** Aom's UX (the anchor) wasn't asked about until turn 7 — and even then Aom pivoted right back to workload. Steering earlier preserves anchor while still giving emergent topics air.
**Tradeoff:** Could feel jarring mid-flow. Mitigation: pivot phrasing acknowledges the redirect ("Workload is real — and I want to come back to UX for a moment").
**Open question:** What if the emergent topic IS more important than the manager's focal point? Should we re-rank mid-run, or always preserve the anchor?

### S4. Soft-closer reframe
**Change:** When closer answer parses as a request (not a commitment), AI fires one reframe follow-up: "What's the first step *you'll* take to get that by next 1:1?". This is in addition to the budget, not within it.
**Why:** Aom said "i want to have more assistance from the PO's" — no ownership. Closer should land an employee-owned step.
**Tradeoff:** Adds an unbudgeted turn. Could be skipped if manager has already committed to the manager-side action in their notes.
**Open question:** What's the parser signal for "request not commitment" — first-person + want/need verbs?

### S5. Team axis (5th axis)
**Change:** Add `team` axis. Trigger: sentiment about teammates (any teammate — direct team, cross-team, manager, stakeholders). Positive: "team has my back", "X helped me through". Negative: "feel isolated", "tension with X". Seed value TBD.
**Why:** Current 4 axes missed Aom's UX-tension and PO-overload signals as people-relationship data. Currently those drove clarity/wellbeing but not as relationship signal.
**Tradeoff:** Five axes is more cognitive load on the briefing reader. Mitigate by hiding axes that didn't move (per existing [[feedback_axis_starting_values]] discussions).
**Open question:** Does team subsume engagement, or is engagement still about role/work and team is about people?

### S6. Notes pinned to current question card
**Change:** Each question card gets its own note field. Submitting a note auto-tags it with `{alias, label, turn}`. Sidebar can still aggregate. Links to [[feedback_notes_link_to_question_content]].
**Why:** Note 39048c7b at 20:02:39: "we need the notes to be linked to the question, not jsut the timing".
**Tradeoff:** Per-question fields may push manager to over-note. Could keep a top-level "general" note too.
**Open question:** What happens to notes when a question is later edited or replaced by planner?

### S7. Per-reminder copy buttons (Actions | Reminders 1/2 layout)
**Change:** Briefing replaces `watch_for` with `reminders` block. Layout: left half = `next_actions` (with timeframes), right half = `reminders` (copy-pasteable, each with its own copy icon). Links to [[feedback_briefing_actions_over_watchfor]] and [[feedback_briefing_typography_and_layout]].
**Why:** Notes 68b55929 and 28f5de3b. Manager wants to grab specific items into their reminder system without bulk-copying everything.
**Tradeoff:** Per-item copy is more clicks if user wants all. Add a "copy all" too.
**Open question:** What's the canonical reminder string format — "[date] action" or "action — by date"?

### S8. Briefing structure (action-first)
**Change:** Order top→bottom: Headline → Actions|Reminders → Axes (showing driving quote not just score) → Moments (brutal_truth blocks, kept) → Understanding paragraph.
**Why:** Action-first matches manager's job — they need "what do I do" before "what was the story". Axes showing driving quotes addresses "axes okay but not really helping" note.
**Tradeoff:** Story-first readers (debriefers, coaches) may want narrative up top. Could ship as default order with collapse/expand.
**Open question:** Should "Understanding" be collapsed by default given it's last?

### S9. CoreIssue shape: what + tension, one sentence
**Change:** Preparation `coreIssue` = single sentence, "what + tension, no prescription". Example for this run: "Aom's communication with UX is creating friction." Drops "this meeting should focus on..." prescription. Links to [[feedback_preparation_coreissue_length]].
**Why:** Note c8033029 at 19:49:01: current version is a paragraph.
**Tradeoff:** Loses the "why it matters" context. Mitigation: `listenFor` and `goodOutcome` already carry that.

### S10. Focus points: 5 unselected, free multi-select
**Change:** Generate 5 focus point candidates, all start unselected, manager picks any subset (no cap). Links to [[feedback_focus_points_selection]].
**Why:** Current run had 3 all-selected. User wants selection-in not selection-out.
**Tradeoff:** No prioritization signal if manager picks all 5. Could surface "primary" tag on top-ranked one as visual nudge.

---

## Decisions NOT yet pinned (deferred to follow-up)

- **Drill-stop rule (S?):** User chose "manager-controlled 'go deeper' button". Implementation: every question card carries a "go deeper" affordance; without tap, AI pivots on next turn. Needs UX spec.
- **Axis seed display:** Original Q4 round-3 asked about seed visibility; user redirected to add Team axis. Seed-display question still open.
- **Question repetition guard:** Memory [[feedback_question_repetition]] says don't echo question stem. Mechanism (paraphrase rule, or stem-token check) not yet specified.

---

## Critical files (likely targets when this moves to implementation)

These are NOT confirmed — I have not opened them. To verify before editing, grep for:
- planner / question-bank stage logic — search for `stage` field handling and `self_read` → `evidence` transition
- briefing renderer — search for `brutal_truth_employee`, `next_actions`, `watch_for`
- axis registry — search for `wellbeing`, `engagement`, `clarity`, `growth` definition site (this is where Team axis is added)
- focus-points generator — search for `focusPointsResult` producer
- notes UI — search for the component rendering `notes[].text`

## Verification

- **Replay this run** with each change applied in isolation (feature flags or branches) and confirm:
  - S1: turn 5 emits view-card before evidence question
  - S2: turn 6 of 8 produces a synthesis turn
  - S3: by turn 4 a focal-point question appears
  - S4: replay Aom's "i want PO help" answer → AI fires reframe
  - S5: Aom's "tension with UX" + "POs coming directly to me" answers move team axis
- **End-to-end** on a fresh run with different role/meeting type — confirm focus-points default-unselected, coreIssue is one sentence, briefing order matches S8, reminders are copyable.
- **No regressions** in growth axis behavior (it was 0 here — confirm it still moves on actual growth signals).

---

## Open questions to resolve before exit

None blocking — every open question above is implementation-time, not approval-time. Ready for review.

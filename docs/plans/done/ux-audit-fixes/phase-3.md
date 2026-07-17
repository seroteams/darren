# Phase 3 — One language

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The product uses one name for its core object, dialogs say what they do, and every member-facing sentence is written for the member.

## Changes
- **The noun sweep (M13):** "1:1" is the customer-facing noun. "Session / run / prep" disappear from headings, buttons, nav, and empty states in both apps ("Start a 1:1 prep session" → "Prep a 1:1"; "Recent sessions" → "In progress"; keep "Past 1:1s"). Engine stage names get human labels in customer chrome (C8): "Live Q&A" → "During the meeting", "Synthesis" → "Pulling it together".
- **The dialog fix (M7/C3):** "Cancel setup" → confirm reads "Discard this prep?" with buttons "Keep going" / "Discard". Dialog grammar rule recorded: title names the outcome, confirm restates the verb, dismiss is never "Cancel" when the action IS cancelling. Danger button style follows DESIGN.md (coral-800 border/text, not filled red).
- **Member-voiced copy:** B5/C4 "The 1:1s your manager prepped about you." → "Your 1:1 history — dates and meeting types, nothing else."; B4 one name for the member list ("Your 1:1s") across nav, heading, eyebrow, both apps; B3 the member About page rewritten in the member's voice — what Sero holds about you, what your manager sees and doesn't, no manager CTAs.
- **The itemised rewrites:** C1 "What missed? (optional)" → "What did it miss? (optional)" · C2 "Skip (optional)" → "Skip" · C5 delete "Your past 1:1s." echo subtitle · C6 "HONEST READ — THEM" → "Honest read — <name>" · C7 "…not a read on Priya" → "…it says nothing about Priya herself" · C9 "One-page run" renamed for what it does (or moved off the first screen) · C10 "1:1 prep in progress · not met yet" → "First 1:1 in prep — not met yet".
- **A 10-line voice sheet** added beside DESIGN.md (the noun, the dialog grammar, date voice: absolute "Mon 18 Nov 2024" in records, relative allowed only in meta lines) so the sweep doesn't drift back.

## Not in this phase
- Any layout/behaviour change (Phases 1, 2, 5). Parked member features.

## Done when
- [ ] Grep for customer-visible "session"/"run" strings in both apps' stages returns only internal/QA surfaces.
- [ ] Every C-item's new string is live on its screen (walk, don't grep, for the visible ones).
- [ ] Member About contains no manager-voiced sentence and no forbidden CTA.
- [ ] Voice sheet exists and the changed screens follow it.
- [ ] `npm test` + `npm run typecheck` clean (some tests assert copy — update them with the new strings).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **One word for the thing** — walk Home → New 1:1 → Team → Past 1:1s as manager. Count the words used for a 1:1. ❌ Not OK if you still meet "session", "run", and "prep" as competing names on customer screens.
2. **The dialog finally makes sense** — start a new 1:1, then cancel it. The popup should read "Discard this prep?" with "Keep going" / "Discard". ❌ Not OK if any button says "Cancel" or the title says "Reset session".
3. **The member reads like a person wrote it for them** — as member: your list is called "Your 1:1s" everywhere (nav, heading); the subtitle mentions nothing about being "prepped about"; What is Sero? talks to YOU. ❌ Not OK if any member screen mentions "someone on your team".
4. **The little ones** — rate a past 1:1: the prompt says "What did it miss?"; intake notes step: the button says just "Skip"; a briefing's honest-read card names the person, not "THEM".
5. **Stage names are human** — in a live 1:1 flow, the top bar shows "During the meeting", not "Live Q&A"/"Synthesis".

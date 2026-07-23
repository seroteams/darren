# Phase 3: Flow spine A

## Built (2026-07-23)

Awaiting Carl's QA walk. Landed: stepper visible from Setup (session-topbar INTAKE carve-out removed + safe-centring fix so the first pill never clips); intake loses its private progress bar, gains the shared wizard footer with a real Back trail that restores typed values, one commit model (cards select, Continue confirms, Enter = newline); Focus checkbox-cards + live "N selected" + one fade + quiet Regenerate + inline error/Retry; Bank and Eval share the one flowInterstitial with inline error/Retry (no more ERROR-stage bounce); Prepare/Briefing/Debrief adopt the footer (Debrief's Continue finally outranks Copy QA). Orphaned CSS deleted (intake-progress, focus-actions, auth-alt). Offline proof: 181/181 tests, typecheck clean, lint:tokens + lint:copy PASS; real-render screenshots of intake, focus, bank, briefing eyeballed.

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting QA

## Goal

The 1:1 prep flow behaves like one wizard: the same progress bar on every step, Back and Continue always in the same corners, one exit, one waiting screen.

## Changes

- Stepper (`admin/src/ui/session-topbar.js`) shown from Setup onward: intake's bespoke fill bar + "Step X of Y" deleted (`admin/src/stages/intake.js`); stable step count.
- One wizard footer component: ghost Back left, primary Continue right; applied to intake substages, focus, prepare, briefing; one commit model (no auto-advance on card click, Enter = newline in textareas).
- One exit: the topbar "This 1:1" menu; per-screen "Discard prep" buttons/links removed.
- One shared interstitial (centred orb + current step label + skeleton) replaces `bank.js` and `eval.js` variants.
- Focus (`admin/src/stages/focus-points.js`): checkbox-cards, "N selected" beside the CTA, stagger reduced to one fade.
- Debrief (`admin/src/stages/run-debrief.js`): Continue becomes the primary, Copy QA prompt a ghost.
- Errors inside the flow: inline card + retry instead of navigating to the ERROR stage.

## Not in this phase

The interview split screen and briefing render (Phase 4). Guided (Phase 5).

## Done when

- [ ] Every step Setup→Recap shows the same stepper; Back works on every step
- [ ] One footer, one exit, one interstitial across the flow
- [ ] Free checks green; gallery re-export diffed for flow screens
- [ ] Acceptance boxes F1-F5, F9 tickable

## Test scenarios — for the product owner

1. **You always know where you are** — start a new 1:1 and walk to the brief. The same 7-step bar should be visible from the very first question, with the current step lit. ❌ Not OK if the bar appears only mid-flow.
2. **Back never disappears** — on any step, Back (bottom left) takes you one step back without losing what you typed. ❌ Not OK if a step has no Back.
3. **One waiting screen** — the two "Sero is thinking" moments should look identical (centred orb + step name). ❌ Not OK if they differ.

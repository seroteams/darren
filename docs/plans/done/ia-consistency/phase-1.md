# Phase 1 — Write the standard

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-21 — Carl read the three rules and said go

## Built (2026-07-21)
`DESIGN.md` — three additions: **The Screen-Names-The-Object Rule** (§3 Named Rules, beside Name-Wins), **The Breadcrumb Rule** (§5 Components, + added breadcrumb/recap-header to the "reuse" line), and **checklist item #12** ("1:1" not "meeting"; middot joiner) with the count updated eleven → twelve. Doc-only, no code.

## Goal
Add the navigation/IA rules to DESIGN.md so every new screen follows them by default — and so the later phases have a written contract to point at.

## Changes
- `DESIGN.md` — three additions (proposed wording):
  - **The Breadcrumb Rule.** Any drill-down deeper than one level shows a single breadcrumb trail (`ui/breadcrumb.ts`), not a per-screen back button. Crumbs read `Parent › … › current`; the current page is plain text, the rest are links.
  - **The Screen-Names-The-Object Rule** (extends the Name-Wins Rule). A detail or recap screen's heading names the thing you opened — the person, the 1:1 — never the parent list, and never re-shows the parent's header stacked above it. Read-only 1:1 recaps use `ui/recap-header.ts`.
  - **Say "1:1", not "meeting".** In user-visible copy a 1:1 is a "1:1" (or its named cadence, e.g. "Bi-weekly check-in") — never a generic "meeting" or "session". Role and seniority join with a middot ("UX Designer · Staff"), never a comma.

## Not in this phase
- Any code change (that's Phases 2–6). This is the doc only.

## Done when
- [ ] DESIGN.md carries the three rules, in the doc's existing "Named Rules" voice.
- [ ] Product owner has read the wording and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Read the rules** — open DESIGN.md. You should see the three new rules, phrased plainly and matching the tone of the existing ones (e.g. "The One Accent Rule"). ❌ Not OK if any rule is jargon-y or contradicts what you pictured.
2. **Sanity-check the wording** — the "1:1 not meeting" rule is the one that'll drive a lot of small copy edits later. Confirm you're happy calling it a "1:1" everywhere users can see.

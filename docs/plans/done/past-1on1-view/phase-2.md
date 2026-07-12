# Phase 2 — Frontend: 3-tab redesign of the Past 1:1 view

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-12 — Carl walked the 3-tab view ("a"), committed
Overview / Briefing / Answers all working; profile header + rich when-row in place.

## Built (2026-07-12)
- `admin/src/stages/run-detail.ts` — rebuilt into 3 tabs (Overview / Briefing / Answers). Overview = profile header (`.ds-avatar` initials, name at display size, role · seniority, meeting-type pill) + rich when-row (date · ago · questions-answered count) + the one-line briefing read + the rating card. Briefing = `renderReadonlyBriefing` unchanged. Answers = the `turns[]` Q&A list with an empty state. Tab switch wired with the `notes-panel` `switchTab` idiom (panes toggle `hidden`, `aria-selected` updates). View body extracted into a pure exported `renderRunDetail(run)`.
- `admin/src/styles/design/run-detail.css` (new, registered in the design.css barrel) — avatar sizing, profile row, when-row, type-badge pill, Q&A blocks. Tokens only.
- `admin/src/ui/briefing-view.ts` — `Briefing` type gains optional `headline` (already sent by the backend) for the Overview digest.
- `admin/src/stages/run-detail.test.ts` (new) — 6 DOM-free render tests.
- Proof (offline, free): `npm test` **127/127** (incl. my 6 view tests + `test-customer-serving` rebuilding the shared file into the customer bundle + pg parity), `npm run typecheck` clean. In a live dev browser: `run-detail.css` confirmed loaded — avatar 52px circle on accent-soft, active tab 2px accent underline, badge pill, when-row divider all resolve from tokens.
- ⚠️ Honest note: a literal screenshot of a populated run wasn't possible in the automated Browser pane (its `document.hidden=true` breaks this SPA's boot animation for screenshots, and the throwaway auto-login account has no seeded runs). The render + CSS are proven by the tests + computed-style read; the visual walk is Carl's.
- Not committed yet — waiting on Carl's green light.

## Goal
Rebuild `admin/src/stages/run-detail.ts` so a manager sees who/when up front and can move between Overview / Briefing / Answers.

## Changes
- `admin/src/stages/run-detail.ts` — rebuild the `mount` render (keep the `getMyRun` fetch, `wireRating`, and the loading/empty/error `notice` pattern). Add `turns` to the `RunDetail` type.
- New `admin/src/styles/…/run-detail.css` — tab (`.ds-tabs`/`.ds-tab`), profile/avatar, and when-row styles, loaded on this route (the `.ds-*` classes currently live only in the Design stage's CSS). Register in the design.css barrel.

Layout:
- **Slim top line** (always visible): `Past 1:1 · <name>` + "Back to runs".
- **Tabs** — `.ds-tabs` underline pattern; switch wired with the delegated `switchTab` idiom from `admin/src/ui/notes-panel.js` (toggle `is-active` + pane `is-hidden` + `aria-selected`).
- **Overview tab** — `.ds-avatar` initials circle (`initialOf`), name at display size (Name-Wins rule), `role · seniority` dim, meeting-type badge; rich when-row (`formatDate` + `relTime` + `<n> questions answered` from `turns`); at-a-glance digest (`briefing.headline` + first couple of `summary_bullets`); the rating card (`renderRating`/`wireRating`) moves here.
- **Briefing tab** — `renderReadonlyBriefing(run.briefing)` unchanged.
- **Answers tab** — `run.turns` as a Q→A list (question `name` bold, `answer` beneath; skipped dimmed with italic "Skipped"); empty state "No answers were captured in this session." when none.

## Not in this phase
- Any backend change (done in Phase 1).

## Done when
- [ ] Opening a past 1:1 in the **frontend** app shows the profile header + when-row and three working tabs.
- [ ] Answers tab lists the real Q→A for a run with turns; shows the empty state for `qa-overnight Priya`.
- [ ] The same view still renders in the **admin** app (shared file).
- [ ] Nothing below 14px; tabs keyboard-operable with `aria-selected` updating.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Who + when** — open a past 1:1. Up top you should see the person's initials circle, their name big, role · seniority, the meeting-type badge, and a line with the date, "N days ago", and how many questions were answered.
2. **Tabs switch** — click Overview / Briefing / Answers. Each shows its own content; the active tab is underlined. ❌ Not OK if content bleeds between tabs or a tab does nothing.
3. **Briefing unchanged** — the Briefing tab shows the same cards you see today (What stood out, What we understood, Honest read…).
4. **Answers show** — on a run that had a real conversation, the Answers tab lists each question and how it was answered; skipped ones say "Skipped". On the empty `qa-overnight Priya` run, it says no answers were captured.
5. **Both apps** — the view looks right in both the admin console and the customer app.

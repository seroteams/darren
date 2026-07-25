# Phase 2 — Brief-first welcome (parked until Gate 1)

**Part of:** [plan.md](plan.md) · **Status:** ⬜ (parked: builds only after the corridor metric is in)

## Goal
A brand-new manager's Home is the approved Direction A screen: one positioning line, the labelled Sofia sample brief, the explainer video, one blue button.

## Changes
- `admin/src/stages/start-core.js` + `admin/src/stages/intake-firstrun.ts` — a first-visit state for manager accounts with no real brief (decided by the Phase 1 helper): eyebrow "Welcome to Sero", headline, the positioning line "Before your next 1:1: type rough notes, walk in with a clear plan.", the Sofia sample brief card (labelled Sample brief, opens the full recap), primary button "Prep your first 1:1".
- Video embedded to the right of the intro, playing in place (YouTube `Xve0NyKH7Co`, start 49s, click to play, never autoplay), per the approved mockup.
- Styles in the existing start-stage stylesheet; 14px floor; no em dashes in any copy.

## Not in this phase
- Sidebar behaviour (Phase 3) — the rail stays exactly as it is today.
- Any change for accounts that already have a real brief, or for members.
- Copy changes to the wizard.

## Done when
- [ ] Fresh manager signup renders the approved screen (screenshot of the real rendered page, both desktop and mobile widths).
- [ ] After the first real brief is finished, Home shows today's returning-user layout.
- [ ] What shipped matches the approved mockup; any drift got a fresh nod first.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **The stranger test** — `live > sero.team > register a fresh test account > land on Home`. Without clicking anything, you can answer: what is Sero, when would I use it, what will I get? ❌ Not OK if any of the three is unclear.
2. **The video plays in place** — click the video card. It plays right there (from the 49-second mark), no new tab.
3. **The sample opens** — click the Sofia sample brief. You see the full example recap, clearly labelled as an example.
4. **One way in** — the only blue button starts the wizard. Finish a quick real prep; return Home: the welcome is gone, the normal Home is back.

# Phase 2 — Brief-first welcome

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built 2026-07-25, awaiting Carl's walk
(un-parked by Carl on 25 July: he asked for the video on this screen and said keep going)

## Built (2026-07-25)
- `admin/src/stages/start-welcome.ts` (new) — the whole first-visit view as pure string renderers: eyebrow "Welcome to Sero", h1 "A brief for your next 1:1", the positioning line, the sample brief card, the click-to-play walkthrough, and the slot Home moves its one blue button into.
- `admin/src/stages/start-core.js` — on a first visit (the Phase 1 `hasRealRuns` rule) the standard header and the recents section step aside and the welcome renders instead; the button moves in relabelled "Prep your first 1:1"; the play click builds the player; the sample card's link opens the seeded example run. A failed load still restores the returning-manager screen.
- `admin/src/styles/design/start-stage.css` — two-column grid inside the existing 64rem container (no new width tier), the sample card, the local video poster, and the `[hidden]` restore both sections need because their base rules set `display:flex`.
- `backend/api/middleware/security-headers.ts` — CSP gains `frame-src https://www.youtube-nocookie.com`, the app's only third-party frame. Nothing else widened.
- `admin/src/stages/intake-firstrun.ts` — the `actionSlot` option went with Home's old card (start-core was its only caller). The wizard's own card is untouched.
- Tests first: `start-welcome.test.ts` (new, 7 tests incl. the drift test that fails if the sample stops matching `content/demo/demo-run.json`), `start-core.test.ts` guards rewritten for the new shape, `test-security-headers.js` pins frame-src to one host with no wildcards.

### Proof
- Free checks: `npm test` **187/187**, typecheck clean, `lint:copy` PASS, `lint:tokens` PASS. (The `runs.test.ts` failure noted at Phase 1 was fixed by another lane in the meantime, not here.)
- Real screens, fresh signup on the local customer app: [proof/welcome-desktop.png](proof/welcome-desktop.png) (1440px), [proof/welcome-mobile.png](proof/welcome-mobile.png) (430px, stacks), [proof/returning-home.png](proof/returning-home.png) (a manager WITH a real 1:1 still gets the normal Home, unchanged).
- Measured in the page: two columns 560px + 336px, the video 336x189 top-right, header and recents genuinely not rendered, the button in the welcome slot with the right label.
- The play click swaps in `youtube-nocookie.com/embed/Xve0NyKH7Co?start=49&autoplay=1&rel=0`; the served CSP on the API port carries the new `frame-src`. No console errors.
- Link destination checked, not assumed: "See the whole example 1:1" lands on the example run's detail (breadcrumb "Past 1:1s › Bi-weekly check-in", Overview / Recap / Answers).

### Honest gaps for the walk
- **Playback itself is unproven here.** The automated browser in this session cannot composite third-party frames, so I verified the player element, its URL and the CSP, not the picture moving. Carl's click is the real test.
- **The rail is still there.** The approved mock shows no sidebar; hiding it is Phase 3 (the quiet rail), deliberately not in this phase.
- The run detail shows Overview / Recap / Answers, so it does not repeat the prep brief the card previews. The link says "the whole example 1:1", which is what it opens.
- Copy choice worth a word: the h1 is "A brief for your next 1:1" rather than the front door's "Walk into your next 1:1 well prepared", so the headline and Carl's positioning line do not both say "walk in". One word flips it back.

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

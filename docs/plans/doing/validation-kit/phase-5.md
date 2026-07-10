# Phase 5 — Phone + copy pass

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The whole customer flow is comfortable on a phone, and every screen uses the same words for the same things.

## Changes
- Responsive sweep of the customer journey (welcome → login/register → intake → focus → prepare → interview → briefing → past 1:1s): no horizontal scroll, comfortable tap targets, readable at ~380px width, 14px floor everywhere.
- Copy consistency sweep of the same screens: one vocabulary ("1:1", "prep", "briefing", "notes" — the same term for the same thing on every screen), UK English, no exclamation marks, plain language. Produce a tiny copy glossary in this folder as the reference.
- Fixes are CSS/copy-level; no layout rebuilds, no new components.
- Verified guards (2026-07-10): copy rules are test-enforced on **one file only** (`frontend/src/stages/welcome.test.ts` — exact strings, no "!", one-button rule) — don't break it, and note the thin coverage. The 14px floor is a two-layer chain (Tailwind `fontSize` remap `admin/tailwind.config.js:172-186` → tokens `tokens.css:328-333`, inherited by the customer app) — the sweep checks for hardcoded px sizes that bypass it.

## Not in this phase
- Internal/admin tooling pages (never customer-facing) — out of scope.
- No visual redesign — the design system stays as-is; this is fit and wording only.

## Done when
- [ ] Every customer screen walked at phone width with no horizontal scroll and no text under 14px.
- [ ] The copy glossary exists and the screens match it.
- [ ] Existing copy tests still pass; typecheck + tests green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Real phone run** — on your actual phone, do a full guest prep start to finish. Everything should be readable and tappable without pinching or sideways scrolling. ❌ Not OK if any screen needs zooming or a button is fiddly to hit.
2. **The vocabulary check** — flick through the flow and note what the product calls the meeting, the output, and your input on each screen. It should be the same three words everywhere. ❌ Not OK if one screen says "session" where another says "1:1", or "report" vs "briefing".
3. **Read it aloud** — pick any two screens and read the copy out loud. It should sound like a person, UK spelling, no hype. ❌ Not OK if anything sounds like marketing or tech-speak.

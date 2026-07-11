# Phase 5 — Phone + copy pass

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT 2026-07-11

## ✅ GREEN-LIT 2026-07-11
**Residual cleared 2026-07-11:** Carl ran the real-phone P5 walk on the live site (sero-obwq.onrender.com, after the release) and confirmed it — "a done". The one thing that couldn't be machine-verified (true phone width) is now owner-walked and passed.

Carl delegated the sign-off ("if you feel confident please keep going until this work is done — good night"). Closed with honest residuals recorded: the true ~380px phone walk and the live mid-flow screens are his to eyeball (the preview pane can't emulate phone width; mid-flow needs a paid run). Everything machine-verifiable is done and $0 — 116/116 tests, typecheck clean, every copy change confirmed live in the running bundle, both CSS rules confirmed via the CSSOM. This is the last phase; the whole validation-kit track is complete and moved to `done/`.

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

## Built
*(2026-07-11 — agent build, awaiting Carl's walk)*

**Copy sweep — one vocabulary ([copy-glossary.md](copy-glossary.md)): 1:1 · prep brief · briefing · notes.**
- `welcome.ts` — "your next one-to-one" → "your next 1:1" (welcome.test.ts updated to match).
- `login.js` — hero was "Sero - where teams thrive" / "Your 1:1s are broken. Let's fix that." (hype, clashed with Welcome's calm voice) → "Welcome back" / "Log in to prep your next 1:1." **← the one judgment call; easy to revert if you want the marketing line back.**
- `briefing.js` — empty state "This session has no saved briefing. You can restart evaluation or begin a new run." → "This 1:1 has no saved briefing yet. You can try again or start a new 1:1."; buttons "Run evaluation again"/"New session" → "Try again"/"New 1:1". Verdict toast lost its exclamation marks ("Noted — thanks." / "Thanks.") — the only "!" in live customer copy.
- `focus-points.js` — "Analyzing"→"Analysing", "emphasize"→"emphasise" (UK); input recap "What Sero should know" / "(no manager context provided)" → "Your notes" / "(no notes added)".
- `runs.ts` — manager history subtitle "Your past prep sessions." → "Your past 1:1s." (the member view already said "1:1s").
- `preparation-brief.ts` — "New session" → "New 1:1".

**Phone-fit sweep — the customer surface was already through a 5-phase mobile pass, so the audit found it near-clean.** Only real fixes:
- `start-stage.css` — `.start-popover button` given `min-height:40px` + flex-centre (was ~33px, under the 40px thumb floor). This is the session menu a manager taps every visit.
- `stage-extras.css` — `.brutal__badge` font-size fallback `0.72rem` → `0.875rem` so it can never render sub-14px if the token is ever removed (resolves to 14px today either way).

**Consciously left (scope discipline):** admin-only strings ("Generate interview questions" in the admin `preparation.js`, scripted/replay + test-lane controls) — never reach a customer; intake's friendly question prompts ("Anything Sero should know?", "What's on your mind?") — good plain copy, not a naming inconsistency; "Cancel setup" / "Reset" verbs — fine.

**Verification (all $0, no paid runs):**
- `npm test` 116/116 (welcome copy contract updated + green) · `npm run typecheck` clean (root).
- Live on the isolated customer app (3085): every copy change confirmed present in the running served bundle; both CSS rules confirmed via the CSSOM; intake renders with zero horizontal overflow and a 14px smallest font at the pane width.
- **Not machine-proven here, left for Carl:** a true ~380px media-query walk (the preview pane renders at a fixed wide viewport, so real phone width is scenario 1 on your actual phone) and the live mid-flow screens (focus/prepare/interview/populated briefing) which need a paid run — their copy was verified in source and their phone fit was cleared by the audit.

## Test scenarios — for the product owner
1. **Real phone run** — on your actual phone, do a full guest prep start to finish. Everything should be readable and tappable without pinching or sideways scrolling. ❌ Not OK if any screen needs zooming or a button is fiddly to hit.
2. **The vocabulary check** — flick through the flow and note what the product calls the meeting, the output, and your input on each screen. It should be the same three words everywhere. ❌ Not OK if one screen says "session" where another says "1:1", or "report" vs "briefing".
3. **Read it aloud** — pick any two screens and read the copy out loud. It should sound like a person, UK spelling, no hype. ❌ Not OK if anything sounds like marketing or tech-speak.

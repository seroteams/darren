# HANDOVER — whole-project UI polish (ui-look-and-feel)

**For:** a fresh Claude chat picking this up. **Written:** Fri 17 Jul 2026.
**Read first:** [plan.md](plan.md) (the 6-step plan) + [audit-findings.md](audit-findings.md)
(the full design-language spec + per-dimension gap audit — your source of truth for *what* to build).

## What this is
Bring the whole product (customer `frontend/` + `admin/` console, ~50 surfaces) to the look & feel
of the briefing artifact Carl loved: calmer type, content in the display face, one pill/dot/chip
detail language, generous spacing, soft framed depth. A **re-theme + polish of what exists — not a
redraw.** Carl = design lead, non-engineer (write to him in plain language, keep replies SHORT and
visual; engineering detail goes under a brief `🔧 Under the hood` aside).

**Scope:** whole project, admin included. **Dark mode is PARKED** (Carl's call) — its homework is
saved in audit-findings.md; do NOT build it. **Light-only.**

## Hard constraints (don't relearn these the hard way)
- **Front-end only. No engine, no OpenAI, no paid runs.** Verify free:
  `npm run build:all` (compiles both apps' CSS — the main safety net), and
  `node --test frontend/src/stages/preparation-brief.test.ts frontend/src/stages/preparation-css.test.ts`
  (should be **54/54**). `npx tsc --noEmit -p frontend/tsconfig.json` has **one pre-existing error**
  in `guided/guided-arcs.ts` (NOT ours — ignore it; it reproduces at HEAD).
- **Screenshots don't work this session** (the Browser pane's capture path hangs). That's WHY the
  build has stayed conservative — you cannot self-verify the *look*, so anything visually uncertain
  waits for Carl's eyes. A dev server runs at **http://localhost:3000** (another chat's) — Carl
  looks there.
- **House rules hold everywhere:** 14px text floor, one blue action per screen, tokens-only colours
  in screens (no literal hex — `admin/src/styles/design/preparation-css.test.ts` pattern guards
  this), Lucide icons only, cards 12px / controls 4px radius, no nested cards. Exemptions (leave
  alone): dev-badge, build-stamp, `stages/universe.*`, `stages/design.js`.
- **Trunk-only, silent commits:** work on `main`, commit MY-OWN-FILES-ONLY (`git add -- <paths>`),
  **never `git add -A`** (parallel chats share this folder). Never push unless Carl says "go live".
  Don't touch `STATUS.md` casually — another session is actively editing it.

## What's BUILT + committed so far (all local, NOT deployed)
Carl reviewed the visible batch on localhost:3000 and said **"it's good, keep going"** — so P1, P2,
and the P3-so-far are effectively approved by eye. Commits:
- **P1** `f4bb7869` — `tokens.css`: `--type-display` calmed 44-56px→30-42px; added scaffolding
  tokens (tracking-caps, role spacing, `--shadow-lift`, `--radius-frame`, reading measures, `-line`
  hairlines); **defect fixes**: defined `--color-page` (un-hid Pulse bars/pills), promoted
  `--session-topbar-h` to `:root` (fixed 6px tuck-under), backfilled phantom
  `--sero-emerald-500`/`--sero-rose-700`. `base.css`: `.h1`/`.text-display`/`.h2` 700→600 +
  `text-wrap: balance`.
- **P2** `4bb411b9` — `base.css`: `.eyebrow` → blue accent-dark section tier (the artifact eyebrow);
  added `.eyebrow--slot` (quiet dim tier) + `.ident-name` (display identity) scaffolding.
- **P3 (part)** `base.css` `.chip` primitive (`ec…`/see log); `buttons-inputs.css` `.btn` hover →
  colour-only, no lift/jump; `one-page-run.css` `.prep-callout` → borderless soft-blue display-face
  block.
- **Reading column** — `base.css` `.stage-reading` (56rem) + `preparation.ts` moved onto it (the
  manager's prep briefing now reads in a book column).
- **Related:** the **Arc briefing** plan is CLOSED (`docs/plans/done/briefing-before-during-after/`),
  so briefing/prep surfaces are now UNBLOCKED to edit.

## What's NEXT (in order) — start here
The remaining work is the **visually-uncertain** stuff, so **do it with Carl's eyes** (he QAs on
localhost:3000 between changes), not blind:
1. **Finish P3** — refit the ~15 hand-rolled pill families onto `.chip` (map in audit-findings.md
   "controls" + the discovery journal); the confidence **dot-meter** in the briefing; one `.seg`
   segmented control. *Watch:* `.eyebrow` is used ~146× — reclassify the *slot*-role ones to
   `.eyebrow--slot` (per-usage judgement) so the app isn't over-blue.
2. **P4 — the frame** (`.screen`: page-tint ground inside an 18px `--radius-frame` + `--shadow-lift`
   frame, white cards floating). THE signature look, but structurally it suits card-based layouts —
   check it against the flat Arc briefing before committing. Also: guided flow + member-home join
   the system; skeletons everywhere.
3. **P5 — long-tail:** replace ~14 `window.alert()` with a calm coral notice; spacing rhythm;
   overlay recipe; off-barrel CSS (`row-menu`, `error-log`, etc.); tasks-board de-nest +
   `KB_LANE_COLORS` onto tokens.
4. **P6 — prove + document:** light-theme contrast audit; update `DESIGN.md` + the in-app design
   sheet; extend the guard tests.

## Deferred items already flagged (pick up in the right phase)
- Name-as-hero on Team — the Team card is a **compact list row** (`team-card.ts`), not a hero card;
  needs a layout call before applying `.ident-name`.
- `.stage` 96px page-tail — `.stage` is vertically-centred; a tail fights the centring; attach to
  scrolling containers instead.
- The `.prep-callout`/reading-column were deferred-then-done once Arc closed — done.

## How to talk to Carl
Plain, short, visual. He has ADHD — one decision at a time, each option concrete + reversibility
flagged. End replies with a small status box (what's done / what he does next / is it live).
Nothing is live until he says "go live". He gets lost in long messages — keep it tight.

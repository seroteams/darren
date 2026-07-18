# Phase 1 — Gallery shell

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT

## ✅ GREEN-LIT 18 Jul 2026 — Carl walked the gallery + the full 46-screen test sweep ("love it, keep it, I can use it")
Reached via the Screens rail icon → edit-mode top bar → soft-yellow Screens ▾ dropdown; picks the real screen, Copy design prompt per screen. 44/46 screens mounted (34 with data, 10 empty + 2 needs-id → Phase 2). Committed on main, local only.

## Built (18 Jul 2026)
- New registry `admin/src/stage-loaders.js` (loaders moved verbatim from main.js + GALLERY entry); main.js imports it.
- `admin/src/state.js` — `STAGES.GALLERY` + `galleryScreen` state.
- `admin/src/router.js` — `/gallery` + `/gallery/:screenId` routes, parse regex, gated `INTERNAL_ONLY` + `LIVE_HIDDEN`.
- `admin/src/main.js` — boot + popstate branches carry `galleryScreen`.
- `admin/src/stages/gallery/gallery.js` — tree (groups + filter) + host pane + child mount/unmount + URL sync + live-buttons banner + **Copy design prompt** button.
- `admin/src/stages/gallery/screens.js` — labels/groups overlay, frontend-only loaders (welcome/join/members), prompt template, DEMO_SESSION_ID placeholder (Phase 2).
- Copy-prompt file path derived from the Vite-resolved specifier — handles both admin-local and `/@fs/` cross-package screens (verified: `admin/src/stages/briefing.js`, `frontend/src/stages/team.ts`).
- Verified on screen (Playwright, animations frozen): tree renders all groups + `needs data` tags, About/Team/Briefing/Library mount live, filter narrows ("brief" → Briefing + Debrief), deep link `/gallery/about` + `/gallery/briefing` survive reload.
- Offline proof: `npm run typecheck` clean · `npm test` 156/156.
- Known edge (accepted v1): the Design component-sheet screen renders live demo nav that can self-navigate — browser Back returns.

## Revision (18 Jul — Carl feedback)
- The screen list was a permanent second left column, stacked next to the app nav rail = cluttered.
- Reworked it into a **hidden slide-out drawer**: closed by default (screen gets full width), opens on clicking the **Sero logo** (Carl's pick) or a **☰ Screens** button in the bar. Picking a screen, the backdrop, or Close tucks it away.
- Logo hook is a capture-phase click listener on the shared nav's `.js-home`/`.js-bar-home`, attached only while the gallery is mounted and removed on unmount — the shared `app-nav.js` is untouched, and the logo means "home" everywhere else.
- Verified on screen (Playwright): starts closed → logo toggles open/closed → picking Team auto-closes and mounts it. typecheck clean.
- Polish (Carl): the Sero logo now **rotates 90°** while the drawer is open (runtime class on the shared nav's `.js-home`/`.js-bar-home`, CSS in the stage's own `<style>`, cleared on unmount). Verified: closed→`none`, open→`rotate(90°)`, re-closed→`none`.

## Rework 2 (18 Jul — Carl: drawer scrapped)
- The left drawer collided with the app nav rail's hover-expand and the dark backdrop annoyed Carl. Showed a 10-option board; Carl picked **#2 top dropdown**, wants the grouped titles visible, styled **soft yellow**.
- Rebuilt: removed the drawer, backdrop and logo-rotation hook entirely. The list is now a **soft-yellow “Screens ▾” dropdown** in the top bar (Sero gold tokens: `gold-100` panel, `gold-400` border, `gold-900` headings). Grouped titles with ▾, filter box, "needs data" chips (white-on-yellow for legibility). Opens on click, closes on pick / click-away / Escape. No page dimming, no nav collision. Sero logo is back to "home" (hook removed).
- Verified on screen (Playwright): menu hidden by default → opens soft-yellow (`#fffbf4`) with all 7 group titles + 46 items → picking Team closes it and mounts Team. typecheck clean.

## Rework 3 (18 Jul — "edit mode" top bar + rail icon)
- Carl's model: a **Screens icon in the left rail** enters an **edit mode** where the picker becomes a **full-width toolbar pinned to the very top**, above everything — rail + content shift down beneath it.
- `admin/src/ui/app-nav.js`: added a `Screens` rail item (`LayoutGrid` icon, `gallery` key → `setState({stage:GALLERY})`), `ACTIVE_BY_STAGE[GALLERY]="gallery"` (rail highlights), and `"gallery"` added to the live-hide list (off the live rail like `personas`/`tasks`).
- `gallery.js` restructured: the toolbar is now a `position:fixed` bar **appended to `document.body`** (not inside the stage — the stage's transform would break `position:fixed`) + a `body.gallery-edit` class whose CSS offsets `.app-nav`/`#root`/`.profile-badge` down by 56px. Slim toolbar + the soft-yellow `Screens ▾` dropdown (Carl's pick). Removed on unmount, first thing.
- Verified on screen (Playwright): rail Screens icon present + highlights on the gallery; bar is full-width (1575px) at top:0, rail top and #root padding both 56px; open the dropdown, pick Team → loads below; **click Pulse to leave → bar removed, `gallery-edit` class gone, rail top + #root padding back to 0** (the "going back out" bug is fixed). typecheck clean.

## Full-sweep test (18 Jul — Carl asked)
- Playwright opened all 46 screens through the edit-mode gallery, one by one, screenshotted each. Report: [test-results.html](test-results.html) (contact sheet, opens locally — shots in `test-shots/`, uncommitted/local).
- **44/46 mounted; 34 rendered with real local data, 10 flow screens rendered their empty state (Phase 2 demo data), 2 redirected out because they need an id (GUIDED → /new, ADMIN_USER → user list).** The 2 redirects are the parameterised screens already flagged for Phase 2 seeding — not broken screens; they behave exactly as the live app does when opened without a target.
- Benign console 404s on a few screens (optional assets) + a `Unknown session: null` on Interview — all expected empty-state noise, none blocked mounting.

## Goal
The `/gallery` page exists: a grouped tree of every screen on the left, the real screen rendered on the right, deep links that survive reload — with every self-fetching screen already showing real local data.

## Changes
- `admin/src/stage-loaders.js` (NEW) — the screen registry, moved verbatim out of `main.js`, plus the GALLERY entry and loaders for the three frontend-only screens (welcome, join, members).
- `admin/src/main.js` — import the registry; handle `/gallery/:screenId` on boot and back/forward (mirrors the person-detail pattern).
- `admin/src/state.js` — add `STAGES.GALLERY` + `galleryScreen` to state.
- `admin/src/router.js` — routes for `/gallery` and `/gallery/:screenId`; gate as `INTERNAL_ONLY` + `LIVE_HIDDEN`.
- `admin/src/stages/gallery/gallery.js` (NEW) — the page: tree with groups + filter box, host pane that mounts/unmounts the chosen screen with the real app dependencies, URL sync, and a banner ("Preview of real screens — buttons are live against your local data").
- `admin/src/stages/gallery/screens.js` (NEW) — per-screen labels + groups; unlisted screens fall into "New / unsorted" instead of vanishing.

## Not in this phase
- Demo-session prefill for the flow screens (Phase 2) — they'll show their empty states, tagged "needs demo data" in the tree.
- Any polish from Phase 3.

## Done when
- [ ] `/gallery` renders the tree with all ~44 screens grouped.
- [ ] Clicking Team / Runs / Library / Pulse shows them populated with real local data — verified by screenshot of the actual rendered page, not the code.
- [ ] Reload on `/gallery/team` lands back on Team inside the gallery.
- [ ] A manager-role login hitting `/gallery` bounces home (internal-only gate works).
- [ ] Every existing route still works after the registry move (smoke the app's main screens).
- [ ] `npm run typecheck` + `npm test` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself (dev app running, logged in as you). Next phase waits for your green light.
1. **The tree** — open `localhost:3000/admin/gallery`. You should see a left-hand list of every screen in the app, grouped (Auth, Manager home, 1:1 flow, Member, Content, Superadmin, Internal tools), with a search box at the top. ❌ Not OK if any screen you know of is missing.
2. **Jump to a screen** — click "Team". The real Team page should appear on the right, showing your actual team members. Click "Runs" — your real runs list. ❌ Not OK if they're empty or broken.
3. **Find by name** — type "brief" in the filter box. The list should narrow to Briefing. 
4. **The link sticks** — while on Team, copy the browser address, open a new tab, paste it. You should land straight back on Team inside the gallery. ❌ Not OK if you end up on the normal home page.
5. **Nothing else broke** — leave the gallery, walk your normal app (home, a run, the library). Everything should look and work exactly as before.

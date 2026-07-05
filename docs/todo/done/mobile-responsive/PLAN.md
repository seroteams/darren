# Mobile-responsive — the whole app on a phone

**Goal:** Every screen in the app works properly on a phone — nothing overlapped, nothing cut off, everything tappable — using the existing Sero styles (no re-skin).
**Driver:** Carl
**Created:** 2026-07-05

## Done means
- On a phone, the left rail is gone — a header with a menu button opens a drawer instead.
- A manager can run a full 1:1 prep (intake → briefing) on a phone without pinching or fighting the keyboard.
- Every admin screen — tables, Compare, the QA tools — is readable and usable at phone width. No screen scrolls sideways as a whole page.
- Nothing changes on desktop.

## Scope decisions (Carl, 2026-07-05)
- **Everything, full polish** — all 38 screens, including the internal tools.
- **Own track, styles as-is** — additive media queries in `design.css`; no Flowbite re-skin here. The design-system track just gains a "component sheet must demo responsive behavior" note.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Responsive shell | Nav rail → drawer + mobile header; topbar, notes panel, profile badge fixed for phones | ✅ |
| 2 | Auth + member screens | Login/register/privacy/about/feedback + Home/Team/Runs/details polished at phone width | ✅ |
| 3 | Run pipeline on a phone | Full 1:1 prep flow usable end-to-end on a phone | ✅ |
| 4 | Global sweep + admin core | iOS zoom fix, popover clamps, touch targets; User management/Library/Tasks/Start/Review-run mobile layouts | ✅ |
| 5 | QA tools + Universe | Compare/Test-engine/lexicons/arcs restacked; Universe navigable on touch | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**TRACK CLOSED 2026-07-05 — Carl green-lit all five phases ("commit, its good"); committed and archived
to done/.** Phase 5 closed the build: Compare stacks at phone width, Universe takes touch drags
(`touch-action: none` — pointer handlers already existed), all six QA-tool screens verified zero overflow
at 375. Final free checks: `npm test` **69/69** · typecheck:admin · build clean.
Note: the parallel manager-ready track now bounces managers off internal tools — the internal screens'
mobile polish is admin-only in practice, which is fine (that's who uses them).

**Phase 4 detail:**
Phase 4 (see phase-4.md build notes): iOS-zoom fix (select + phone ≥16px), sticky first column on the
User management / Error log tables, touch-size small buttons, Session popover clamp, `pre` scroll
containment, unbroken-string wrapping — and a real bug found+fixed: /guide overflowed 27px at phone width.
Verified live: Start/Library/Tasks/Guide zero overflow at 375. Free checks after Phase 4: `npm test`
**69/69** · typecheck · build clean. Note for Phase 5: another session merged Personas/Regression/Compare
into one "Test engine" page (regression.js deleted) — Phase 5's list shrinks accordingly.

**Phase 3 detail:**
Carl said "keep going" / "continue" after each build, so all three were built in one session; his walks are
still the gate for ✅. Phase 3 (see phase-3.md build notes): axis bars restack below 480, briefing action
labels stack, interview buttons become full-width thumb targets, and the glossary/confirm modal caps to the
screen (verified live). Phase 2 delta was tiny: placeholder ellipsis + header-row wrap. Live-walked at 375px:
login, register (real account created), privacy, about, feedback, intake + glossary modal. A real pipeline
run's screens are Carl's walk — no paid runs were made. Free checks after Phase 3: `npm test` 67/67 ·
typecheck · build clean.

**Phase 1 detail:**
Landed: mobile header (48px, brand + ☰) + off-canvas drawer replacing the rail below 768px (scrim, Esc/scrim-tap/navigate-to-close, aria-expanded, closed drawer out of the tab order); desktop hover-expand wrapped in `@media (hover: hover)`; compact in-session topbar (current stage + step count only) stacked under the header; notes panel full-width below 640px; profile badge avatar-only below 768px. Files: `design.css` (+~190 lines incl. the new Mobile shell section), `app-nav.js` (+~60).
Verified in a real browser at 375×812: no horizontal overflow on Home/Library/New-session; header 0–48px, topbar 48–92px, content from 92px; drawer open/close all four ways; desktop at 1280px byte-identical behaviour (rail 60px, hover-expand to 248px, no header/scrim). Free checks after edits: typecheck:admin clean · admin build clean · `npm test` 65/65 (baseline same).
Next: Carl walks phase-1.md scenarios (devtools phone mode or real phone — for the phone, start Vite with `--host` and open `http://<pc-ip>:3000`). Then Phase 2 (auth + member screens).

Baseline (2026-07-05, before Phase 1 edits): `npm test` **65/65** · `npm run typecheck:admin` clean · admin build clean. Free checks only — no paid gate needed for CSS/UI work.

## Testing each phase (how Carl walks it)
- Devtools: I verify at 375×812 + 768×1024 with the preview tools and report screenshots.
- Real phone: run Vite with `--host`, open `http://<pc-ip>:3000` on the phone (same wifi). Real-device-only checks: iOS sticky-hover, input focus-zoom, keyboard overlap, safe areas.
- No paid runs in this track. Pipeline walks use the dev prefill / existing runs.

## Parked
- Bottom tab bar for members (drawer chosen — one mechanism for both roles; revisit if members want faster switching)
- Full multi-touch (pinch-zoom) on Universe — basic drag only; park deeper touch work if it balloons
- Card-view for the User management table (grouped tbodies make it brittle; sticky-first-column chosen)

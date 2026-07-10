# Design system → native in-shell stage

**Goal:** The admin Design system opens *inside* the app shell — main left rail stays visible, its own sidebar becomes a second-level rail beside it — rebuilt natively in the app's own CSS (no CDN, no iframe).
**Driver:** Carl
**Created:** 2026-07-10

## Done means
- Clicking "Design system" in the rail routes to `/design` in-shell (no new tab); the main rail stays.
- A native second-level rail sits to the right of the main rail; clicking an item scrolls to its section; scrollspy highlights the item in view.
- Every section is rendered in the app's own CSS/tokens — no CDN Tailwind/Flowbite requests.

*(Pop-out to new tab was built then removed at Carl's request 2026-07-10 — it didn't behave, and the in-shell view is the point.)*

## Resolved before we start
- The old sheet was a static page (`admin/public/sero-flowbite/index.html`) opened via `window.open`. It stays on disk as a fallback until Phase 5 confirms parity, then is retired.
- The stage `<section>` carries a `translateY` enter transition, which would make a `position: fixed` child position relative to it — so the second-level rail uses `position: sticky` instead.
- The stage opts out of `.stage`'s centred grid via a `ds-stage` class added on mount (removed on unmount).

## Phases
Carl asked for the whole sheet at once (2026-07-10), so the planned Phases 2–5 were **folded into Phase 1** — all 24 sections landed in one build. The per-topic split is kept below as the record of what's covered.

| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Full sheet (shell + all 24 sections) | DESIGN stage, /design route, rail rewired, sticky second-level rail + scrollspy, pop-out, and every section (rules · brandmark · colours · type · buttons · badges · inputs · pick controls · date/time · toasts · table · cards · tabs · header/banner · scores · goals · chart · timeline · dropdown/modal · nav · panel · states · login · inventory) | 🔨 |
| — | ~~2 Form foundations~~ | folded into Phase 1 | ✅ |
| — | ~~3 Data display~~ | folded into Phase 1 | ✅ |
| — | ~~4 Signature + feedback~~ | folded into Phase 1 | ✅ |
| — | ~~5 Brand + chrome~~ | folded into Phase 1 (static-page retirement still pending Carl's parity sign-off) | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
All 24 sections built in one pass, awaiting Carl's QA walk. Verified structurally in the browser (autologin dev stack): `/design` renders in-shell, main rail + second-level rail present, 24 nav links + 24 sections in order, core swatches' hex resolved from tokens (e.g. `#5aa9e6`), brand SVGs load, dropdown/modal/live-toast wired, no console errors. Visual look (spacing, colour, phone width) is Carl's QA walk — screenshots time out on this app (known animation/render-queue harness artifact).

Net-new shared assets were kept **showcase-local** (`.ds-input`, `.ds-check/.ds-radio/.ds-toggle`, `.ds-toast-live`) rather than promoted into shared CSS — lower risk for a single big push. Promoting them app-wide is parked.

**Baseline:** N/A — pure frontend change, verified in-browser. No paid `npm run gate` run (it exercises the OpenAI pipeline, not the UI, so it would prove nothing here).

## Parked
- Canonical `.form-input`, `.ds-check/.ds-radio/.ds-toggle`, and the toast system are net-new shared assets landing in Phases 2 & 4 — they touch shared CSS, so watch stages that adopt them.
- Retiring / deleting the static `admin/public/sero-flowbite/index.html` waits for Phase 5 parity sign-off.

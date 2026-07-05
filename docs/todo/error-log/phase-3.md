# Phase 3 — Catch browser errors too

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
When the app itself breaks in someone's browser — a blank screen, or a page that won't load — that lands in the same Error log, tagged with the screen the user was on. Now the log covers what the *user actually saw*, not just what the server saw.

## Why
Some of the worst failures never reach the backend: a JavaScript crash paints a blank screen, or the network drops mid-load. From the user's side that's "it broke" — so it belongs in the log. This is the other half of "errors our users have."

## Changes
- **Global crash handler** at app boot in [admin/src/main.js](../../../admin/src/main.js): `window.onerror` + `window.onunhandledrejection` → report one error (screen name from the current stage, the message, the browser/user-agent). The app's existing ERROR stage still shows the user "we hit a snag" — this just also records it.
- **Failed-load reporter:** wrap the shared fetch helper `json()` in [shared/api.js](../../../shared/api.js) so a failed page load / network error reports itself too.
- **A small ingest endpoint** `POST /api/v1/errors` — **any logged-in user** may report their *own* error (not superadmin-gated; it's a write, fenced to the caller's identity). It writes an `error_logs` row with `source: "browser"`. Rate-limited and deduped so a crash loop can't flood the table; the reporter **never reports its own failure** (no infinite loop).
- **Redact** the same way: message + screen + user-agent only; never form contents or tokens.

## Not in this phase
- No new screen — these rows show up in the Phase 2 table (the purple "Browser" rows).
- No detail drawer / filters / purge (Phase 4).

## Done when
- [ ] A forced blank-screen crash in the app produces one `source: "browser"` row naming the screen.
- [ ] A failed page load (network cut) produces one row, not a storm of them.
- [ ] The reporter can't loop on itself, and rate-limiting caps a crash loop.
- [ ] Browser rows appear in the Error log table alongside API rows, clearly marked.
- [ ] `npm test` green, typecheck + admin build clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Phase 4 waits for your green light.
1. **A blank-screen crash gets caught** — trigger the app's "force crash" path (dev helper). Open the Error log: a new **Browser** row names the screen you were on and the error. ❌ Not OK if a crash the user saw left no trace.
2. **A dropped connection is caught once** — with the network throttled/cut, load a page that fails. One **Browser** row appears — not fifty. ❌ Not OK if one failure spams the log.
3. **API and browser sit side by side** — the table now shows both kinds, and you can tell them apart at a glance (the source pill). ❌ Not OK if you can't tell where an error came from.
4. **The app didn't get worse** — normal use is unchanged; the reporting is invisible to the user. ❌ Not OK if the crash-catcher itself caused new problems.

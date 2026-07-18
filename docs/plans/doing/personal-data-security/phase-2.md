# Phase 2 — Quick hardening (code)

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT 2026-07-18

## Built (2026-07-16)
- **Gemini key out of the URL** — `backend/engine/ai-client.ts`: key now sent as the `x-goog-api-key` header, URL drops `?key=` (can't leak into proxy/access logs). OpenAI/Resend already used headers.
- **Security headers on every response** — new `backend/api/middleware/security-headers.ts` (`setSecurityHeaders`) called once at the top of `router.handle()` (`backend/api/router.ts`), the single chokepoint every API + static response flows through. Sets CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, and HSTS (prod-only). Chose the router chokepoint over `server.ts` deliberately — a parallel session has `server.ts` open.
- **CSP is safe for the app (verified in a browser).** Confirmed the built HTML has no inline scripts and the source no inline `on*=` handlers, fonts are self-hosted `@fontsource` bundles, and no cross-origin fetches — so `script-src 'self'` holds. Then served the real `frontend/dist` with the CSP and loaded it: the page rendered fully (welcome, forms, dropdowns), assets 200, **zero CSP violations** in console.
- Completed two existing test mocks (`router.test.ts`, `health.controller.test.ts`) that lacked `setHeader` — surfaced by the new call, so my mess to fix.
- **Tests:** new `backend/tests/runs/test-security-headers.js` (3 checks). **`npm test` = 145/145**, `npm run typecheck` clean.

## Not in this phase
- The committed-log purge → moved to **Phase 3** (destructive history rewrite, needs coordination).
- Anything parked in plan.md.

## Test scenarios — for the product owner
1. **App still works** — nothing you see changes; the headers are invisible protective wrapping. ❌ Not OK if any page breaks. (I already loaded the real built app under the new rules and it rendered perfectly with no errors — scenario 3.)
2. **The Gemini change is behind-the-scenes** — the backup AI now hands over its password privately instead of in the web address. No visible change.
3. **Proof I ran** — `npm test` 145/145 (incl. the new headers test), and a browser load of the real built app under the security rules with zero violations. ❌ Not OK if either failed.

## ✅ GREEN-LIT 2026-07-18

Carl walked the whole system ("I've just been through the system and they look fine") and green-lit every built pass in one sweep (goodnight close-out).

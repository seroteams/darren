# Phase 2: Auth + member

## Built (2026-07-23)

All screens on the shared auth shell and system pieces, awaiting Carl's QA walk. Landed: Register + Join wear the auth-split shell (phantom auth-card gone); Join identity hero + what-you-see rows + expired-invite state; Welcome top log-in link + fixed brand photo; quiet slot labels, password show/hide toggles, Forgot-on-password-row, Resend button; member Home recomposed (latest-1:1 card, timeline + privacy caption, Requests/Goals side-by-side on system chips/inputs/bars, real empty states, mh-* kit deleted); phantom member RUN_DETAIL route removed + error copy de-looped; Privacy breadcrumb + who-can-see-it list. Offline proof: 176/176 tests, typecheck clean, lint:tokens + lint:copy PASS; real-render screenshots of Welcome, Login, Register, Join, member Home taken and eyeballed.

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting QA

## Goal

One branded costume for the whole way in (Welcome → Log in / Register / Join), and a member home that looks intentional instead of an afterthought.

## Changes

- Shared auth shell defined once in `admin/src/styles/design/auth.css`; Register (`admin/src/stages/register.js`) and Join (`frontend/src/stages/join.js`) wear it (fixes the undefined `auth-card` class).
- Join: logo + identity hero ("Maria at Acme invited you"), what-you-see/what-stays-private list (reuse member About copy), "Already have an account? Log in" footer, distinct dead-invite state.
- Welcome (`frontend/src/stages/welcome.ts`): Log in as a top-right link; one fixed brand visual replaces the random stock photo.
- All auth forms: sentence-case neutral labels, Forgot link on the password row, show/hide toggle, Resend button on the forgot confirmation.
- Member home (`frontend/src/stages/member-home.js` + css): portal composition at medium width (latest 1:1 card, timeline, Requests and Goals as cards), system inputs/chips, goal progress bars, real empty states, visible privacy caption; `mh-*` widget kit deleted.
- Member run detail decision applied (member-voiced variant or route removed) + re-voiced error copy.
- Privacy (`admin/src/stages/privacy.js`): breadcrumb at top; "Who can see it" as a label/value list.

## Not in this phase

The 1:1 flow, nav shell, admin tools.

## Done when

- [ ] Register and Join carry the same brand shell as Log in
- [ ] Member home passes the "would a member think this page is finished?" look
- [ ] Free checks green; gallery re-export diffed for auth + member screens
- [ ] Acceptance boxes A1-A7 tickable

## Test scenarios — for the product owner

1. **The costume never changes** — from Welcome click "Create account". The register page should keep the logo and the same framed look as Log in. ❌ Not OK if it drops to a bare form.
2. **The invite feels personal** — open a join link (I'll give you a test one). You should see the Sero mark and "[Name] at [Company] invited you" as the headline, with a short "what you'll see / what stays private" list. ❌ Not OK if it's an anonymous form.
3. **Member home looks alive** — log in as the test member. The page should have a clear top card, a tidy timeline, and a one-line note explaining what's recorded. ❌ Not OK if it's two grey sentences in a narrow column.

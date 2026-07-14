# Manager walk — Dana Reeves (free lane)

- **Role:** manager
- **Env:** live — https://sero-obwq.onrender.com (build `c151ec4`, Jul 12 21:30)
- **Date:** 2026-07-12
- **Persona:** Dana Reeves, a first-time manager at "Northwind Test Co" signing up cold to prep a 1:1.
- **Goal of this walk:** prove a brand-new manager can sign up, land in the right place, add a teammate, and invite them — with no engine spend.
- **Account (for cleanup):** carl+testmgr1@seroteams.com / SeroTest123! · orgId `cf005dec-0de5-44e9-ba76-680b5b2f9c6f`

---

## Think-out-loud log
- Landing page loads: "Try it — no account needed", "Log in", "Create an account", "Privacy". Clear entry. Clicked **Create an account**.
- Page went **blank**. Panicked for a second — then confirmed via console it's the *testing-tool* limitation: the browser pane runs `document.hidden=true`, so the app's `requestAnimationFrame` render loop is suspended and never paints. A real human's visible tab renders fine. Applied a visibility+rAF shim to proceed. **Not a product bug.**
- With the shim, `/login` rendered: "Welcome back / Log in to prep your next 1:1." Good, warm copy.
- Went to `/register`. Blank again — but this time the **console showed a real error**: `Failed to fetch dynamically imported module … register-*.js`. A new build (`ffa2ae2`) had just deployed mid-session. Checked the chunk directly → it returns **200 now**; the failure was the deploy swap. Reloaded clean → register rendered fine.
- Register form: Your name, Company (optional, "Defaults to your name's company"), Email, Password ("at least 8 characters"). Clear. Filled as Dana + Northwind Test Co. Hit **Create account**.
- Landed on `/new` — **intake Step 1 of 5** with a first-time orientation card: "Your first prep, in three moves". This is the make-or-break routing (new manager → setup, not empty home) and it's **correct**. Copy is friendly: "Two minutes of prep. One sharper conversation."
- Went to **Team**: clean empty state, "Your team starts here". **Add someone** modal: "Just a name to start — add their role if you know it." Added Sam Patel / Product designer / Mid-level → appears instantly as "not met yet" with a "Prep first 1:1" button.
- **Tidy up** → **Invite…** for Sam. Uses `window.prompt` for the email, then a second `window.prompt` shows the one-time join link. Copy is reassuring: "valid 7 days, works once… They'll set a password and see their own 1:1 history — never your notes."

---

## Step-by-step

| # | Step | Expected | What happened | Verdict |
|---|---|---|---|---|
| 1 | Load landing | entry options | Try it / Log in / Create account / Privacy | ✅ |
| 2 | Create account (Dana, Northwind) | account+company, auto-login | registered, auto-logged in | ✅ |
| 3 | Post-signup routing | new manager → intake | landed `/new` Step 1 of 5 + first-run card | ✅ |
| 4 | Team → Add someone (Sam) | roster row created | "Sam Patel · not met yet" appears | ✅ |
| 5 | Tidy up → Invite Sam | one-time join link | valid `/join/<token>` link generated | ✅ |

---

## Bugs / breakages found
- **Transient blank screen during a mid-session deploy.** A new build landed while testing; navigating to a lazy route (`/register`) failed its dynamic import and the app showed a **blank screen with no error/recovery** — it retried the failed import forever. A manual reload fixes it. Because every push to `main` auto-deploys (builds seen at 20:20 *and* 21:30 during this one session), a real user mid-session during a deploy can hit this. **Recommend:** a chunk-load-error catch that auto-reloads once (or an "update available — reload" prompt). Moderate severity; likelihood tied to deploy timing.

## Confusions (clarity, not bugs)
- **Invite uses raw `window.prompt`/`alert`** (rough edge). The *copy* inside is good, but native dialogs are jarring, easy to mis-click, and unreliable on mobile. For a human test, either pre-pair accounts or expect some testers to fumble the copy-paste.

---

## "Would a real human get this?" — clarity verdict
Yes. The signup → setup → add-teammate path is clean, the copy is plain and warm, and routing lands a new manager exactly where they should be. The only human-facing snag is the invite being a copy-paste pop-up rather than an emailed link.

## Overall verdict
- **Works end-to-end:** yes (free lane)
- **Human-ready:** yes, with two caveats — (1) freeze deploys during the test window to avoid the blank-screen swap, (2) decide invite handling (pre-pair vs copy-paste instructions).

# Phase 5 — Craft batch

**Part of:** [plan.md](plan.md) · **Status:** 🔨 PARTLY built — 2 of 7 items done, 5 remain (see below)

## Built so far (2026-07-17)
On `main`. Offline proof: suite 149/149 (+1 new M8 test), root typecheck clean, both apps build. **M8 verified live** on localhost:3000 (clicking a Team card opened the person page).

- **M8 — clickable person cards ✅.** The whole Team card now opens the person (`js-card-open` on the card root); the name is a real focusable `<button>` (`js-open-person`) so keyboards get the same action; the action buttons (Invite / Remind / Prep / ⋯) stop propagation so they still do their own job; the cursor now tells the truth. [team-card.ts](../../../frontend/src/stages/team-card.ts) + [team.ts](../../../frontend/src/stages/team.ts) + [team-card.css](../../../frontend/src/styles/team-card.css) + a new test. **Verified on screen.**
- **M11 — invite link inside a sheet ✅ (built, not screen-verified).** The raw `window.prompt` that surfaced a one-time join link is gone from all five call sites (Team invite / change-access / add-with-invite, Members invite / resend). New shared [share-link-modal.ts](../../../admin/src/ui/share-link-modal.ts): a styled dialog with a read-only link field, a **Copy** button (async clipboard + execCommand fallback), and a "valid 7 days · works once" note. *Not screen-verified — triggering it sends a real invite email; the markup compiles and both apps build.*

## Still to build (5 items) — NOT done
- **M5 — top-bar / progress:** one progress system, labels collapse gracefully at narrow widths, intake stops running its own competing "Step N of 5". *(Needs careful multi-width visual verification.)*
- **M6 — accent budget:** expanded Home row = one blue action (Resume); Start-new → ghost; Delete → ⋯ menu.
- **M12 — account settings sheet + change-password.** **RECOMMEND SPLITTING OUT** (the plan sanctions this): it needs a NEW backend chain (route → auth.service → auth.repo, current-password check, mirrored tests) for a security-sensitive endpoint, and scenario 5 (log out → log in with the new password) can only be truly verified with a live auth round-trip — Carl's to walk, or a deliberate go-ahead to build + API-test it.
- **M15 — mobile wrap:** run-list meta truncates to name + meeting type at phone width.
- **X1 — star reframe:** rating labelled "prep rating", moved off the name line into the meta row.

---

**Original plan below.**



## Goal
The remaining interaction rough edges are gone: honest affordances, one progress story, one blue action, an invite flow inside the design system, and a manager who can manage their own account.

## Changes
- **Top-bar (M5):** one progress system in the 1:1 flow — the top bar becomes the single counter, labels collapse gracefully at narrow widths (no clipped "p"/"B…", no collision with the profile chip); the intake header stops running its own competing "Step N of 5" (or the top bar defers to it — one owner, decided in build).
- **Accent budget (M6):** expanded Home row — Resume becomes the screen's one blue action while open (Start a new session drops to ghost); Delete moves into a ⋯ menu with the confirm dialog.
- **Clickable person cards (M8):** the whole Team card opens the person (buttons still stop propagation), honouring the design doc's whole-row rule; cursor stops lying.
- **Invite inside the sheet (M11):** the join link renders in the Give-access sheet as a read-only field with a Copy button + "valid 7 days, works once" note — window.prompt gone.
- **Account sheet (M12):** minimal settings slide-over from the nav footer: display name, company name, change password. Nothing else. *Scope note (verified): no change-password endpoint exists today — this adds a small backend chain (route → auth.service → auth.repo, current-password check, mirrored tests, TDD) plus the sheet. The biggest single item in this phase; if the phase runs long, M12 is the one to split out.*
- **Star reframe (X1):** rating labelled "prep rating" and moved off the person's name line into the meta row on person page + run rows.
- **Mobile wrap (M15):** run-list meta truncates to name + meeting type on phone width; full detail on expand. (Uses Phase 1's shared component — one truncation rule.)

## Not in this phase
- Anything in Parked. New nav items beyond the settings entry.

## Done when
- [ ] 1280px and 375px show one untruncated-or-gracefully-collapsed progress bar, no collisions.
- [ ] Each fixed screen passes the DESIGN.md 11-rule check (the new phase-close line).
- [ ] Password change verified by logging in with the new password (verify the destination, not the form).
- [ ] `npm test` + `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **The top bar behaves** — start a 1:1 at normal window width. One progress story, no clipped letters, nothing hiding behind your profile chip. Shrink the window to phone width: still tidy.
2. **One blue at a time** — on Home, expand a session row. Exactly one blue button should be on screen (Resume). Delete now lives behind ⋯ and still asks before deleting.
3. **Cards do what they look like** — on Team, click anywhere on Priya's card body. You should land on her page. The Prep and ⋯ buttons still do their own jobs.
4. **Invite without the ugly popup** — Give access → Invite by email. The link appears IN the sheet with a Copy button. ❌ Not OK if a browser prompt window appears.
5. **You can finally change your password** — open the new account sheet, change the password, log out, log back in with the new one. ❌ Not OK if the old password still works.
6. **Stars read as prep quality** — on Priya's page, the rating reads "prep rating" in the meta line, not beside her name.
7. **Phone rows are calm** — at phone width, Home rows show two tidy lines, not four wrapped ones.

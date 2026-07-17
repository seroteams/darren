# Phase 5 — Craft batch

**Part of:** [plan.md](plan.md) · **Status:** ✅ ALL 7 built — M12 landed 2026-07-17, verified end-to-end over HTTP

## M12 — account sheet + change password ✅ (VERIFIED over HTTP)
Carl's "finish all". New `POST /api/v1/auth/change-password` — protected + origin-guarded; the
user id comes from the **session**, never the body, and the current password must re-verify
before the new hash is written. Service chain test-first (`auth.service` +4 tests; repo gains
`findById` + `updatePasswordHash`). A shared [account-sheet.ts](../../../admin/src/ui/account-sheet.ts)
(name/email read-only + a working password form) opens from a new **Account** row in both apps' nav.
**Proven end-to-end against the dev API:** wrong current → 401, right → 200, old password then
rejected, new accepted, logged-out → 401. Suite 154/154, typecheck clean, both build, no paid runs.
**Deferred (thin follow-up):** editable display-name / company — there's no self-update endpoint
yet, and the security-critical piece (the password) is done and verified.

## Built (2026-07-17)
On `main`. Offline proof: suite **150/150**, root typecheck clean, both apps build. **M5, M6 and M8 verified live** on localhost:3000.

- **M5 — one progress system ✅ (verified live).** The setup counter now counts the steps *this* prep actually has: prepping a known roster person opens at the meeting type and reads **"Step 1 of 2"** — the old fixed "Step 4 of 5" was a lie (the exact gap Phase 1 flagged). Label, bar and aria values share one source of truth (`activeSteps`), so they can't disagree. Top-bar: the human stage names are longer than the old engine ones, so full labels now appear only ≥1180px (short form between phone and wide — the full name always rides on `title`), and the strip owns its overflow so it can never clip a letter or slide under the profile chip. *Verified: "Step 1 of 2", aria-valuenow=1/valuemax=2.*
- **M6 — accent budget ✅ (verified live).** With a Home row open, **Resume is the screen's only blue button** (verified: one visible primary), "Start a new 1:1" steps back to ghost, and **Delete moved into the ⋯ menu** (verified: menu opens with "Delete 1:1") — still behind its confirm.
- **M8 — clickable person cards ✅ (verified live).** The whole Team card opens the person (`js-card-open`); the name is a real focusable `<button>` for keyboards; action buttons stop propagation; the cursor tells the truth.
- **M11 — invite link inside a sheet ✅ (built).** The raw `window.prompt` is gone from all five call sites. New shared [share-link-modal.ts](../../../admin/src/ui/share-link-modal.ts): read-only link field + **Copy** + "valid 7 days · works once". *Not screen-verified — triggering it sends a real invite email.*
- **X1 — star reframe ✅ (built).** Stars now read as **"prep rating"** (person page meta, Team card meta, run-row aria labels) — never as a score of the person. Kept in the meta row, never the name line.
- **M15 — phone rows ✅ (built).** At ≤480px a Home row stays two tidy lines: the headline truncates with an ellipsis, the meta drops to line two. Full detail on expand.
- *Also swept two "session" nouns Phase 3 missed (the Home delete confirm + the empty state) — now "Delete this 1:1 permanently?" / "Start a new 1:1".*


- **M8 — clickable person cards ✅.** The whole Team card now opens the person (`js-card-open` on the card root); the name is a real focusable `<button>` (`js-open-person`) so keyboards get the same action; the action buttons (Invite / Remind / Prep / ⋯) stop propagation so they still do their own job; the cursor now tells the truth. [team-card.ts](../../../frontend/src/stages/team-card.ts) + [team.ts](../../../frontend/src/stages/team.ts) + [team-card.css](../../../frontend/src/styles/team-card.css) + a new test. **Verified on screen.**
- **M11 — invite link inside a sheet ✅ (built, not screen-verified).** The raw `window.prompt` that surfaced a one-time join link is gone from all five call sites (Team invite / change-access / add-with-invite, Members invite / resend). New shared [share-link-modal.ts](../../../admin/src/ui/share-link-modal.ts): a styled dialog with a read-only link field, a **Copy** button (async clipboard + execCommand fallback), and a "valid 7 days · works once" note. *Not screen-verified — triggering it sends a real invite email; the markup compiles and both apps build.*

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

# Phase 007 — New Frontend App (register, login, org signup)

## Goal (plain)
Build the **customer-facing app** at root `frontend/`: real register and login screens wired to the auth
backend from Phase 006 — including creating the user's **organisation** on signup. The existing internal
UI stays as the `admin/` console.

## What you'll have when it's done
- A new `frontend/` app (TypeScript, built per `frontend-conventions`) with **Register** and **Login** pages.
- **Register creates the user and their organisation**; login remembers you're signed in.
- A minimal **authed landing** — enough to prove the loop (e.g. your org name + a button to start a prep run).
- Built **test-first** (red → green), per the conventions.
- Clear separation confirmed: `admin/` = internal console, `frontend/` = the product.

## A grounding example (before → after)
- **Before:** there is no customer app — just the internal tool with no login.
- **After:** a visitor opens `frontend/`, registers their company, logs in, and lands on a real (if
  minimal) home screen that belongs to their organisation. Refresh keeps them in; logout returns to login.

## The steps (to be detailed when this phase starts)
1. Scaffold the `frontend/` app and its build config.
2. Build the Register and Login pages.
3. Wire them to the `/api/v1/` auth endpoints; store the login token; handle logged-in vs logged-out.
4. Add a minimal authed landing screen showing the organisation.

## How we'll know it's done (full list in `99-qa-signoff.md`)
- Register a brand-new organisation + user in the browser, log in, and see the authed screen.
- Refreshing the page keeps you logged in.
- Logging out sends you back to the login screen.

## Note
This is the visible payoff of Phases 005–006 — it needs the database and auth working first.

> **Status:** overview only. Detailed step files get written when we start this phase.

# 🌙 TONIGHT — put Sero on the internet (Render.com)

**This is your runbook for tonight. One page. Follow top to bottom.**
(Full detail lives in [docs/plans/doing/render-deploy/plan.md](docs/plans/doing/render-deploy/plan.md) · overall status in [STATUS.md](STATUS.md). This file gets deleted when the track closes — it's a runbook, not a tracker.)

---

## What we're working on (one line)

> Host Sero on Render.com (free plan) so every push to `main` goes live automatically — then two words, `/commit` + `/release`, take your local work to the internet.

---

## Your checklist for tonight

### ☑ 1. Check my Phase 1 work — ✅ DONE (green-lit + committed)

### ☑ 2. Blueprint + checklist — ✅ DONE (green-lit + committed; GitHub is up to date)

### ☐ 3. Do the Render steps (~15 minutes, one time only) ← **YOU ARE HERE — follow [RENDER_SETUP.md](RENDER_SETUP.md)**
Follow `RENDER_SETUP.md` top to bottom. The short version:
1. Create a Render account → connect GitHub
2. New ➜ Blueprint ➜ pick `seroteams/darren`
3. When Render asks for the 4 secret values, copy them from your `.env` file
   - ⚠️ **THE ONE TRAP:** for `DATABASE_URL`, paste the value of **`LIVE_DATABASE_URL`** from `.env` (the "Sero Live" database) — **NOT** your normal `DATABASE_URL` (that's your local one; the app will refuse to boot with it, on purpose)
4. Wait for the first deploy (few minutes)
5. Create an API key: your avatar ➜ Account Settings ➜ API Keys ➜ Create (it shows **once** — copy it straight away)

### ☐ 4. Paste me the API key
I store it safely in `.secrets/` (never goes in git), then I check the deploy myself and tell you when the site is live. You open the URL on your phone and try a login + one short run (~$0.35 — tonight's one paid check).

### ☐ 5. Done for tonight 🎉
Phase 4 (`/commit` + `/release`) is best done fresh — tomorrow.

---

## ⚠️ One honest heads-up before the first push

The first push to `main` publishes **everything currently on main** — including other tracks' work that's built but not yet walked by you (e.g. the database dual-write). That's OK for tonight: the live site is brand new, has **zero users**, and its database starts empty. But say the word if you'd rather review first.

## Facts worth knowing (free plan)
- Site **sleeps after 15 min** with no visitors — next visit takes ~50 s to wake. Normal.
- The server's **disk is wiped on every deploy** — past run-log files and generated questions reset. **Users, logins and the runs list are safe** (they live in the Neon database).
- Upgrading later (no sleep, $7/mo) = a one-line change.

## Triple-checked (2026-07-08, all free, $0)
- ✅ Booted the app **exactly as Render will** (production mode, Render's PORT): app serves, health answers, deep links work
- ✅ Origin-guard deploy-blocker found & fixed (saves would have failed on Render) — 6 new tests + proven on a real boot
- ✅ Blueprint fields verified against Render's official docs; Node pinned (24)
- ✅ Tests **91/91** · typecheck · build all green
- ⚠️ Only thing that CAN'T be tested from here: the first real boot against the Sero Live database — that happens on Render tonight, and I'll be watching it via the API

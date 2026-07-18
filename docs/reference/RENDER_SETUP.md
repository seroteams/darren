# Put Sero on the internet — Render setup (one time, ~15 minutes)

Follow this top to bottom. You do this **once**. After it's done, every time you
push to `main` the live site updates itself.

You'll need one thing open: your **`.env`** file (in this folder) — it has the
secret values you'll paste into Render. Nothing here is copied into git.

---

## Step 1 — Make a Render account (~2 min)

1. Go to **https://render.com** → **Get Started** → sign up with **GitHub**.
2. When it asks, let Render **connect to your GitHub** and give it access to the
   **`seroteams/darren`** repository.

## Step 2 — Create the Blueprint (~2 min)

1. In Render, top right: **New** ➜ **Blueprint**.
2. Pick the **`seroteams/darren`** repo from the list.
3. Render finds the `render.yaml` in the repo and shows **one service: `sero`**.
   You don't change anything here — just continue.

## Step 3 — Paste the 4 secret values (~5 min)

Render now asks you to fill in **4 values** (it shows them as blanks because they
must never live in git). Open your **`.env`** file and copy each one across:

| Render asks for… | Paste the value of this from `.env` |
|---|---|
| **DATABASE_URL** | ⚠️ **`LIVE_DATABASE_URL`** — see the red box below |
| **OPENAI_API_KEY** | `OPENAI_API_KEY` |
| **GEMINI_API_KEY** | `GEMINI_API_KEY` |
| **SUPERADMIN_EMAILS** | `SUPERADMIN_EMAILS` |

> ### 🚨 The one trap — read this
> For **DATABASE_URL**, paste the value of **`LIVE_DATABASE_URL`** from your `.env`
> (that's the **"Sero Live"** Neon database).
>
> **Do NOT** paste your normal `DATABASE_URL` — that's your **local** database, and
> the app will **refuse to start** if you use it here (it's a safety catch, working
> as designed). If the deploy fails with a message about the database saying it
> "belongs to the local environment", this is what happened — fix this one value
> and re-deploy.

Then click **Apply** / **Create**.

## Step 4 — Wait for the first deploy (~3–5 min)

Render builds and starts Sero. You'll see logs scroll. When it finishes you'll see
a green **Live** and a URL like `https://sero.onrender.com`.

- If it goes green — 🎉 the site is up.
- If it goes red — copy the last few log lines and send them to me; I'll read them.
  (The most common cause is the DATABASE_URL trap above.)

## Step 5 — Make me a Render API key (~1 min)

So I can watch deploys for you:

1. Top-right **avatar** ➜ **Account Settings** ➜ **API Keys** ➜ **Create API Key**.
2. It shows the key **once** — **copy it straight away**.
3. Paste it to me here in the chat.

I store it in `.secrets/` on your machine (never git), check the deploy myself, and
tell you the moment the site is live. Then you open the URL on your phone and try a
login + one short 1:1 run.

---

## What you're getting (free plan — the honest facts)

- The site **sleeps after 15 minutes** with no visitors; the next visit takes ~50
  seconds to wake up. Normal for the free plan.
- The server's **disk is wiped on every deploy** — old run-log files and generated
  questions reset. **Your users, logins and the runs list are safe** — those live in
  the Neon database, not on the server's disk.
- Removing the sleep (and getting more power) later is a **$7/month** upgrade — a
  one-line change when you want it.

## After this is done

Nothing else to set up. From now on: your local work → push to `main` → the live
site updates itself in a few minutes. (The two-word `/commit` + `/release` helper
is Phase 4 — we'll do that fresh, tomorrow.)

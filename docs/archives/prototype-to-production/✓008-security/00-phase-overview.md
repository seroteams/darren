# Phase 008 — Security

## Goal (plain)
Make Sero safe to hold real **HR data**. Two things matter most: **protect people's personal data (PII)**
and **protect our AI keys** so they're never exposed to users. Security is a standing rule from Phase 002
onward — this phase is the dedicated hardening + audit pass, finished by a **human expert review**.

## What you'll have when it's done
- **Security skills installed** (chosen from skills.sh in this phase), with their checks run and **green-lit**.
- **PII protection:** a map of everywhere personal/HR data lives (names, manager notes, evaluations), and
  protections on it — access scoped by **organisation + role**, encryption in transit, sensible at-rest
  handling, and **least exposure** in logs and API responses.
- **AI key protection (critical):** API keys live **server-side only** (env/secrets). They must **never**
  appear in the frontend — not in client bundles, not in API responses, not in logs.
- **HR-data safeguards:** manager-private notes and judgments never leak to the wrong audience (this
  extends the engine's existing trust gates to the new multi-user, multi-org world).
- A documented **human expert review**: automated checks are necessary but **not sufficient** — a
  security-literate human signs off before real data flows.

## A grounding example (before → after)
- **Before:** any logged-in request could in principle reach another org's data, and a key could slip
  into a client response.
- **After:** every data read is **org + role** scoped and access-checked, the AI key never leaves the
  server, security scans are green, and an expert has reviewed and signed off in `PROGRESS.md`.

## The steps (to be detailed when this phase starts)
1. Choose and install the security skills; run their checks and fix to green.
2. Build the PII map; apply org/role access control, transit encryption, and log/response minimisation.
3. Audit secrets handling — prove no key reaches the client (bundle, response, or log).
4. Book and complete the **human expert review**; record the sign-off.

## How we'll know it's done (full list in `99-qa-signoff.md`)
- Security skill checks are green.
- No secret or AI key appears in any client bundle, API response, or log.
- PII access is provably scoped by organisation and role.
- A named human expert has reviewed and signed off (recorded in `PROGRESS.md`).

## Note (important)
The human expert review is **required**. Do **not** treat green automated checks as "secure" — they are
a floor, not a finish line. This is HR data.

> **Status:** overview only. Detailed step files get written when we start this phase.

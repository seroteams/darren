# Live-site test plan — dress rehearsal before real humans

**Aim:** be 100% sure the live app works, makes sense, ties together and is clear — across roles — *before* a single real human is sent a link. I (Claude) run the walks first as a shakedown; the output is a clean, human-ready tester pack.

**Live URL:** https://sero-obwq.onrender.com (customer app only)
**Health:** https://sero-obwq.onrender.com/api/v1/health

---

## Roles — what's testable where

| Role | On LIVE? | Notes |
|---|---|---|
| **Manager** (the payer) | ✅ full journey | self-signup = manager, who also owns a new company |
| **Member** (the managed) | ✅ full journey | created by manager *invite* (copy-paste link, no email in alpha); surface is a **read-only list of their past 1:1s** — by design |
| **Admin** (internal / Carl) | ❌ **not deployed** | admin + superadmin console live in `admin/` app, never shipped to live (`render.yaml:21`). Test **locally only**. |

**Decision taken:** humans test **manager + member on live**; admin is verified by me on a **local** build.

---

## The three journeys (code-traced)

### Manager (full value path)
1. `/register` — "Create your account" → **Create account** (auto-logs in)
2. `/new` **INTAKE** — 5 steps: Name → Role → Seniority → Meeting type → Notes
3. `/focus` **FOCUS_POINTS** — pick what the 1:1 covers → **Continue to prep brief**
4. `/prepare` **PREPARATION** = the **Manager Preparation Briefing** ("What to walk in with")
5. `/bank` → `/interview` **QUESTIONING** — answer the engine's questions
6. `/evaluate` → `/briefing` — post-conversation debrief → **Finish**
   - Add a teammate any time: **Team** rail → **Add someone** (creates a roster row, *not* a login)

### Member (managed person)
1. Manager: **Team → Tidy up → Invite…** → enter email → copy the `/join/:token` link (valid 7 days, one use)
2. Member opens `/join/:token` → "Join your team on Sero" → set name + password → **Join {org}**
3. Lands on `/home` **MEMBER_HOME** — read-only list of the 1:1s their manager ran about them. Nothing to *do*. (Intentional.)

### Admin (LOCAL only)
- Internal toolset (role = admin): Library, Test engine, lexicons, meeting arcs, Universe, run-debrief/QA.
- Superadmin (Carl's email allowlist): `/admin/registered` user management (change role / deactivate / delete), errors, feedback inbox, guest runs.

---

## Two lanes — free first, then a small paid batch

| Lane | Covers | Cost |
|---|---|---|
| 🟢 **Free** | register, login + role routing, add person, invite → join, member landing, admin (local) navigation | **$0** — no OpenAI |
| 🔴 **Paid** | the engine: focus → **prep brief** → questioning → briefing | ~**$0.40 per full manager walk**. Do **1** first, verify, then decide. |

Rule: state cost, run the smallest proof, pause before a second paid walk.

---

## Rough edges to watch (real testers will hit these)

1. **Admin invisible on live** — any "open admin console" step fails on the live URL (not shipped).
2. **Invite = manual copy-paste**, not emailed. No invite email will arrive.
3. **"Add someone" ≠ an account.** It's a login-less roster row; only *Invite/Link* makes a member account.
4. **Member is a near-dead-end by design** — empty/near-empty read-only list. Looks "broken" but isn't.
5. **Uses browser `prompt`/`alert`/`confirm`** for Invite/Link/errors — jarring, can be blocked, rough on mobile.
6. **Guest "Try it" lane** ends at a save card; shares a daily cap.
7. **Role landing is historically fragile** — new manager must land on `/new` (intake), not an empty Home.

---

## Decisions (defaults chosen — swap any time)

- **Feedback capture:** testers **reply with the 3 answers** (to however the link was sent). Zero setup, easy to collate for 10. *(Swap to a form if preferred.)*
- **Invite handling:** the tester does the **real copy-paste invite** themselves; the member view is framed as **optional**. *(Swap to pre-pairing if we want the member side guaranteed.)*
- **Recruiting (still Carl's):** who the 10 people-managers are, and how to reach them (email / WhatsApp / in person).

## Blocker fixed (2026-07-13)
Completed 1:1s now mark `finished` atomically (commit `bb09932d`, live on build `7454715`, confirmed on prod) — so a tester's finished 1:1 shows in their history and the member's. See [results/manager-1on1-paid-walk.md](results/manager-1on1-paid-walk.md).

## Tester-facing pack
Written → [tester-pack.md](tester-pack.md). The one page we hand each tester.

---

## Folder + method

```
testing/
  test-plan.md            ← this charter
  tester-pack.md          ← the human-facing one-pager (written after decisions)
  results/
    _TEMPLATE.md          ← results shape
    <role>-<persona>.md   ← one file per test walk, thinking out loud
```

**Think out loud:** every walk is narrated step-by-step in its results file — expected vs actual, where I paused or got confused, and a plain "would a real human get this?" verdict. Fresh-eyes confusion = a real-human red flag.

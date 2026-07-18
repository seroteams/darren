# Personal-data security — assessment + fixes (report for Carl)

**Date:** 2026-07-16 · **Driver:** Carl's question — *"we have personal data (manager notes about employees). Look deep and tell me what to fix. Is a leak even possible? Could someone get at the API keys / are we on a version that trains on our data? Where is the data saved — could it be on their own drive? What do similar companies promise?"*

**Bottom line:** The data is mostly well-protected, **but I found one live hole that let a signed-up customer read other companies' private notes — that is now closed.** Plus three quick hardening fixes (two done, one deliberately deferred). Nothing here needed paid AI runs; everything was verified with free tests + a browser check.

---

## 1. Your questions, answered plainly

| You asked | Answer |
|---|---|
| **Could someone get at our API keys?** | **No.** All keys live only on the server (environment variables + Render's secret store). None are hardcoded in the code, and none are ever sent to anyone's browser. Verified by searching the whole codebase. |
| **Are we on a "wrong version" of the AI that trains on our data?** | **No.** We use the OpenAI **API**, which does **not** train on our data (that's been their policy since 2023, opt-in only). The "AI learns from what you type" behaviour belongs to consumer ChatGPT — a different product. Lattice and 15Five rely on this exact same API promise. |
| **Where is the data saved? Could it be on the customer's own drive?** | It's in a managed, encrypted cloud database (Neon Postgres) hosted in **Frankfurt**, with the app on Render — standard encrypted SaaS, not on anyone's laptop. "Own drive" (self-hosting) is technically possible but a big ongoing build, and **none** of your competitors offer it. The industry answer to the same trust need is: encrypted cloud + a clear "we don't train on your data" promise + a delete option. Recommend building that trust story, not own-drive. |
| **Is a leak even possible?** | It **was** — one specific hole (below). It's now fixed. The rest of the access model is solid. |

---

## 2. What I found (the full picture)

### ✅ Already solid (verified in code, not assumed)
- Passwords are properly hashed (bcrypt), never returned or logged.
- Logins use secure server-side sessions in HttpOnly cookies — no token sitting in the browser where scripts could steal it.
- The cross-company "superadmin" wall (internal Sero access) is a server-checked email allowlist with an audit trail — can't be faked from the browser.
- Each manager's roster and each member's own runs are correctly walled off by company **and** person.
- All database queries are safely parameterised (no SQL injection). Notes/briefings are HTML-escaped before display (no obvious XSS).
- No secret keys anywhere in the code. A local app is blocked from touching the live database.

### 🔴 The one live hole — H-1 (now fixed)
There's an internal tool for "copying a finished run" so your team can test without paying to generate one. It reads runs **across all companies** by design (it's meant for internal use only). But its lock accepted anyone with an "admin or manager" role — and **every customer who signs up is a "manager."** So a stranger who registered could copy another company's run and read its private notes and briefing.

The code even had a comment saying this route "must stay dev-only" — but in the deployed setup it wasn't; it was reachable by any customer. **Confirmed line-by-line, not a maybe.**

### 🟠 Smaller gaps
- The **backup AI (Gemini)** sent its key in the web address, where it can leak into server logs. *(Fixed — Phase 2.)*
- **No security headers** on responses (clickjacking / sniffing / downgrade protection). *(Fixed — Phase 2.)*
- A handful of **old test runs with real names** got committed into the project's history. *(Deferred — Phase 3, see §4.)*
- No formal privacy/trust page yet; erasure is a manual email. *(Parked — later trust-story pass.)*

---

## 3. What I fixed (done + verified)

### Phase 1 — closed the leak · commit `81029bca`
Locked the copy-run tool to **internal Sero staff only** in production (the same trusted wall that guards every other cross-company internal feature). A customer now gets a flat refusal. It also **fails safe**: if the staff list is ever emptied by mistake, the door denies *everyone* rather than springing open. Added an automatic test that keeps it locked.

### Phase 2 — quick hardening · commit `2ebd718c`
- **Gemini key** moved out of the web address into a private header.
- **Security headers** now on every response (blocks the app being embedded in a scam site, stops file-type trickery, forces secure connections). I loaded the **real built app** with these rules switched on and watched it render perfectly — **zero problems**.

**Proof (all free, no AI spend):** `npm test` = **145/145 passing**, `npm run typecheck` = clean, real app verified rendering under the new security rules.

### Files changed
| File | What |
|---|---|
| `backend/api/middleware/require-auth.ts` | New staff-only gate for the copy-run tool (the leak fix) |
| `backend/api/services/runs/runs.controller.ts` + `.service.ts` + `.repo.ts` | Use the new gate; corrected misleading comments |
| `backend/tests/runs/test-prefill-access-gate.js` | New test proving the leak is shut |
| `backend/engine/ai-client.ts` | Gemini key → private header |
| `backend/api/middleware/security-headers.ts` (new) | The security headers |
| `backend/api/router.ts` | Applies headers to every response |
| `backend/api/router.test.ts`, `backend/api/services/health/health.controller.test.ts` | Fixed 2 test mocks my change touched |
| `backend/tests/runs/test-security-headers.js` (new) | Proves headers are always set |
| `docs/plans/doing/personal-data-security/` | Plan + phase files (this work, tracked) |

---

## 4. What's NOT done — and why (needs your call)

### Phase 3 — scrub the old test logs from history (deferred on purpose)
Removing the committed test runs (with real names) means **rewriting git history** — which changes every commit ID, forces a push that overwrites the remote, and makes every one of your other open Claude sessions re-sync. Doing that while you have parallel sessions live would wreck their in-progress work. **So I did not do it.** It's written up ready in `docs/plans/doing/personal-data-security/phase-3.md` for a moment when everything else is closed.

*(I also couldn't do the safe partial version — stop tracking those logs going forward — because `.gitignore` currently has another session's uncommitted changes, and touching it would sweep their work.)*

### I could not push / deploy — here's why
You said "push it if you can." I checked: `main` is **10 commits ahead** of the live remote, but only **2 are mine** (the security fixes). The other 8 are other work (members-page feature, axis-memory, a briefing mock). Git can't push just my two — they're interleaved with the others in history — so pushing would deploy **all 10, including 8 unreviewed commits, straight to production**. That's not a safe call to make for you while you're asleep, so I left it.

**The security fixes are safely committed and ready.** When you're ready, the clean path is your normal `/release` (or push `main` once you're happy those other 8 commits are good to ship). The leak fix only protects the **live** site once deployed — worth doing soon.

---

## 5. Recommended next steps (in order)
1. **When your other sessions are closed:** tell me, and I'll run Phase 3 (scrub the old names) + deploy the security fixes cleanly.
2. **Deploy the fixes** — the leak is closed in the code but still open on the live site until you release.
3. **Later trust-story pass (parked):** a Lattice-style privacy/trust page ("we never train AI on your data", named data processors, delete-my-data), and ask OpenAI for Zero-Data-Retention. This is mostly writing, and it's what actually wins buyer trust.

---

## 6. Competitor reference (what "good" looks like)
- **Lattice:** SOC 2 Type II, GDPR, encryption at rest + in transit, EU data residency, retention = contract + 6 months then auto-delete, OpenAI named as a processor with **Zero Data Retention** and no-training, per-feature AI opt-in.
- **15Five:** strips personal identifiers **before** sending to the AI, contractual no-training, GDPR-compliant AI, notes visible only to manager + report.
- **Fellow:** a single "trust center" page bundling certifications + processor list + policies.

Common shape of their pages: certifications → encryption → access control → AI/processor promises → retention & deletion → data residency → contact. A good template for our future trust page.

# Personal-data security — close the leak + quick hardening

**Goal:** Personal data in Sero (manager notes, names, 1:1 answers, briefings) is safe to put in front of alpha users — no cross-company leak, no key-in-logs, no real names sitting in git.
**Driver:** Carl
**Created:** 2026-07-16

## Done means
- A signed-up customer (manager) can NOT read any other company's runs, notes or briefings.
- The Gemini API key no longer travels in a URL (can't leak into logs).
- Standard security headers are set on every response.
- The old test-run logs with real names/notes are gone from git history.

## Resolved before we start
- **What's already solid** (verified in the assessment): passwords bcrypt-hashed; sessions HttpOnly cookies, no token in browser; superadmin wall is a server-resolved email allowlist with audit trail; people roster + member "my runs" fenced by org+user; all SQL parameter-bound; notes/briefings HTML-escaped; no hardcoded secrets. So this build is about the specific gaps below, not a rewrite.
- **H-1 root cause:** the internal "prefill a run" tool (`/runs/clonable`, `/runs/clone`) is guarded by `requireAdmin`, which passes for role `manager` — and every customer is a manager. Its reads are cross-company by design (internal QA tool). Fix = gate to **superadmin** (the same wall used by every other cross-company internal endpoint), which also fails safe.
- **Design decision (Phase 1):** gate to superadmin only; do NOT org-fence the clone reads. Org-fencing would break the tool's legitimate internal purpose (seed QA from any run), and the superadmin allowlist is the correct + already-blessed boundary. Flagged for Carl's QA.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Close the H-1 leak | Superadmin-gate the clone routes + regression test | ✅ |
| 2 | Quick hardening | Gemini key → header, security headers, purge committed logs | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ GREEN-LIT by Carl 2026-07-16 ("nice then go for it") — committed. Phase 2 in progress.** Phase 1 superadmin-gated the clone routes (customer managers can no longer read other companies' runs); `npm test` 143/143, typecheck clean. Now building Phase 2: Gemini key → header, security headers, purge committed test logs.

## Parked (P2 — later pass, not this build)
- Lattice-style privacy/trust page (extend `admin/src/stages/privacy.js`) with named subprocessors + "we never train AI on your data".
- Request OpenAI Zero Data Retention (ZDR).
- Manager-fence run history (M-2) before multi-manager orgs via invites.
- Retention policy (auto-delete after N months) + self-serve account/data deletion.
- PII redaction before the AI call; own-drive/on-premise storage; SOC 2. (Not for alpha.)

# Personal-data security — close the leak + quick hardening

> **PARKED 2026-07-18 (Carl: "finish all, moving on").** P1-P2 green-lit + LIVE (leak closed, hardening shipped); P3 - the git-history purge of old test-run logs - parked until a night when EVERY chat is closed (destructive force-push). Names are already off HEAD and future clones.

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
| 2 | Quick hardening (code) | Gemini key → header + security headers | ✅ green-lit 2026-07-18 |
| 3 | Purge committed logs | Interim done (names off HEAD/future clones); full history scrub pending | 🟡 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 2 ✅ GREEN-LIT 2026-07-18** — Carl walked the whole system ("they look fine"); the hardening
is committed and went live in the 2026-07-18 goodnight release. **Only Phase 3 (the git-history log
purge) remains open** — a destructive history rewrite that needs every parallel session closed +
a force-push window; Carl's call on when.

**Phase 1 ✅ committed (81029bca). Phase 2 built + verified, awaiting Carl's walk. Phase 3 (log purge) newly split out.**
- Phase 1 superadmin-gated the clone routes. `npm test` was 143/143.
- Phase 2 (code hardening): Gemini key now in a header, security headers on every response, CSP validated against the real built bundle in a browser (rendered clean, zero CSP violations). `npm test` **145/145**, typecheck clean. NOT committed yet — waiting on Carl's green light.
- Phase 3: the committed-log purge was pulled out of Phase 2 because it's a **destructive git-history rewrite** that needs every parallel session closed + a force-push — unsafe to do mid-session. See phase-3.md.

## Note on branch
Phase 1 committed onto **main** (a parallel session had switched the shared checkout's branch). Local only — not pushed, nothing deployed. Flagged to Carl.

## Parked (P2 — later pass, not this build)
- Lattice-style privacy/trust page (extend `admin/src/stages/privacy.js`) with named subprocessors + "we never train AI on your data".
- Request OpenAI Zero Data Retention (ZDR).
- Manager-fence run history (M-2) before multi-manager orgs via invites.
- Retention policy (auto-delete after N months) + self-serve account/data deletion.
- PII redaction before the AI call; own-drive/on-premise storage; SOC 2. (Not for alpha.)

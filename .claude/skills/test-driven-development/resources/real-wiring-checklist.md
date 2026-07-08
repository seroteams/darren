# Verify the destination, not the code

The most expensive recurring bug class in this repo: **the test passed but bypassed the path the
live app actually takes.** Three real incidents, one lesson each:

| Incident | What the test checked | What reality did |
|---|---|---|
| Postgres load-order bug (Phase 005) | Round-trip test called the repo directly — green | Live server picked file-vs-Postgres at module load, but `.env` loaded AFTER imports → silently wrote to files despite `DATABASE_URL` |
| Route 404 bug (PG8) | 57/57 service tests called the service directly — green | `router.ts` matches string patterns EXACTLY, so `/users/:id/runs` never matched a real id → every real request 404'd |
| Gate-verdict blindness | Checked the gate's PASS/FAIL verdict | The shipped `final.json` was wrong in ways the verdict missed — in both directions |

## The checklist — before claiming "done" on anything with a runtime seam

- [ ] **Exercise the real entry point** — the HTTP route, the CLI command, the module-load path —
      not just the function underneath. If the live server imports before env loads, your test
      must too.
- [ ] **Query the actual destination.** "Saved to the DB" means you ran a query and saw the row —
      never inferred from routing logic. "Written to the file" means you opened the file.
- [ ] **Read the artifact the pipeline ships** — `final.json` (post-guard, what the manager
      sees), not `response.json` (raw pre-guard), not the verdict summarizing it.
- [ ] **One nondeterministic pass ≠ proof.** The gate has flipped FAIL→PASS on identical code.
      For stability claims: sample 3–5 times and report a pass-rate, or use the deterministic
      free path (`node scripts/replay-scenario.js <id> --fixtures-only`).
- [ ] **Name the seam a phase does NOT cover at sign-off** — "back-end door works, no login
      screen yet" — so 'done' is never half-true silently.

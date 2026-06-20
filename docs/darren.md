# Testing Suite — Notes for CTO Meeting

> Working notes only. Nothing decided yet — this is the list we'll talk through.
> Date started: 2026-06-17

## Why we're doing this

We want a clear, named testing suite so we (and the CTO) can see at a glance:
what kinds of tests we have, what each one covers, and where the gaps are.

---

## The test types we want to cover

### 1. Unit tests
- Smallest pieces in isolation — one function, one rule, one helper.
- Fast, no API key, no network. Run on every change.
- Question to settle: are our current `scripts/test-*.js` really "unit" tests, or
  more like component/integration checks? (Most look like behaviour checks on
  whole modules, not single functions.)

### 2. Integration tests
- Several pieces working together — e.g. a pipeline stage feeding the next,
  the engine + the guards, prompt + validator.
- Catches "each part works alone but they don't talk properly."

### 3. Regression tests
- Lock in behaviour we've already fixed so it can't silently break again.
- We already have a start here:
  - `npm run replay` → `scripts/replay-regression.js`
  - `scripts/test-replay-regression.js`
  - `scripts/replay-scenario.js <id> --fixtures-only` (free, offline)
- Open question: how do we add a new regression case when we fix a bug? Make
  that a one-step habit.

### 4. End-to-end (E2E) tests
- A whole user journey, start to finish, through the real app.
- Example: open app → answer questions → get a briefing → review the run.
- We have Playwright available now — candidate tool for browser E2E.
- Today this is mostly done by hand (manual QA scripts, persona runs).

### 5. Smoke tests (incl. manual)
- Quick "is it alive / did we break the basics" check before a demo or release.
- Classic examples: **can a user register? can they log in? does a run complete?**
- We have `npm run smoke` (`smoke-test.js`) — but it hits the OpenAI API, so it
  costs money and needs a go-ahead each time.
- Want: a free/offline smoke list too — a short manual checklist a human walks
  before showing the product to anyone.

---

## What we already have (snapshot of the repo today)

**Free / offline (no API key, run any time) — `npm test`:**
- `scripts/run-tests.js` runs ~35 `test-*.js` scripts in their own processes.
- Covers: briefing integrity, question validator, grounding gate, role profiles,
  lexicons, arc overlay, confidence honesty, regression replay, and more.
- This is our real safety net right now.

**Paid / live (hit the OpenAI API — need explicit go-ahead, cost stated first):**
- `npm run gate` → `scripts/gate.js` (full sweep ~$3; single case `--only <case>` ~$0.35)
- `npm run smoke` → `smoke-test.js`
- `npm run eval` → `scripts/eval.js`
- `npm run sweep` → `scripts/sweep.js`
- persona / live replay runs

**Other tooling:**
- `npm run lint` (eslint)
- Playwright MCP available → option for true browser E2E.

---

## Gaps / things to decide with the CTO

1. **Naming.** Our `test-*.js` files aren't sorted into unit / integration /
   regression buckets. Worth labelling them so the suite is legible?
2. **Smoke checklist.** Write a short, free manual checklist (register, log in,
   complete a run, see a briefing) — the pre-demo "is it alive" pass.
3. **E2E.** Decide if/when we invest in Playwright E2E vs. keeping manual QA.
4. **Regression habit.** Agree the rule: every bug fix ships with a regression
   case so it can't come back.
5. **Cost line.** Keep the free vs. paid split crystal clear — paid runs always
   need a yes first. (This is already a standing rule for us.)
6. **What runs when.** On every change (free unit/regression), before a demo
   (smoke), before a release (the lot).

---

## Parked (not now)
- Coverage % targets / CI automation — discuss after we agree the test buckets.

---

**In simple terms:** This is a scratchpad for your CTO meeting. It lists the five
kinds of tests (unit, integration, regression, end-to-end, smoke/manual), shows
what we already have in the code today, and flags the gaps to talk about. Nothing's
been built or changed — just notes.

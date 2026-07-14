# Monthly Check-in — architecture deep-dive

**For:** founder + CTO + a committee of experts. **Written:** 2026-07-12, grounded in a three-lens code audit (roles/privacy · arc-extensibility · member surface). **Companion to** [plan.md](plan.md) — this is the *why* and the *seam*; the plan is the *what* and the *order*.

---

## 0. TL;DR (the founder cut)

- **A new 1:1 type is a new data domain, not a screen.** The runner is the easy 20%. The hard, permanent 80% is *who can read what, forever* across three roles — and whether the next arc costs a week or a month.
- **One big idea:** treat "type" as `{ engine: interview | guided }`. The existing AI-interview types are one engine; Monthly Check-in is the first of a second, **guided** engine. Build guided as a **stage library + a config list**, so arc #2 is a config entry, not a rewrite.
- **The honest CTO note:** do **not** build a grand "arc framework" now — that's the premature abstraction a committee flags. **Cut the seam** in three specific places, ship ONE guided arc, and generalise only when arc #2 actually arrives. This doc says exactly where the seam goes.
- **One correction that would otherwise bite:** there is **no "internal admin" role** in the code today — `admin` and `manager` both pass the admin gate, and superadmin is an email allowlist. The gate we need must be defined precisely or Carl locks himself out. (§3.1)
- **Recommendation:** proceed with the 7-phase plan as written, with the six architecture amendments in §6 folded in. AC met: the fence is defence-in-depth, the extensibility seam is real but un-over-built, and every risk in §5 has a named mitigation.

---

## 1. The reframe: type = data domain + engine

Sero already has **two parallel notions of a "meeting type"**, coupled only by a label string and array order:

```
   PICKER (slim catalog)                 ENGINE (rich registry)
   backend/engine/meeting-types.ts       backend/engine/one-on-one-types/
   { label, badge, duration, desc }      { slug, label, tone_register, arc[], ... }
        │  coupled by  ─────────────────────── label string + array order
        └──────────────── meetingTypeIndex (positional wire contract)
```

Monthly Check-in does **not** fit the rich registry: that registry describes *how the AI asks questions along an arc*. Monthly Check-in is the opposite — **the AI steps back and the manager walks fixed stages.** So it is a **second engine**, not a fifth interview arc. Forcing it into `one-on-one-types/` would corrupt the interview pipeline (which reads `arc.arc[]` to drive question generation — see `question-generator.ts:124,267`, `closer.ts:26`).

**The model that makes both extensible:**

```
                        ┌─ engine: "interview" ─→ one-on-one-types/ registry (arc of question phases)
   a TYPE has an engine ─┤
                        └─ engine: "guided" ────→ guided-arcs registry (ordered list of runner STAGES)
```

The picker/catalog is the ONE place both engines meet. It already returns entries; we add `kind` (`"interview" | "guided"`) so the client knows whether to `startSession` (interview) or `POST /guided-sessions` (guided). Everything downstream is engine-specific and isolated.

---

## 2. The extensibility seam — "add new arcs easily", done honestly

### 2a. Two different extensibility questions

| Question | Answer |
|---|---|
| Add a new **interview** arc (e.g. another questioning style)? | Already ~data-driven — the arc pipeline reads `arc.arc[]` generically. Pain = 3 duplicated type-lists (§2c). |
| Add a new **guided** arc (e.g. "Quarterly review", "Onboarding check-in")? | The point of this build. Make guided **stage-config-driven** from day 1 (§2b). |

### 2b. Guided arcs = a STAGE LIBRARY + a config list (the seam)

Build the guided runner so a guided arc is **data**, not code:

```ts
// guided-arcs.ts  (the whole "framework" — deliberately tiny)
type GuidedStageId = "catchup" | "requests" | "rating" | "feedback" | "goals" | "summary" | "wrapup";
interface GuidedArc {
  slug: string;               // "monthly_check_in"
  label: string;              // "Monthly Check-in"
  badge?: string;             // "New"
  stages: GuidedStageId[];    // ordered — THIS is the arc
  aiWrapup: boolean;          // does the end-of-session AI call fire?
  coaching?: Partial<Record<GuidedStageId, StageCopy>>; // per-arc copy overrides
}
export const GUIDED_ARCS: GuidedArc[] = [
  { slug:"monthly_check_in", label:"Monthly Check-in", badge:"New",
    stages:["catchup","requests","rating","feedback","goals","summary","wrapup"], aiWrapup:true },
];
```

Each stage id maps to a **self-contained component** in a library (`frontend/src/stages/guided/stages/`): `{ render, stateShape, onComplete }`. The runner is a generic driver — it reads `arc.stages`, renders the pill nav and the current stage's component, auto-saves into `state[stageId]`. **The runner never hardcodes "7 stages" or their order** — it reads the arc.

**Result — the cost of arc #2 after the seam:**

| Add a guided arc… | Touches | New code? |
|---|---|---|
| "Quarterly review" = `[rating, goals, feedback, summary, wrapup]` | one `GUIDED_ARCS` entry | **none** — reuses existing stage components |
| "Onboarding guided" = `[catchup, goals, summary, wrapup]` + a new "welcome" stage | one entry + ONE new stage component | one component |

That is the "add arcs easily" promise, made real — and it costs us **nothing extra now**, because Monthly Check-in has to be built stage-driven anyway. We are not building a framework; we are *not hardcoding the stage list*. That's the whole discipline.

### 2c. The interview-side consolidation (SEPARATE, optional, not required now)

The audit found the real interview-arc smell: **three places encode "the list of types"** — `one-on-one-types/index.ts` `TYPES[]`, `meeting-types.ts` `MEETING_TYPES[]`, and `relational-arcs.ts` `RELATIONAL_ARCS` — coupled by **array order** and **duplicated label strings**, plus a **convention-only** slug↔intro-folder link, and a competency-include flag that lives *outside* the type definition. A new interview arc means editing all three in lockstep or it breaks silently.

**The fix (a future hardening track, ~1 day, $0):** one registry that is the single source of truth, emits both the slim catalog view and the rich view, carries `includesCompetency` as a *field* (deleting the hardcoded `RELATIONAL_ARCS` set), and validates `slug === slugify(label)` at boot so the intro-folder link can't drift. **Recommendation: note it, don't do it now** — it's not on Monthly Check-in's path, and a committee rewards *not* refactoring a working engine mid-validation. Parked as `future/meeting-type-registry-unify`.

---

## 3. The three-role model (the permanent 80%)

Roles in code: DB stores **one** role per user — `admin | manager | member`. `ADMIN_ROLES = ["admin","manager"]`, so **admin AND manager both pass `requireAdmin`**; only `member` is excluded. **Superadmin is not a role — it's the `SUPERADMIN_EMAILS` allowlist**, server-resolved, read-only, audited.

### 3.1 The gate correction (must-fix, Phase 1)

The plan said "add `isInternalAdminIdentity` = roles includes admin only." The audit shows **no such predicate exists**, and naïvely gating on `role === "admin"` risks excluding Carl if his account is a `manager` who is superadmin-by-email. Define it to be safe both ways:

```ts
// require-auth.ts — NEW
export const isInternalIdentity = (id) => id.roles.includes("admin") || isSuperadminIdentity(id);
export const requireInternalAdmin = (c) => { const id = requireAuth(c); if (!isInternalIdentity(id)) throw forbidden("Internal only"); return id; };
```

Client mirror already exists (`admin/src/state.js` `isInternalAdmin` ≈ `roles.includes("admin")`) — align it to also honour `isSuperadmin`. **QA gate: confirm Carl's real account sees the card; a fresh `manager` signup does not.**

### 3.2 The data domains × roles matrix

Three new domains. Fences **mirror the proven double-fence** (SQL narrows indexed cols → JS wall re-checks the authoritative row; a drifted column can *hide* but never *leak*).

**`guided_sessions`** (the meeting record — owned by the manager who ran it)

| Role | Read | Write | Fence |
|---|---|---|---|
| **Manager** | own org's sessions | own | `org_id` (+ `manager_id` for "mine"); wall `guidedOwnedByOrg(state, orgId)` |
| **Member** | ❌ never touches the table | ❌ | only a **list-only slim row** via the merged about-me view (§3.3) — never `state` |
| **Admin/superadmin** | cross-company, read-only, audited | user-mgmt only | superadmin route + audit line |

**`tracker_items`** (promises · requests · goals — the shared, cross-role domain — the delicate one)

| Role | Read | Write | Fence |
|---|---|---|---|
| **Manager** | all kinds for their roster people | all | `org_id + manager_id` via people repo; wall `trackerOwnedByManagerOrg` |
| **Member** | **only `kind ∈ {request, goal}` for THEIR OWN person** (`people.user_id = caller`) — **never promises** | raise a request · update own goal progress | new wall `trackerVisibleToMember(row, personIds, orgId)`; `kind==="promise"` → excluded even from reads |
| **Admin/superadmin** | cross-company read-only, audited | — | superadmin route |

**`block_scores`** (six-block ratings)

| Role | Read | Write | Fence |
|---|---|---|---|
| **Manager** | own org (trends per person) | via `complete()` | tied to `guided_session` → `org_id` |
| **Member** | ❌ v1 (their own scores = v2 member content view) | ❌ | — |
| **Admin/superadmin** | cross-company read-only | — | superadmin route |

### 3.3 Surfaces that must NEVER leak (the committee's checklist)

- **`state.wrapup`** (engagement, private notes, AI suggestion buckets) is **manager-private, full stop.** It is never in any member-facing payload, never in the Phase-6 record served to a member, never in the merged about-me row. (Superadmin sees it — read-only + audited — that's the one intentional wall-crossing.)
- **Promises** stay in-meeting in v1 — members do not see them at all (owner framing can be sensitive). Parked as a deliberate v2 decision, not an oversight.
- **The about-me row** carries only `{id, type:"Monthly Check-in", completedAt, managerName}` — **byte-identical restraint to the interview about-me** (`about-me.service.ts`: no notes, no briefing, no scores, not even the creator's raw id).
- **Member writes are a NEW pattern** — mirror the only safe template that exists (`rateMine`): `requireAuth` (any role) → service fences on `org + people.user_id` → route is **origin-guarded**. The member lane is a *separate* set of endpoints (`/api/v1/me/*`), never the manager routes with a relaxed guard.

---

## 4. Lifecycle & state discipline (what a CTO asks next)

- **`state` jsonb is a draft, not a contract.** Every stage writes under its own key (`state.catchup`, `state.rating`, …). Reads must be **defensive** (missing key ⇒ empty stage), so a session created under a 7-stage arc still opens if the arc later changes. Never index the whole `state` blob positionally.
- **Denormalise-at-complete, not per-keystroke.** `engagement`, `block_scores`, and applied promise outcomes are written **once** at `complete()` — the jsonb is the source of truth during the draft; the columns are the fast, fenced read surface after. Same discipline as the interview `sessions` store.
- **Schema versioning:** stamp `state.v` (int). A migration that changes a stage's saved shape bumps `v` and back-fills or tolerates old rows. Cheap insurance against the "we changed the rating shape and old sessions 500" failure.
- **Idempotency:** `complete()` upserts on unique keys (`block_scores` unique(session,block); promise-outcome application keyed by tracker id) so a double-fire or resume never double-writes.
- **Guided ≠ interview, enforced:** guided rows live in their own table; the interview list queries are **not modified** — Phase 6 *adds a source* to the list services and merges by date. Existing interview list tests must pass **unchanged** (the regression wall).

---

## 5. Risk register (CTO / committee grade)

| # | Risk | Likelihood | Mitigation | Phase |
|---|---|---|---|---|
| R1 | Member-write lane leaks (sees another person's items, or promises) | Med → high impact | Dedicated `/me/*` endpoints; `trackerVisibleToMember` wall; fence tests (other person → 404, promise kind → absent, anon → 401) | 7 |
| R2 | Private Review reaches a member via the record/list | Low → severe impact | Wrapup never in member/record payloads; explicit "does not serialize wrapup" test on the record + about-me row | 4, 6 |
| R3 | Internal-admin gate excludes Carl / includes a manager | Med → blocks the whole build | `isInternalIdentity` = admin-role OR superadmin-email; QA both accounts in Phase 1 | 1 |
| R4 | Guided rows corrupt interview boot-hydration | Low → severe | Own table; zero changes to `sessions` hydration; verify global chrome no-ops on GUIDED | 1 |
| R5 | `state` shape drift 500s old sessions | Med | Defensive reads + `state.v` versioning | 1+ |
| R6 | Catalog index drift (guided card shifts interview indices) | Med | Guided card lives ONLY in the catalog *service* response, never `MEETING_TYPES`; intake branches on `kind` before `startSession` | 1 |
| R7 | List-merge breaks interview lists | Med | Add-a-source only; interview queries untouched; their tests stay green unmodified | 6 |
| R8 | AI wrapup invents facts / double-charges | Med → trust + $ | Grounded prompt; raw output surfaced (no masking); cached in state (no re-charge); cassette-first, ONE live call | 5 |
| R9 | Over-abstraction (build a framework nobody needs yet) | The seductive one | Stage-config seam only; interview-registry unify **parked**; generalise at arc #2 | — |

---

## 6. Amendments to fold into the plan (the concrete deltas)

1. **Phase 1 gate:** replace "`isInternalAdminIdentity` = roles admin only" with `isInternalIdentity = admin-role OR superadmin-email` + `requireInternalAdmin`; QA both Carl and a plain manager. (§3.1)
2. **Phase 1 runner:** build **stage-config-driven** from `GUIDED_ARCS[0].stages` — the runner reads the arc, never hardcodes the 7 stages. Ship `guided-arcs.ts` (one entry) + a stage-component library. (§2b)
3. **Phase 1 state:** stamp `state.v`; all stage reads defensive. (§4)
4. **Phase 2 fence:** add `tracker_items` wall functions `trackerOwnedByManagerOrg` + (stub, used in P7) `trackerVisibleToMember`; `kind` excluded correctly per role. (§3.2)
5. **Phase 6 record + Phase 7 member lane:** explicit **non-leak tests** — record/about-me never serialize `wrapup`; member lane refuses promises / other people / guided_sessions. (§3.3, R2, R1)
6. **New parked track:** `future/meeting-type-registry-unify` — collapse the 3 interview type-lists to one, `includesCompetency` as a field, slug/intro-folder validation. Not now. (§2c)

---

## 7. Decisions for Carl (genuine forks)

| # | Question | My recommendation |
|---|---|---|
| D1 | Name the unified idea "meeting **type** with an engine" (keep "type"), or coin a new word? | Keep **"type"** / "Monthly Check-in" in the UI; `engine`/`kind` is internal only. |
| D2 | Do the interview-registry unify (§2c) now or park? | **Park** — off-path, don't refactor a working engine mid-validation. |
| D3 | v2: does a member ever see their own six-block scores + summary? | Yes in the v2 member content view; **not** v1. Keep list-only now. |
| D4 | Member goal writes: update progress only, or full create/close? | **Progress + notes only** in v1 — goals are agreed *in* the 1:1; a member closing a goal unilaterally is a product decision to defer. |
| D5 | Do promises ever become member-visible? | **No in v1** (parked); revisit with the v2 member view + a mutual-accountability product call. |

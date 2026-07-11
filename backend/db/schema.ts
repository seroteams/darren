// The Postgres schema — the single source of truth for every table. Drizzle reads
// THIS file to generate the versioned SQL migrations in ./migrations (run
// `npm run db:generate`). It is plain TypeScript: the table shapes you read here
// are exactly the SQL that gets created — no separate DSL, no hidden rewrites.
//
// Locked DB rules applied throughout (see docs/archive/done/postgres-foundation/plan.md):
//   uuid primary keys (generated) · snake_case plural table names · timestamptz for
//   created_at / updated_at · jsonb (never text) for structured state · an indexed
//   org_id FK on every tenant-scoped table · FK + index on every *_id.
//   One documented exception: sessions.user_id / sessions.person_id are indexed but
//   NOT FK'd — they are denormalized snapshots of state fields that may reference
//   deleted users (old runs keep their owner id), and an FK would make the per-turn
//   upsert brittle. The authoritative copy stays inside state (jsonb).
//
// postgres-runtime-data (2026-07): ALL runtime data moves into these tables so the
// app runs identically in live and local. sessions is THE run index; run_artifacts
// holds what used to be the files inside a run dir.

import { pgTable, pgEnum, uuid, text, integer, bigint, boolean, timestamp, jsonb, index, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";

/** Fixed sets as enums (locked rule: roles / invite status are enums, not free text). */
export const userRole = pgEnum("user_role", ["admin", "manager", "member"]);
export const inviteStatus = pgEnum("invite_status", ["pending", "accepted", "revoked"]);

/** The tenant root — one row per company. */
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** People in an org. password_hash is NULLABLE — nothing logs in until Phase 006;
 *  this table is the foundation auth builds on, not auth itself. */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: userRole("role").notNull().default("member"),
    passwordHash: text("password_hash"),
    // Deactivate/reactivate (user-management Phase 3): null = active. A set timestamp
    // blocks login and is the signal for the "Deactivated" row state. Reversible —
    // reactivate clears it back to null. Deletes nothing.
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_org_id_idx").on(t.orgId), uniqueIndex("users_email_unique").on(t.email)],
);

/** A manager's roster (people-roster Phase 1) — the people a manager runs 1:1s about.
 *  Distinct from `users`: most of these people never log in (users.email is NOT NULL and
 *  a users row implies login), so a roster entry exists account-less and gets LINKED to a
 *  users row later via `user_id` — that link is what powers a member's "1:1s about me".
 *  `merged_into_id` makes Tidy-up merge a pointer resolved at read time (chain-follow,
 *  same idea as the alias files) — run state is never rewritten. Double-fenced like runs:
 *  every read/write filters by org_id + manager_id. */
export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    role: text("role"),
    seniority: text("seniority"),
    // Set when this person IS a registered user (e.g. member@seroteams.com). Null for
    // the many people who never sign up.
    userId: uuid("user_id").references(() => users.id),
    // Non-null = this row was folded into another person (Tidy-up merge).
    mergedIntoId: uuid("merged_into_id").references((): AnyPgColumn => people.id),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("people_org_id_idx").on(t.orgId),
    index("people_manager_id_idx").on(t.managerId),
    index("people_user_id_idx").on(t.userId),
  ],
);

/** The live 1:1 session = the run (same id, same lifecycle — the old separate
 *  `runs` table was never written and is gone). The whole session object lives in
 *  `state` (jsonb), the exact serialize() shape disk uses. Everything after
 *  `completedAt` is DENORMALIZED from state at upsert time purely so listings are
 *  indexed SQL instead of jsonb scans — state stays the authoritative copy.
 *  `review` / `rating` / `archived_at` replace the review.json / rating.json /
 *  archive.json sidecar files. `log_dir` still points at the (optional) on-disk
 *  echo folder. */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    // The app's own session id is a slug (e.g. "2026_May08_21-53-a3f7b2c1" from
    // engine/session.ts), not a uuid — so the uuid PK rule stays, and the slug
    // lives here as the unique key the repo reads/writes by.
    sessionKey: text("session_key").notNull().unique(),
    state: jsonb("state").notNull(),
    logDir: text("log_dir"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // — denormalized index columns (see header note on the missing FKs) —
    userId: uuid("user_id"),
    personId: uuid("person_id"),
    personName: text("person_name"),
    role: text("role"),
    seniority: text("seniority"),
    meetingType: text("meeting_type"),
    stage: text("stage"),
    finished: boolean("finished").notNull().default(false),
    lastSeenAt: bigint("last_seen_at", { mode: "number" }).notNull().default(0),
    mode: text("mode"),
    personaId: text("persona_id"),
    runLabel: text("run_label"),
    // — sidecars-as-columns —
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    review: jsonb("review"),
    rating: jsonb("rating"),
  },
  (t) => [
    index("sessions_org_id_idx").on(t.orgId),
    index("sessions_user_id_idx").on(t.userId),
    index("sessions_person_id_idx").on(t.personId),
    index("sessions_finished_idx").on(t.finished),
    index("sessions_last_seen_at_idx").on(t.lastSeenAt),
    index("sessions_meeting_type_idx").on(t.meetingType),
  ],
);

/** Everything that used to be a file inside a run dir — one row per artifact,
 *  addressed exactly the way readers ask for it today: (session_key, stage, name),
 *  e.g. ("2026_Jul08_…", "01-focus-points", "response.json") or (…, "",
 *  "transcript.json") for run-root files. `stage` is "" (not NULL) for root files
 *  on purpose: unique indexes treat NULLs as distinct, which would let duplicate
 *  root rows in and break the upsert's conflict target. JSON payloads go in
 *  `content`; markdown / JSONL text goes in `content_text` (`kind` says which).
 *  Cascade delete: removing the session row removes its artifacts, like deleting
 *  the run dir does. */
export const runArtifacts = pgTable(
  "run_artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // No FK to sessions on purpose: artifacts are written from every lane (web,
    // persona AND the pure-terminal CLI, which builds no session row), so requiring
    // the parent row to exist first would make a write order-dependent and fragile.
    // The unique (session_key, stage, name) index still keys upserts; deletes remove
    // artifacts explicitly (Phase 7) rather than via cascade.
    sessionKey: text("session_key").notNull(),
    // Denormalized fence so artifact reads don't need a join to check the org wall.
    orgId: uuid("org_id").references(() => organizations.id),
    stage: text("stage").notNull().default(""),
    name: text("name").notNull(),
    kind: text("kind").notNull(), // "json" | "text" | "jsonl"
    content: jsonb("content"),
    contentText: text("content_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("run_artifacts_key_stage_name_unique").on(t.sessionKey, t.stage, t.name),
    index("run_artifacts_session_key_idx").on(t.sessionKey),
  ],
);

/** The engine's invented questions (was content/questions/*.yaml + _runtime/ +
 *  the _index.json alias index). The UNIQUE alias IS the dedup gate — "never ask
 *  the same question twice" is now enforced by the database, not a derived file.
 *  subdir "" = the reusable generated pool; "_runtime" = per-session run records
 *  (write-only, never selection candidates — same rule as the old dir scan). */
export const generatedQuestions = pgTable(
  "generated_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alias: text("alias").notNull().unique(),
    subdir: text("subdir").notNull().default(""),
    source: text("source"),
    label: text("label"),
    stage: text("stage"),
    doc: jsonb("doc").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("generated_questions_subdir_idx").on(t.subdir)],
);

/** Cached per-(role, seniority) LLM context (was content/data/role-profiles/*.json).
 *  `overlay` carries the manager's vocab edits (was the sibling .overlay.json). */
export const roleProfiles = pgTable("role_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  cacheKey: text("cache_key").notNull().unique(),
  doc: jsonb("doc").notNull(),
  overlay: jsonb("overlay"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Manager edits to a 1:1-type arc (was content/data/arc-overlays/<slug>.json). */
export const arcOverlays = pgTable("arc_overlays", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  doc: jsonb("doc").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Derived running profile per person (was content/data/people/<slug>/) — stored
 *  because it's cheap, still rebuildable from runs at any time. */
export const peopleProfiles = pgTable("people_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  personKey: text("person_key").notNull().unique(),
  markdown: text("markdown"),
  doc: jsonb("doc"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A manager's merge/rename decisions (was content/data/people-aliases/<userId>.json). */
export const peopleAliases = pgTable("people_aliases", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  doc: jsonb("doc").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Learning-loop candidate traces per session (was content/lexicons/_suggested/). */
export const lexiconCandidates = pgTable("lexicon_candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionKey: text("session_key").notNull().unique(),
  doc: jsonb("doc").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only audit trail (was content/data/audit/superadmin.jsonl). */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: text("action").notNull(),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_created_at_idx").on(t.createdAt)],
);

/** Tiny key/value state: the environment marker the env-guard checks on every boot
 *  (key "environment" → "local" | "live"), and later the guest daily cap. */
export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Scaffolded for Phase 006 — the table exists now; the resend / expiry feature is
 *  later. `invited_by` is nullable (no users exist to invite from yet). */
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    email: text("email").notNull(),
    role: userRole("role").notNull().default("member"),
    status: inviteStatus("status").notNull().default("pending"),
    invitedBy: uuid("invited_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    // The join flow (member-onboarding-invites): the one-time token is stored HASHED
    // (sha256) — never plaintext at rest — and the invite carries which roster person
    // it's for, so accepting auto-links people.user_id (no manual matching).
    tokenHash: text("token_hash"),
    personId: uuid("person_id").references(() => people.id),
  },
  (t) => [index("invitations_org_id_idx").on(t.orgId)],
);

/** The login pass (Phase 006). One row per active login. The cookie carries `token`
 *  — an opaque, unguessable string — NOT the uuid PK, so the PK never leaves the
 *  server (same split the `sessions` table uses with `session_key`). A row is created
 *  on login and deleted on logout/expiry, which is what makes a logout *real*
 *  (revocable) — the reason we chose a server-side session over a stateless JWT.
 *  Distinct from `sessions` above, which is the 1:1 prep session, not a login. */
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_sessions_org_id_idx").on(t.orgId), index("auth_sessions_user_id_idx").on(t.userId)],
);

/** Password reset (forgot-password). One row per reset request. The emailed link
 *  carries an opaque `randomBytes(32)` token; only its sha256 hash is stored here —
 *  never the raw token (same rule as invitations.token_hash). Single-use (`used_at`
 *  set on redemption) and short-lived (1-hour expiry), so a leaked or stale link is
 *  useless. No org_id: a reset targets one user regardless of org. */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("password_reset_tokens_user_id_idx").on(t.userId)],
);

/** Tester feedback (feedback-inbox). One row per in-app note from the Send-feedback
 *  form, so the superadmin Feedback screen can read them across every company. Replaces
 *  the Phase-5 JSONL file (content/data/feedback/feedback.jsonl) as the store. `org_id` /
 *  `user_id` are NULLABLE like error_logs (the service tolerates an anonymous caller even
 *  though the route requires login); FK + index all the same. */
export const feedbackNotes = pgTable(
  "feedback_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id),
    userId: uuid("user_id").references(() => users.id),
    message: text("message").notNull(),
    page: text("page"),
    /** Briefing verdict tap (validation-kit Phase 3): which run the answer belongs to
     *  (the session key — no FK, a guest run may be claimed/deleted independently) and
     *  the one-tap answer ("yes" / "no" to "Would you run this 1:1 differently now?").
     *  Both NULL on a plain Send-feedback note. */
    runId: text("run_id"),
    verdict: text("verdict"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("feedback_notes_org_id_idx").on(t.orgId),
    index("feedback_notes_user_id_idx").on(t.userId),
    index("feedback_notes_created_at_idx").on(t.createdAt),
    index("feedback_notes_run_id_idx").on(t.runId),
  ],
);

/** Error log (error-log Phase 1). One row per captured error so the superadmin Error
 *  log screen can show what broke — across Carl's local dev and the published live Sero
 *  (the `environment` tag). Deliberately looser than the tenant tables: `org_id` /
 *  `user_id` are NULLABLE because anonymous / pre-login errors still record; they carry
 *  an FK + index all the same. Never stores a secret — identity + route + status +
 *  message + stack only (see api/middleware/error-log.ts). */
export const errorSource = pgEnum("error_source", ["api", "browser"]);
export const errorEnvironment = pgEnum("error_environment", ["local", "production"]);

export const errorLogs = pgTable(
  "error_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id),
    userId: uuid("user_id").references(() => users.id),
    email: text("email"),
    environment: errorEnvironment("environment").notNull(),
    source: errorSource("source").notNull(),
    method: text("method"),
    path: text("path").notNull(),
    status: integer("status"),
    errorCode: text("error_code"),
    message: text("message").notNull(),
    details: jsonb("details").$type<{ stack?: string; userAgent?: string }>(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("error_logs_org_id_idx").on(t.orgId),
    index("error_logs_user_id_idx").on(t.userId),
    index("error_logs_created_at_idx").on(t.createdAt),
  ],
);

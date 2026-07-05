// The Postgres schema — the single source of truth for the 5 tables Phase 005
// introduces. Drizzle reads THIS file to generate the versioned SQL migrations in
// ./migrations (run `npm run db:generate`). It is plain TypeScript: the table shapes
// you read here are exactly the SQL that gets created — no separate DSL, no hidden
// rewrites.
//
// Locked DB rules applied throughout (see docs/todo/postgres-foundation/PLAN.md):
//   uuid primary keys (generated) · snake_case plural table names · timestamptz for
//   created_at / updated_at · jsonb (never text) for structured state · an indexed
//   org_id FK on every tenant-scoped table · FK + index on every *_id.
//
// Scope: this phase only DESCRIBES the tables. Nothing reads or writes them yet —
// the repo swap is Phase 3, the live DB + docker-compose is Phase 4.

import { pgTable, pgEnum, uuid, text, integer, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

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

/** The live 1:1 session — the whole session object lives in `state` (jsonb). It
 *  serializes to a JSON file today; this is the same shape in a new home. `log_dir`
 *  links to the on-disk run folder, which keeps the heavy artifacts. */
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
  },
  (t) => [index("sessions_org_id_idx").on(t.orgId)],
);

/** Index → on-disk logs. The per-run artifacts (inputs.json / prompt.md /
 *  response.json / transcripts) STAY on disk (parked); this row just points at the
 *  folder via `log_dir` so runs are findable from the DB. */
export const runs = pgTable(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    sessionId: uuid("session_id").references(() => sessions.id),
    logDir: text("log_dir").notNull(),
    label: text("label"),
    status: text("status"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("runs_org_id_idx").on(t.orgId), index("runs_session_id_idx").on(t.sessionId)],
);

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

#!/usr/bin/env npx tsx
// Returns report (audit X4 / X6) — prints a plain per-manager table answering the Gate-1
// question: "did a manager come back, unprompted, and prep another 1:1?"
//
//   npx tsx scripts/report-returns.ts
//
// FREE: reads Postgres only (sessions + auth_sessions + users), never the OpenAI API.
// No new table — a login is an auth_sessions row, a 1:1 is a sessions row (created_at =
// intake start, completed_at = briefing). The aggregation lives in the unit-tested pure
// module backend/api/services/returns/returns-report.ts.

import { loadEnv } from "../backend/engine/env.ts";
loadEnv();

import { getDb, hasDatabaseUrl, closeDb } from "../backend/db/client.ts";
import { sessions, authSessions, users } from "../backend/db/schema.ts";
import { buildReturnsReport, formatReturnsTable } from "../backend/api/services/returns/returns-report.ts";

const ms = (d: Date | number | null): number => (d == null ? 0 : d instanceof Date ? d.getTime() : Number(d));

async function main(): Promise<void> {
  if (!hasDatabaseUrl()) {
    console.error("No DATABASE_URL — nothing to report. This script reads the live/local DB.");
    process.exit(1);
  }
  const db = getDb();
  const [runRows, loginRows, userRows] = await Promise.all([
    db.select({ userId: sessions.userId, createdAt: sessions.createdAt, completedAt: sessions.completedAt, finished: sessions.finished }).from(sessions),
    db.select({ userId: authSessions.userId, createdAt: authSessions.createdAt }).from(authSessions),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users),
  ]);

  const report = buildReturnsReport({
    runs: runRows.map((r) => ({ userId: r.userId, createdAt: ms(r.createdAt), completedAt: r.completedAt ? ms(r.completedAt) : null, finished: !!r.finished })),
    logins: loginRows.map((l) => ({ userId: l.userId, createdAt: ms(l.createdAt) })),
    users: userRows.map((u) => ({ id: u.id, name: u.name, email: u.email })),
  });

  console.log("\nSero — manager returns (Gate-1 signal)\n");
  console.log(formatReturnsTable(report));
  console.log("");
  await closeDb();
}

main().catch((e) => {
  console.error("report-returns failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});

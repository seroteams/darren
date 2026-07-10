// Read-only: list every org with its users (email/role) and run count, so we can
// see what to keep vs. purge. Touches nothing. `node scripts/org-inventory.ts`
import "../backend/api/env-boot.ts";
import { sql } from "drizzle-orm";
import { getDb, closeDb } from "../backend/db/client.ts";
import { organizations, users, sessions } from "../backend/db/schema.ts";

async function main(): Promise<void> {
  const db = getDb();
  const orgs = await db.select().from(organizations);
  const allUsers = await db.select().from(users);
  const runCounts = await db
    .select({ orgId: sessions.orgId, n: sql<number>`count(*)::int` })
    .from(sessions)
    .groupBy(sessions.orgId);
  const runByOrg = new Map(runCounts.map((r) => [r.orgId, r.n]));

  const sorted = orgs.sort((a, b) => a.name.localeCompare(b.name));
  for (const o of sorted) {
    const us = allUsers.filter((u) => u.orgId === o.id);
    const runs = runByOrg.get(o.id) ?? 0;
    console.log(`\n■ ${o.name}   [${o.id}]   runs=${runs}`);
    for (const u of us) console.log(`    ${u.role.padEnd(8)} ${u.email}   (${u.name})`);
    if (us.length === 0) console.log("    (no users)");
  }
  console.log(`\nTotal: ${orgs.length} orgs, ${allUsers.length} users.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 2; })
  .finally(() => closeDb());
